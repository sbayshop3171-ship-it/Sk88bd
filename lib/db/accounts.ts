/* ============================================================
   Logins: signing up, checking a password, changing it.

   A player's login is their phone number and a bcrypt hash in `users`;
   their profile row carries the same id as text (`profiles.id`), which
   is the id every other table knows them by.
   ============================================================ */

import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { normalizeAgentCode } from '../agent-links';
import { isValidPhone, normalizePhone } from '../auth';
import { DbFail } from './errors';
import { one, run, tx, withConn, write, type Conn } from './pool';

export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 64;

export type Account = { id: string; phone: string; createdAt: string | null; version: number };

/* a wrong number takes as long to refuse as a wrong password, so the
   answer's timing does not say which numbers have accounts */
let dummy: string | null = null;
const dummyHash = async () => (dummy ??= await bcrypt.hash(randomBytes(12).toString('hex'), 10));

async function nextCounter(c: Conn, name: string, floor: number) {
  await run(c, 'INSERT INTO counters (name, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = v', [name, floor]);
  await run(c, 'UPDATE counters SET v = LAST_INSERT_ID(v + 1) WHERE name = ?', [name]);
  const r = await one(c, 'SELECT LAST_INSERT_ID() AS n');
  return Number(r?.n);
}

async function freshReferralCode(c: Conn) {
  for (let i = 0; i < 8; i += 1) {
    const code = randomBytes(4).toString('hex');
    if (!(await one(c, 'SELECT 1 AS x FROM profiles WHERE referral_code = ?', [code]))) return code;
  }
  return randomBytes(6).toString('hex');
}

export async function registerAccount(input: {
  phone: string;
  password: string;
  referralCode?: unknown;
  agentCode?: unknown;
}): Promise<Account> {
  const phone = normalizePhone(String(input.phone ?? '').trim());
  if (!isValidPhone(phone)) throw new DbFail('Enter a valid 11-digit number (01XXXXXXXXX)', 'invalid-phone');
  const password = String(input.password ?? '');
  if (password.length < PASSWORD_MIN) throw new DbFail('The password must be at least 6 characters', 'weak-password');
  if (password.length > PASSWORD_MAX) throw new DbFail('That password is too long', 'weak-password');

  const hash = await bcrypt.hash(password, 10);
  const ref = String(input.referralCode ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 32);
  const agent = normalizeAgentCode(typeof input.agentCode === 'string' ? input.agentCode : null) ?? null;

  try {
    return await tx(async (c) => {
      if (await one(c, 'SELECT id FROM users WHERE phone = ? FOR UPDATE', [phone])) {
        throw new DbFail('An account already exists for this number', 'phone-taken');
      }
      const res = await write(c, 'INSERT INTO users (phone, password_hash) VALUES (?, ?)', [phone, hash]);
      const id = String(res.insertId);
      const playerNo = await nextCounter(c, 'player_no', 100000);
      const inviter = ref ? await one(c, 'SELECT id FROM profiles WHERE referral_code = ? LIMIT 1', [ref]) : null;
      await run(c,
        `INSERT INTO profiles (id, user_id, username, phone, role, vip_level, referral_code, referred_by, agent_code, player_no)
         VALUES (?, ?, ?, ?, 'player', 0, ?, ?, ?, ?)`,
        [id, id, phone, phone, await freshReferralCode(c), inviter ? String(inviter.id) : null, agent, playerNo]);
      await run(c, 'INSERT INTO wallets (user_id) VALUES (?)', [res.insertId]);
      const u = await one(c, 'SELECT created_at FROM users WHERE id = ?', [id]);
      return { id, phone, createdAt: (u?.created_at as string) ?? null, version: 0 };
    });
  } catch (e) {
    // two sign-ups for one number at the same instant: the second meets the key
    if ((e as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw new DbFail('An account already exists for this number', 'phone-taken');
    }
    throw e;
  }
}

/** A player brought over from Supabase without their password hash: ask
    Supabase whether this password is theirs. Both login domains the old
    site used are tried. False on any doubt. */
async function supabaseSaysYes(phone: string, password: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  for (const domain of ['id.sk88bd.live', 'sk88bd.local']) {
    try {
      const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: key, 'content-type': 'application/json' },
        body: JSON.stringify({ email: `${phone}@${domain}`, password }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return true;
    } catch {
      /* Supabase unreachable: treat as a wrong password, never as a right one */
    }
  }
  return false;
}

/** The account if the password is right; 'wrong' or 'banned' if not. */
export async function verifyLogin(phoneRaw: string, password: string): Promise<Account | 'wrong' | 'banned'> {
  const phone = normalizePhone(phoneRaw.trim());
  const u = await withConn((c) => one(c,
    'SELECT id, phone, password_hash, legacy_id, session_version, created_at FROM users WHERE phone = ? LIMIT 1', [phone]));
  const hash = String(u?.password_hash ?? '');
  if (u && !hash && u.legacy_id) {
    // their first login since the move: Supabase vouches once, then the
    // password is kept here and Supabase is never asked again
    if (!(await supabaseSaysYes(phone, password))) return 'wrong';
    const kept = await bcrypt.hash(password, 10);
    await withConn((c) => run(c, "UPDATE users SET password_hash = ? WHERE id = ? AND password_hash = ''", [kept, u.id]));
  } else if (!u || !hash) {
    await bcrypt.compare(password, await dummyHash());
    return 'wrong';
  } else if (!(await bcrypt.compare(password, hash))) {
    return 'wrong';
  }

  const id = String(u.id);
  const p = await withConn((c) => one(c, 'SELECT is_blocked FROM profiles WHERE id = ?', [id]));
  if (p?.is_blocked) return 'banned';
  return { id, phone: String(u.phone), createdAt: (u.created_at as string) ?? null, version: Number(u.session_version) };
}

/** A new login password. Every other session on the account ends. */
export async function changePassword(uid: string, next: string): Promise<Account | 'same'> {
  if (next.length < PASSWORD_MIN) throw new DbFail('The password must be at least 6 characters', 'weak-password');
  if (next.length > PASSWORD_MAX) throw new DbFail('That password is too long', 'weak-password');
  const u = await withConn((c) => one(c, 'SELECT phone, password_hash, created_at FROM users WHERE id = ?', [uid]));
  if (!u) throw new DbFail('Log in first', 'unauthorized');
  if (u.password_hash && (await bcrypt.compare(next, String(u.password_hash)))) return 'same';

  const hash = await bcrypt.hash(next, 10);
  const version = await tx(async (c) => {
    await run(c, 'UPDATE users SET password_hash = ?, session_version = session_version + 1 WHERE id = ?', [hash, uid]);
    const r = await one(c, 'SELECT session_version FROM users WHERE id = ?', [uid]);
    return Number(r?.session_version ?? 0);
  });
  return { id: uid, phone: String(u.phone), createdAt: (u.created_at as string) ?? null, version };
}

/** End every session the account has (a ban, a forced logout). */
export async function endSessions(uid: string) {
  await withConn((c) => run(c, 'UPDATE users SET session_version = session_version + 1 WHERE id = ?', [uid]));
}
