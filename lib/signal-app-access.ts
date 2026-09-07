import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type SignalAppKeyStatus = 'active' | 'disabled' | 'revoked';

export type PublicSignalAppDevice = {
  deviceHash: string;
  appVersion: string;
  firstUsedAt: string;
  lastUsedAt: string;
  sessionCount: number;
};

export type PublicSignalAppKey = {
  id: string;
  name: string;
  keyPrefix: string;
  status: SignalAppKeyStatus;
  maxDevices: number;
  deviceCount: number;
  devices: PublicSignalAppDevice[];
  expiresAt: string | null;
  note: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
};

export type PublicSignalAppAuditLog = {
  id: string;
  action: string;
  message: string;
  createdAt: string;
};

export type SignalAppKeyAdminState = {
  ok: true;
  keys: PublicSignalAppKey[];
  auditLogs: PublicSignalAppAuditLog[];
  generatedKey?: string;
};

export type SignalAppAuthResult =
  | {
      ok: true;
      accessToken: string;
      refreshToken: string;
      expiresAt: string;
      key: PublicSignalAppKey;
    }
  | {
      ok: false;
      reason:
        | 'invalid-key'
        | 'key-disabled'
        | 'key-revoked'
        | 'key-expired'
        | 'device-limit'
        | 'device-required'
        | 'locked'
        | 'invalid-refresh'
        | 'unauthorized';
      lockedUntil?: string;
    };

type InvalidSignalAppKeyReason = Extract<
  Extract<SignalAppAuthResult, { ok: false }>['reason'],
  'key-disabled' | 'key-revoked' | 'key-expired'
>;

type StoredSignalAppDevice = {
  device_id_hash: string;
  app_version: string;
  first_used_at: string;
  last_used_at: string;
  session_count: number;
};

type StoredSignalAppKey = {
  id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  status: SignalAppKeyStatus;
  max_devices: number;
  devices: StoredSignalAppDevice[];
  expires_at: string | null;
  note: string;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
};

type StoredSignalAppSession = {
  id: string;
  key_id: string;
  device_id_hash: string;
  refresh_hash: string;
  created_at: string;
  last_used_at: string;
  expires_at: string;
  revoked_at: string | null;
};

type StoredSignalAppLockout = {
  device_id_hash: string;
  attempts: number;
  locked_until: string | null;
  updated_at: string;
};

type StoredSignalAppAuditLog = {
  id: string;
  action: string;
  message: string;
  created_at: string;
};

type SignalAppAccessStore = {
  version: 1;
  hash_secret: string;
  token_secret: string;
  app_keys: StoredSignalAppKey[];
  sessions: StoredSignalAppSession[];
  lockouts: StoredSignalAppLockout[];
  audit_logs: StoredSignalAppAuditLog[];
};

type AccessTokenPayload = {
  sub: 'signal-app';
  sid: string;
  kid: string;
  did: string;
  iat: number;
  exp: number;
};

const STORE_FILE = path.join(process.cwd(), '.data', 'signal-app-access-store.json');
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const FAILED_LIMIT = 5;
const LOCKOUT_MS = 10 * 60 * 1000;
const KEY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

let writeQueue = Promise.resolve();

export async function getSignalAppKeyAdminState(): Promise<SignalAppKeyAdminState> {
  return mutateStore((store) => {
    pruneSessions(store, Date.now());
    return publicAdminState(store);
  });
}

export async function updateSignalAppKeyAdmin(input: {
  action: 'generate' | 'toggle' | 'revoke' | 'reset-devices' | 'delete' | 'update';
  keyId?: string;
  name?: string;
  maxDevices?: number;
  expiresAt?: string | null;
  note?: string;
  active?: boolean;
}): Promise<SignalAppKeyAdminState> {
  return mutateStore((store) => {
    const now = Date.now();
    pruneSessions(store, now);

    if (input.action === 'generate') {
      const generatedKey = uniqueAccessKey(store);
      const key = makeStoredKey({
        store,
        plainKey: generatedKey,
        name: input.name,
        maxDevices: input.maxDevices,
        expiresAt: input.expiresAt,
        note: input.note,
        now,
      });
      store.app_keys.unshift(key);
      addLog(store, 'generate-key', `Generated key ${key.key_prefix} for ${key.name}`, now);
      return publicAdminState(store, generatedKey);
    }

    const key = input.keyId ? store.app_keys.find((item) => item.id === input.keyId) : null;
    if (!key) return publicAdminState(store);

    if (input.action === 'toggle' && key.status !== 'revoked') {
      key.status = input.active ? 'active' : 'disabled';
      key.updated_at = iso(now);
      addLog(store, 'toggle-key', `${key.name} is now ${key.status}`, now);
    }

    if (input.action === 'revoke') {
      key.status = 'revoked';
      key.updated_at = iso(now);
      revokeSessionsForKey(store, key.id, now);
      addLog(store, 'revoke-key', `${key.name} revoked`, now);
    }

    if (input.action === 'reset-devices') {
      key.devices = [];
      key.updated_at = iso(now);
      revokeSessionsForKey(store, key.id, now);
      addLog(store, 'reset-devices', `${key.name} device binding reset`, now);
    }

    if (input.action === 'delete') {
      store.app_keys = store.app_keys.filter((item) => item.id !== key.id);
      revokeSessionsForKey(store, key.id, now);
      addLog(store, 'delete-key', `${key.name} deleted`, now);
    }

    if (input.action === 'update') {
      key.name = cleanName(input.name, key.name);
      key.max_devices = cleanMaxDevices(input.maxDevices, key.max_devices);
      key.expires_at = cleanExpiresAt(input.expiresAt);
      key.note = cleanNote(input.note);
      key.updated_at = iso(now);
      addLog(store, 'update-key', `${key.name} settings updated`, now);
    }

    return publicAdminState(store);
  });
}

export async function unlockSignalApp(input: {
  appKey: string;
  deviceId: string;
  appVersion: string;
  /** the client's address, for the second lockout bucket */
  caller?: string;
}): Promise<SignalAppAuthResult> {
  return mutateStore((store) => {
    const now = Date.now();
    pruneSessions(store, now);

    const deviceHash = hashDeviceId(store, input.deviceId);
    if (!deviceHash) return { ok: false, reason: 'device-required' };

    /* Guessing was counted per device — and the device id comes from the
       client. A script sending a fresh one with every attempt got a fresh
       lockout bucket every time, so the limit never bit. Attempts are now
       counted against the caller's address as well, which the guesser does
       not choose, and either bucket filling up closes the door. */
    const callerHash = hashDeviceId(store, `caller:${input.caller ?? 'unknown'}`);
    const buckets = [deviceHash, callerHash];

    for (const bucket of buckets) {
      const lockout = getLockout(store, bucket);
      if (isLocked(lockout, now)) {
        return { ok: false, reason: 'locked', lockedUntil: lockout.locked_until ?? undefined };
      }
    }

    const normalizedKey = normalizeAccessKey(input.appKey);
    const keyHash = hashAccessKey(store, normalizedKey);
    const key = store.app_keys.find((item) => timingSafeEqualText(item.key_hash, keyHash));

    if (!key) {
      for (const bucket of buckets) recordFailedAttempt(store, bucket, now);
      return lockoutResult(store, deviceHash, now, 'invalid-key');
    }

    const invalid = invalidKeyReason(key, now);
    if (invalid) return { ok: false, reason: invalid };

    const existingDevice = key.devices.find((item) => item.device_id_hash === deviceHash);
    if (!existingDevice && key.devices.length >= key.max_devices) {
      return { ok: false, reason: 'device-limit' };
    }

    if (existingDevice) {
      existingDevice.app_version = cleanAppVersion(input.appVersion);
      existingDevice.last_used_at = iso(now);
      existingDevice.session_count += 1;
    } else {
      key.devices.push({
        device_id_hash: deviceHash,
        app_version: cleanAppVersion(input.appVersion),
        first_used_at: iso(now),
        last_used_at: iso(now),
        session_count: 1,
      });
    }

    key.last_used_at = iso(now);
    key.updated_at = iso(now);
    for (const bucket of buckets) clearLockout(store, bucket);
    addLog(store, 'unlock', `${key.name} unlocked on device ${shortHash(deviceHash)}`, now);

    return issueTokens(store, key, deviceHash, now);
  });
}

export async function refreshSignalAppSession(input: {
  refreshToken: string;
  deviceId: string;
}): Promise<SignalAppAuthResult> {
  return mutateStore((store) => {
    const now = Date.now();
    pruneSessions(store, now);

    const deviceHash = hashDeviceId(store, input.deviceId);
    if (!deviceHash) return { ok: false, reason: 'device-required' };

    const refreshHash = hashRefreshToken(store, input.refreshToken);
    const session = store.sessions.find((item) => timingSafeEqualText(item.refresh_hash, refreshHash));
    if (!session || session.revoked_at || session.device_id_hash !== deviceHash || Date.parse(session.expires_at) <= now) {
      return { ok: false, reason: 'invalid-refresh' };
    }

    const key = store.app_keys.find((item) => item.id === session.key_id);
    if (!key) return { ok: false, reason: 'invalid-refresh' };

    const invalid = invalidKeyReason(key, now);
    if (invalid) return { ok: false, reason: invalid };

    session.last_used_at = iso(now);
    touchDevice(key, deviceHash, now);
    return issueTokens(store, key, deviceHash, now, session);
  });
}

export async function authorizeSignalAccess(authHeader: string | null): Promise<boolean> {
  const raw = authHeader?.trim();
  if (!raw?.toLowerCase().startsWith('bearer ')) return false;

  const token = raw.slice(7).trim();
  const store = await readStore();
  pruneSessions(store, Date.now());
  return Boolean(verifyAccessToken(store, token));
}

function issueTokens(
  store: SignalAppAccessStore,
  key: StoredSignalAppKey,
  deviceHash: string,
  now: number,
  existingSession?: StoredSignalAppSession,
): Extract<SignalAppAuthResult, { ok: true }> {
  const created = existingSession ? null : makeSession(store, key.id, deviceHash, now);
  const session = existingSession ?? created!.session;
  if (created) store.sessions.push(created.session);

  const expiresAt = now + ACCESS_TOKEN_TTL_MS;
  const accessToken = createAccessToken(store, {
    sub: 'signal-app',
    sid: session.id,
    kid: key.id,
    did: deviceHash,
    iat: now,
    exp: expiresAt,
  });

  return {
    ok: true,
    accessToken,
    refreshToken: created?.refreshToken ?? '',
    expiresAt: iso(expiresAt),
    key: publicKey(key),
  };
}

function makeSession(store: SignalAppAccessStore, keyId: string, deviceHash: string, now: number) {
  const refreshToken = randomBytes(32).toString('base64url');
  const session: StoredSignalAppSession = {
    id: `sas_${randomBytes(9).toString('hex')}`,
    key_id: keyId,
    device_id_hash: deviceHash,
    refresh_hash: hashRefreshToken(store, refreshToken),
    created_at: iso(now),
    last_used_at: iso(now),
    expires_at: iso(now + REFRESH_TOKEN_TTL_MS),
    revoked_at: null,
  };

  return { session, refreshToken };
}

function createAccessToken(store: SignalAppAccessStore, payload: AccessTokenPayload) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${body}.${sign(store, body)}`;
}

function verifyAccessToken(store: SignalAppAccessStore, token: string): AccessTokenPayload | null {
  const [body, sig] = token.split('.');
  if (!body || !sig || !timingSafeEqualText(sig, sign(store, body))) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AccessTokenPayload;
    if (payload.sub !== 'signal-app') return null;
    if (payload.exp <= Date.now()) return null;

    const session = store.sessions.find((item) => item.id === payload.sid);
    if (!session || session.revoked_at || session.key_id !== payload.kid || session.device_id_hash !== payload.did) {
      return null;
    }
    if (Date.parse(session.expires_at) <= Date.now()) return null;

    const key = store.app_keys.find((item) => item.id === payload.kid);
    if (!key || invalidKeyReason(key, Date.now())) return null;

    return payload;
  } catch {
    return null;
  }
}

function makeStoredKey(input: {
  store: SignalAppAccessStore;
  plainKey: string;
  name?: string;
  maxDevices?: number;
  expiresAt?: string | null;
  note?: string;
  now: number;
}): StoredSignalAppKey {
  return {
    id: `sak_${randomBytes(8).toString('hex')}`,
    name: cleanName(input.name, 'Signal Key'),
    key_hash: hashAccessKey(input.store, normalizeAccessKey(input.plainKey)),
    key_prefix: input.plainKey.split('-')[0],
    status: 'active',
    max_devices: cleanMaxDevices(input.maxDevices, 1),
    devices: [],
    expires_at: cleanExpiresAt(input.expiresAt),
    note: cleanNote(input.note),
    created_at: iso(input.now),
    updated_at: iso(input.now),
    last_used_at: null,
  };
}

function uniqueAccessKey(store: SignalAppAccessStore) {
  for (let i = 0; i < 10; i += 1) {
    const key = generateAccessKey();
    const hash = hashAccessKey(store, normalizeAccessKey(key));
    if (!store.app_keys.some((item) => timingSafeEqualText(item.key_hash, hash))) return key;
  }
  throw new Error('Could not generate a unique app key');
}

function generateAccessKey() {
  return `PK${randomSegment(2)}-${randomSegment(4)}-${randomSegment(4)}`;
}

function randomSegment(length: number) {
  let out = '';
  const bytes = randomBytes(length);
  for (const byte of bytes) out += KEY_CHARS[byte % KEY_CHARS.length];
  return out;
}

function normalizeAccessKey(raw: string) {
  return String(raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function cleanName(value: unknown, fallback: string) {
  const raw = String(value ?? '').trim();
  return raw ? raw.slice(0, 70) : fallback;
}

function cleanNote(value: unknown) {
  return String(value ?? '').trim().slice(0, 180);
}

function cleanAppVersion(value: unknown) {
  const raw = String(value ?? '').trim();
  return raw ? raw.slice(0, 40) : 'unknown';
}

function cleanMaxDevices(value: unknown, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(25, Math.max(1, Math.round(num)));
}

function cleanExpiresAt(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const date = Date.parse(raw);
  return Number.isFinite(date) ? iso(date) : null;
}

function invalidKeyReason(key: StoredSignalAppKey, now: number): InvalidSignalAppKeyReason | null {
  if (key.status === 'disabled') return 'key-disabled';
  if (key.status === 'revoked') return 'key-revoked';
  if (key.expires_at && Date.parse(key.expires_at) <= now) return 'key-expired';
  return null;
}

function getLockout(store: SignalAppAccessStore, deviceHash: string) {
  let lockout = store.lockouts.find((item) => item.device_id_hash === deviceHash);
  if (!lockout) {
    lockout = {
      device_id_hash: deviceHash,
      attempts: 0,
      locked_until: null,
      updated_at: iso(Date.now()),
    };
    store.lockouts.push(lockout);
  }
  return lockout;
}

function isLocked(lockout: StoredSignalAppLockout, now: number) {
  return Boolean(lockout.locked_until && Date.parse(lockout.locked_until) > now);
}

function recordFailedAttempt(store: SignalAppAccessStore, deviceHash: string, now: number) {
  const lockout = getLockout(store, deviceHash);
  if (lockout.locked_until && Date.parse(lockout.locked_until) <= now) {
    lockout.attempts = 0;
    lockout.locked_until = null;
  }

  lockout.attempts += 1;
  lockout.updated_at = iso(now);
  if (lockout.attempts >= FAILED_LIMIT) {
    lockout.locked_until = iso(now + LOCKOUT_MS);
    addLog(store, 'lockout', `Device ${shortHash(deviceHash)} locked after failed key attempts`, now);
  }
}

function lockoutResult(
  store: SignalAppAccessStore,
  deviceHash: string,
  now: number,
  fallback: Extract<SignalAppAuthResult, { ok: false }>['reason'],
): Extract<SignalAppAuthResult, { ok: false }> {
  const lockout = getLockout(store, deviceHash);
  if (isLocked(lockout, now)) return { ok: false, reason: 'locked', lockedUntil: lockout.locked_until ?? undefined };
  return { ok: false, reason: fallback };
}

function clearLockout(store: SignalAppAccessStore, deviceHash: string) {
  store.lockouts = store.lockouts.filter((item) => item.device_id_hash !== deviceHash);
}

function touchDevice(key: StoredSignalAppKey, deviceHash: string, now: number) {
  const device = key.devices.find((item) => item.device_id_hash === deviceHash);
  if (!device) return;
  device.last_used_at = iso(now);
  key.last_used_at = iso(now);
  key.updated_at = iso(now);
}

function revokeSessionsForKey(store: SignalAppAccessStore, keyId: string, now: number) {
  for (const session of store.sessions) {
    if (session.key_id === keyId && !session.revoked_at) {
      session.revoked_at = iso(now);
    }
  }
}

function pruneSessions(store: SignalAppAccessStore, now: number) {
  store.sessions = store.sessions.filter((session) => (
    !session.revoked_at && Date.parse(session.expires_at) > now - 60_000
  ));
  store.lockouts = store.lockouts.filter((lockout) => (
    lockout.locked_until ? Date.parse(lockout.locked_until) > now : lockout.attempts > 0
  ));
}

function publicAdminState(store: SignalAppAccessStore, generatedKey?: string): SignalAppKeyAdminState {
  return {
    ok: true,
    keys: store.app_keys.map(publicKey),
    auditLogs: store.audit_logs.slice(0, 40).map((log) => ({
      id: log.id,
      action: log.action,
      message: log.message,
      createdAt: log.created_at,
    })),
    ...(generatedKey ? { generatedKey } : {}),
  };
}

function publicKey(key: StoredSignalAppKey): PublicSignalAppKey {
  return {
    id: key.id,
    name: key.name,
    keyPrefix: key.key_prefix,
    status: key.status,
    maxDevices: key.max_devices,
    deviceCount: key.devices.length,
    devices: key.devices.map((device) => ({
      deviceHash: shortHash(device.device_id_hash),
      appVersion: device.app_version,
      firstUsedAt: device.first_used_at,
      lastUsedAt: device.last_used_at,
      sessionCount: device.session_count,
    })),
    expiresAt: key.expires_at,
    note: key.note,
    createdAt: key.created_at,
    updatedAt: key.updated_at,
    lastUsedAt: key.last_used_at,
  };
}

function addLog(store: SignalAppAccessStore, action: string, message: string, now: number) {
  store.audit_logs = [
    {
      id: `${now}-${randomBytes(3).toString('hex')}`,
      action,
      message,
      created_at: iso(now),
    },
    ...store.audit_logs,
  ].slice(0, 80);
}

function hashAccessKey(store: SignalAppAccessStore, normalizedKey: string) {
  return createHmac('sha256', store.hash_secret).update(`key:${normalizedKey}`).digest('hex');
}

function hashDeviceId(store: SignalAppAccessStore, deviceId: string) {
  const raw = String(deviceId ?? '').trim();
  if (!raw) return '';
  return createHmac('sha256', store.hash_secret).update(`device:${raw}`).digest('hex');
}

function hashRefreshToken(store: SignalAppAccessStore, refreshToken: string) {
  const raw = String(refreshToken ?? '').trim();
  if (!raw) return '';
  return createHmac('sha256', store.hash_secret).update(`refresh:${raw}`).digest('hex');
}

function sign(store: SignalAppAccessStore, body: string) {
  return createHmac('sha256', store.token_secret).update(body).digest('base64url');
}

function timingSafeEqualText(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function mutateStore<T>(fn: (store: SignalAppAccessStore) => T): Promise<T> {
  const next = writeQueue.then(async () => {
    const store = await readStore();
    const result = fn(store);
    await writeStore(store);
    return result;
  });
  writeQueue = next.then(() => undefined, () => undefined);
  return next;
}

async function readStore(): Promise<SignalAppAccessStore> {
  try {
    const raw = await readFile(STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as SignalAppAccessStore;
    if (parsed?.version === 1 && parsed.hash_secret && Array.isArray(parsed.app_keys)) return parsed;
  } catch {
    // First local run: create a fresh access-control store below.
  }

  return createInitialStore(Date.now());
}

async function writeStore(store: SignalAppAccessStore) {
  await mkdir(path.dirname(STORE_FILE), { recursive: true });
  await writeFile(STORE_FILE, `${JSON.stringify(store, null, 2)}\n`);
}

function createInitialStore(now: number): SignalAppAccessStore {
  return {
    version: 1,
    hash_secret: randomBytes(32).toString('hex'),
    token_secret: randomBytes(32).toString('hex'),
    app_keys: [],
    sessions: [],
    lockouts: [],
    audit_logs: [
      {
        id: `${now}-init`,
        action: 'init',
        message: 'Signal app access store created',
        created_at: iso(now),
      },
    ],
  };
}

function shortHash(value: string) {
  return value.slice(0, 12);
}

function iso(ms: number) {
  return new Date(ms).toISOString();
}
