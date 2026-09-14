/* ============================================================
   The player's session: one signed, httpOnly cookie.

   `sk_session` = base64url({ u: user id, v: session version, e: expiry })
   + "." + HMAC-SHA256 of that. The browser cannot read it (httpOnly) and
   cannot forge it (the key never leaves the server). Every request that
   names a player checks it, and checks the version against `users`, so a
   password change or a ban ends every older session at once.

   The key is SESSION_SECRET when the environment has one; otherwise one
   is made on first use and kept in .data/session-secret (mode 600), so a
   deploy needs no extra step and a restart does not log anybody out.
   ============================================================ */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { phoneToEmail } from '../auth';
import type { Account } from './accounts';
import { one, withConn } from './pool';

export const SESSION_COOKIE = 'sk_session';
const SESSION_DAYS = 30;

let key: Buffer | null = null;

function secret(): Buffer {
  if (key) return key;
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 32) return (key = Buffer.from(fromEnv));

  const file = path.join(process.cwd(), '.data', 'session-secret');
  const read = () => {
    try {
      const s = readFileSync(file, 'utf8').trim();
      return s.length >= 32 ? s : null;
    } catch {
      return null;
    }
  };
  let s = read();
  if (!s) {
    mkdirSync(path.dirname(file), { recursive: true });
    try {
      writeFileSync(file, randomBytes(48).toString('hex'), { mode: 0o600, flag: 'wx' });
    } catch {
      /* another worker wrote it first; theirs is the one */
    }
    s = read();
  }
  if (!s) throw new Error('session secret unavailable');
  return (key = Buffer.from(s));
}

const sign = (payload: string) => createHmac('sha256', secret()).update(payload).digest('base64url');

export function makeToken(uid: string, version: number): string {
  const payload = Buffer.from(JSON.stringify({ u: uid, v: version, e: Date.now() + SESSION_DAYS * 86_400_000 }))
    .toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function parseToken(token: string | null | undefined): { uid: string; version: number } | null {
  if (!token || token.length > 600) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const want = Buffer.from(sign(payload));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { u?: unknown; v?: unknown; e?: unknown };
    if (typeof p.u !== 'string' || typeof p.v !== 'number' || typeof p.e !== 'number' || p.e < Date.now()) return null;
    return { uid: p.u, version: p.v };
  } catch {
    return null;
  }
}

export type SessionUser = {
  id: string;
  phone: string;
  email: string | null;
  created_at: string | null;
  /** an admin reset the password; the player has to choose their own */
  mustChange: boolean;
};

const emailOf = (phone: string) => {
  try {
    return phoneToEmail(phone);
  } catch {
    return null;
  }
};

/** The player a cookie names — if it is genuine, current, and not banned. */
export async function userFromToken(token: string | null | undefined): Promise<SessionUser | null> {
  const t = parseToken(token);
  if (!t) return null;
  const row = await withConn((c) => one(c,
    `SELECT u.id, u.phone, u.session_version, u.created_at, u.must_change_password, p.is_blocked
       FROM users u LEFT JOIN profiles p ON p.id = ?
      WHERE u.id = ? LIMIT 1`,
    [t.uid, t.uid]));
  if (!row || Number(row.session_version) !== t.version || row.is_blocked) return null;
  const phone = String(row.phone);
  return {
    id: String(row.id),
    phone,
    email: emailOf(phone),
    created_at: (row.created_at as string) ?? null,
    mustChange: Boolean(row.must_change_password),
  };
}

/** The shape the browser's session object has always had, plus whether the
    player still has to replace a password an admin reset. */
export const publicSession = (a: Account) => ({
  user: { id: a.id, email: emailOf(a.phone), created_at: a.createdAt },
  mustChangePassword: Boolean(a.mustChange),
});

export function sessionCookie(a: Account) {
  return {
    name: SESSION_COOKIE,
    value: makeToken(a.id, a.version),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_DAYS * 86_400,
  };
}

export const clearedCookie = {
  name: SESSION_COOKIE,
  value: '',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 0,
};

/** The signed-in player for this request, in a route handler. */
export async function currentUser(req: Request): Promise<SessionUser | null> {
  return userFromToken(cookieFrom(req.headers.get('cookie')));
}

export function cookieFrom(header: string | null): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const at = part.indexOf('=');
    if (at > 0 && part.slice(0, at).trim() === SESSION_COOKIE) return decodeURIComponent(part.slice(at + 1).trim());
  }
  return null;
}
