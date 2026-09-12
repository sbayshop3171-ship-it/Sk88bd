/** Staff logins for /admin — the admins and agents a super admin creates.

    The super admin itself is not in here: it stays in the environment
    (ADMIN_USERNAME / ADMIN_PASSWORD, see admin-auth.ts) so a corrupted or
    deleted store can never lock the operator out of their own panel. This
    file holds everybody the super admin hands a login to.

    Passwords are stored as scrypt hashes with a per-account salt. Nothing
    here ever returns a hash to a caller — listStaff() strips them — so a
    screen or an API response cannot leak one by accident.

    Same file-store shape as the other .data/ stores: a serialised write
    queue and a fresh empty store on first run. */

import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { writeFileAtomic } from './atomic-write';
import path from 'node:path';
import { generateAgentCode, normalizeAgentCode } from './agent-links';
import {
  MAX_STAFF,
  MIN_PASSWORD_LENGTH,
  cleanPermissions,
  isAdminRole,
  type AdminPermission,
  type AdminRole,
  type AdminStaff,
  type StaffMutationReason,
} from './admin-roles';

/** What the store keeps. `passwordHash` never leaves this module. */
type StaffRecord = AdminStaff & {
  /** scrypt$<saltHex>$<hashHex> */
  passwordHash: string;
};

type StaffStore = {
  version: 1;
  users: StaffRecord[];
  updatedAt: string;
};

const STORE_FILE = path.join(process.cwd(), '.data', 'admin-users-store.json');
const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;
const SCRYPT_KEYLEN = 64;

let writeQueue = Promise.resolve();

/* ---- reading ---- */

/** Everybody, newest last, without a single hash. */
export async function listStaff(): Promise<AdminStaff[]> {
  const store = await ensureRefCodes(await readStore());
  return store.users.map(publicOf).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Accounts created before invite links existed have no code. Mint one on
    the first read that notices, and only then — a write on every render of
    the staff screen would be a file rewrite for nothing. */
async function ensureRefCodes(store: StaffStore): Promise<StaffStore> {
  if (store.users.every((u) => normalizeAgentCode(u.refCode))) return store;

  return mutateStore((live) => {
    const taken = new Set(live.users.map((u) => u.refCode).filter(Boolean));
    for (const user of live.users) {
      if (normalizeAgentCode(user.refCode)) continue;
      user.refCode = freshCode(taken);
      taken.add(user.refCode);
    }
    live.updatedAt = iso(Date.now());
    return live;
  });
}

/** A code nobody else holds. The alphabet gives 32^6 ≈ 1.07 billion, so the
    loop is a formality — but a duplicate would quietly hand one agent's
    players to another, which is not a thing to leave to probability. */
function freshCode(taken: Set<string>): string {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const code = generateAgentCode();
    if (!taken.has(code)) return code;
  }
  throw new Error('could not mint an unused agent code');
}

export async function findStaffById(id: string): Promise<StaffRecord | null> {
  const store = await readStore();
  return store.users.find((u) => u.id === id) ?? null;
}

export async function findStaffByUsername(username: string): Promise<StaffRecord | null> {
  const wanted = username.trim().toLowerCase();
  if (!wanted) return null;
  const store = await readStore();
  return store.users.find((u) => u.username === wanted) ?? null;
}

export async function hasActiveStaff(): Promise<boolean> {
  const store = await readStore();
  return store.users.some((u) => u.active);
}

/* ---- passwords ---- */

/** True when the password matches. Compared in constant time, and a record
    with a malformed hash fails closed rather than throwing. */
export async function verifyStaffPassword(record: StaffRecord, password: string) {
  const [scheme, salt, expected] = record.passwordHash.split('$');
  if (scheme !== 'scrypt' || !salt || !expected) return false;

  const actual = await derive(password, salt);
  const left = Buffer.from(expected, 'hex');
  if (left.length !== actual.length) return false;
  return timingSafeEqual(left, actual);
}

/** A changed password, role, or active flag changes this, and every session
    the account already had stops verifying — a disabled agent is out of the
    panel the moment the switch is flipped, not when their cookie expires. */
export function staffFingerprint(record: StaffRecord) {
  /* hashed again, so the cookie — readable by whoever holds it — carries no
     piece of the password hash itself */
  const pw = createHash('sha256').update(record.passwordHash).digest('hex').slice(0, 16);
  return `${pw}.${record.role}.${record.active ? 'on' : 'off'}`;
}

/** The same scrypt a real check costs, for a name nobody has — so a wrong
    username takes as long to refuse as a wrong password, and timing the
    login cannot tell which staff names exist. */
export async function burnPasswordCheck(password: string) {
  await derive(password, 'no-such-user-00000000000000000000');
}

export async function markStaffLogin(id: string) {
  await mutateStore((store) => {
    const user = store.users.find((u) => u.id === id);
    if (user) user.lastLoginAt = iso(Date.now());
  });
}

/* ---- writing ---- */

export async function createStaff(input: {
  username: string;
  password: string;
  role: AdminRole;
  /** the boxes ticked on the form; absent = the role's defaults */
  permissions?: unknown;
  createdBy: string;
  /** the environment super admin's name, which nobody else may take */
  reserved: string;
}): Promise<{ ok: true; staff: AdminStaff[] } | { ok: false; reason: StaffMutationReason }> {
  const username = String(input.username ?? '').trim().toLowerCase();
  if (!USERNAME_RE.test(username)) return { ok: false, reason: 'invalid-username' };
  if (username === input.reserved.trim().toLowerCase()) {
    return { ok: false, reason: 'reserved-username' };
  }
  if (!isAdminRole(input.role) || input.role === 'super_admin') {
    return { ok: false, reason: 'invalid-role' };
  }
  if (String(input.password ?? '').length < MIN_PASSWORD_LENGTH) {
    return { ok: false, reason: 'weak-password' };
  }

  const passwordHash = await hash(input.password);

  return mutateStore((store) => {
    if (store.users.length >= MAX_STAFF) return { ok: false, reason: 'staff-full' as const };
    if (store.users.some((u) => u.username === username)) {
      return { ok: false, reason: 'username-taken' as const };
    }

    const now = iso(Date.now());
    store.users.push({
      id: randomBytes(8).toString('hex'),
      username,
      refCode: freshCode(new Set(store.users.map((u) => u.refCode))),
      role: input.role,
      ...(input.permissions !== undefined ? { permissions: cleanPermissions(input.permissions) } : {}),
      active: true,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
      passwordHash,
    });
    store.updatedAt = now;
    return { ok: true, staff: store.users.map(publicOf) };
  });
}

export async function updateStaff(
  id: string,
  /** permissions: a ticked list, or null to go back to the role's defaults */
  patch: { role?: AdminRole; active?: boolean; permissions?: AdminPermission[] | null },
): Promise<{ ok: true; staff: AdminStaff[] } | { ok: false; reason: StaffMutationReason }> {
  if (patch.role !== undefined && (!isAdminRole(patch.role) || patch.role === 'super_admin')) {
    return { ok: false, reason: 'invalid-role' };
  }

  return mutateStore((store) => {
    const user = store.users.find((u) => u.id === id);
    if (!user) return { ok: false, reason: 'not-found' as const };

    // a new role starts from that role's defaults; the boxes can be re-ticked after
    if (patch.role !== undefined && patch.role !== user.role) {
      user.role = patch.role;
      delete user.permissions;
    }
    if (patch.permissions === null) delete user.permissions;
    else if (patch.permissions !== undefined) user.permissions = cleanPermissions(patch.permissions);
    if (patch.active !== undefined) user.active = patch.active;
    user.updatedAt = iso(Date.now());
    store.updatedAt = user.updatedAt;
    return { ok: true, staff: store.users.map(publicOf) };
  });
}

export async function setStaffPassword(
  id: string,
  password: string,
): Promise<{ ok: true; staff: AdminStaff[] } | { ok: false; reason: StaffMutationReason }> {
  if (String(password ?? '').length < MIN_PASSWORD_LENGTH) {
    return { ok: false, reason: 'weak-password' };
  }
  const passwordHash = await hash(password);

  return mutateStore((store) => {
    const user = store.users.find((u) => u.id === id);
    if (!user) return { ok: false, reason: 'not-found' as const };

    user.passwordHash = passwordHash;
    user.updatedAt = iso(Date.now());
    store.updatedAt = user.updatedAt;
    return { ok: true, staff: store.users.map(publicOf) };
  });
}

export async function removeStaff(
  id: string,
): Promise<{ ok: true; staff: AdminStaff[] } | { ok: false; reason: StaffMutationReason }> {
  return mutateStore((store) => {
    const at = store.users.findIndex((u) => u.id === id);
    if (at < 0) return { ok: false, reason: 'not-found' as const };

    store.users.splice(at, 1);
    store.updatedAt = iso(Date.now());
    return { ok: true, staff: store.users.map(publicOf) };
  });
}

/* ---- internals ---- */

function publicOf(record: StaffRecord): AdminStaff {
  const { passwordHash: _ignored, ...rest } = record;
  return rest;
}

async function hash(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${(await derive(password, salt)).toString('hex')}`;
}

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, SCRYPT_KEYLEN, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

function mutateStore<T>(fn: (store: StaffStore) => T): Promise<T> {
  const next = writeQueue.then(async () => {
    const store = await readStore();
    const result = fn(store);
    await writeStore(store);
    return result;
  });
  writeQueue = next.then(() => undefined, () => undefined);
  return next;
}

async function readStore(): Promise<StaffStore> {
  try {
    const parsed = JSON.parse(await readFile(STORE_FILE, 'utf8')) as StaffStore;
    if (parsed?.version === 1 && Array.isArray(parsed.users)) return parsed;
  } catch {
    // first run on this machine: nobody but the environment super admin
  }
  return { version: 1, users: [], updatedAt: iso(Date.now()) };
}

async function writeStore(store: StaffStore) {
  await mkdir(path.dirname(STORE_FILE), { recursive: true });
  await writeFileAtomic(STORE_FILE, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
}

function iso(ms: number) {
  return new Date(ms).toISOString();
}
