import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const ADMIN_SESSION_COOKIE = 'prime_admin_session';
export const ADMIN_SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

type AdminPasswordRecord = {
  salt: string;
  hash: string;
};

type AdminAuthStore = {
  version: 1;
  username: string;
  password: AdminPasswordRecord;
  passwordVersion: number;
  sessionSecret: string;
  updatedAt: string;
};

export type AdminSession = {
  username: string;
  expiresAt: number;
};

type AdminSessionPayload = {
  sub: 'admin';
  username: string;
  iat: number;
  exp: number;
  pv: number;
};

export type AdminAuthResult =
  | { ok: true; username: string; token: string; expiresAt: number }
  | { ok: false; reason: 'invalid-credentials' | 'unauthorized' | 'password-too-short' | 'password-mismatch' };

const STORE_FILE = path.join(process.cwd(), '.data', 'admin-auth-store.json');
const DEFAULT_USERNAME = process.env.ADMIN_USERNAME?.trim() || 'admin';
const MIN_PASSWORD_LENGTH = 6;

let writeQueue = Promise.resolve();

export function adminSessionCookieOptions(expiresAt?: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    expires: new Date(expiresAt ?? Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000),
  };
}

export function expiredAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  };
}

export async function loginAdmin(username: string, password: string): Promise<AdminAuthResult> {
  return mutateStore((store) => {
    if (!sameText(username.trim(), store.username) || !verifyPassword(password, store.password)) {
      return { ok: false, reason: 'invalid-credentials' };
    }

    return createAuthResult(store);
  });
}

export async function changeAdminPassword(input: {
  token?: string;
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<AdminAuthResult> {
  return mutateStore((store) => {
    const session = verifySessionToken(input.token, store);
    if (!session) return { ok: false, reason: 'unauthorized' };

    if (input.newPassword !== input.confirmPassword) {
      return { ok: false, reason: 'password-mismatch' };
    }

    if (input.newPassword.length < MIN_PASSWORD_LENGTH) {
      return { ok: false, reason: 'password-too-short' };
    }

    if (!verifyPassword(input.oldPassword, store.password)) {
      return { ok: false, reason: 'invalid-credentials' };
    }

    store.password = hashPassword(input.newPassword);
    store.passwordVersion += 1;
    store.updatedAt = iso(Date.now());

    return createAuthResult(store);
  });
}

export async function getAdminSessionFromCookie(token?: string): Promise<AdminSession | null> {
  const store = await readStore();
  return verifySessionToken(token, store);
}

function createAuthResult(store: AdminAuthStore): Extract<AdminAuthResult, { ok: true }> {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + ADMIN_SESSION_MAX_AGE_SECONDS * 1000;
  return {
    ok: true,
    username: store.username,
    token: createSessionToken(store, issuedAt, expiresAt),
    expiresAt,
  };
}

function createSessionToken(store: AdminAuthStore, issuedAt: number, expiresAt: number) {
  const payload: AdminSessionPayload = {
    sub: 'admin',
    username: store.username,
    iat: issuedAt,
    exp: expiresAt,
    pv: store.passwordVersion,
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const sig = sign(body, store.sessionSecret);
  return `${body}.${sig}`;
}

function verifySessionToken(token: string | undefined, store: AdminAuthStore): AdminSession | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig || !timingSafeEqualText(sig, sign(body, store.sessionSecret))) {
    return null;
  }

  const payload = parsePayload(body);
  if (!payload) return null;
  if (payload.sub !== 'admin') return null;
  if (!sameText(payload.username, store.username)) return null;
  if (payload.pv !== store.passwordVersion) return null;
  if (payload.exp <= Date.now()) return null;

  return {
    username: store.username,
    expiresAt: payload.exp,
  };
}

function parsePayload(body: string): AdminSessionPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AdminSessionPayload;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.username !== 'string') return null;
    if (typeof parsed.exp !== 'number') return null;
    if (typeof parsed.pv !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function hashPassword(password: string): AdminPasswordRecord {
  const salt = randomBytes(16).toString('hex');
  return {
    salt,
    hash: scryptSync(password, salt, 64).toString('hex'),
  };
}

function verifyPassword(password: string, saved: AdminPasswordRecord) {
  const hash = scryptSync(password, saved.salt, 64).toString('hex');
  return timingSafeEqualText(hash, saved.hash);
}

function sign(body: string, secret: string) {
  return createHmac('sha256', secret).update(body).digest('base64url');
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function timingSafeEqualText(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function sameText(left: string, right: string) {
  return left === right;
}

function mutateStore<T>(fn: (store: AdminAuthStore) => T): Promise<T> {
  const next = writeQueue.then(async () => {
    const store = await readStore();
    const result = fn(store);
    await writeStore(store);
    return result;
  });
  writeQueue = next.then(() => undefined, () => undefined);
  return next;
}

async function readStore(): Promise<AdminAuthStore> {
  try {
    const raw = await readFile(STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as AdminAuthStore;
    if (parsed?.version === 1 && parsed.username && parsed.password?.hash && parsed.sessionSecret) {
      return parsed;
    }
  } catch {
    // First local run: create default demo admin credentials below.
  }
  return createInitialStore(Date.now());
}

async function writeStore(store: AdminAuthStore) {
  await mkdir(path.dirname(STORE_FILE), { recursive: true });
  await writeFile(STORE_FILE, `${JSON.stringify(store, null, 2)}\n`);
}

function createInitialStore(now: number): AdminAuthStore {
  const initialPassword = getInitialAdminPassword();
  return {
    version: 1,
    username: DEFAULT_USERNAME,
    password: hashPassword(initialPassword),
    passwordVersion: 1,
    sessionSecret: randomBytes(32).toString('hex'),
    updatedAt: iso(now),
  };
}

function getInitialAdminPassword() {
  const password = process.env.ADMIN_PASSWORD;
  if (process.env.NODE_ENV === 'production') {
    if (!password || password === 'admin123' || password === 'change-this-before-live') {
      throw new Error('ADMIN_PASSWORD must be set to a strong value before the first production boot.');
    }
  }
  return password || 'admin123';
}

function iso(ms: number) {
  return new Date(ms).toISOString();
}
