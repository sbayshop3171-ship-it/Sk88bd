#!/usr/bin/env node
/* ============================================================
   Bring the players from the old Supabase project into this
   server's MySQL — logins, balances and history.

   Run on the server, in the app folder:
     node scripts/import-supabase.mjs            dry run: counts only, writes nothing
     node scripts/import-supabase.mjs --apply    import

   Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and the DB_*
   settings from the environment, or from .env.production / .env.local in
   this folder. The site must have been opened once since 2026-09-13 so its
   tables exist (lib/db/schema.ts).

   Safe to run again: every player brought over is recorded in import_map
   and skipped next time.

   A player whose number already has an account here keeps that account.
   Their Supabase balance is added to it as one "import:supabase" line in
   the ledger, and their requests (pending ones included) come along.

   Player IDs: an imported player keeps the ID they had on Supabase. If a
   player who signed up here since the move already holds that number, that
   player is given a new one.

   Passwords live in Supabase's auth schema, which the API does not expose.
   scripts/supabase-export-logins.sql adds a function that hands the hashes
   to the service key; run it in the Supabase SQL editor first. Without it
   the players still arrive, and the site checks their password against
   Supabase the first time each one logs in (lib/db/accounts.ts).
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';

const APPLY = process.argv.includes('--apply');
const argList = (flag) => process.argv
  .filter((a) => a.startsWith(`${flag}=`))
  .flatMap((a) => a.slice(flag.length + 1).split(','))
  .map((s) => s.trim())
  .filter(Boolean);
/** the two test accounts from 2026-09-06, and any the caller names */
const SKIP = new Set(['01700000099', '01700000097', ...argList('--skip')]);
/** --hold-over=TAKA: a player whose Supabase balance is above this arrives
    ON HOLD — they can log in and see it, nothing moves until an admin
    releases them at /admin/users */
const HOLD_OVER = Number(argList('--hold-over')[0] ?? NaN) * 100;

/* ---------------------------------------------------------------- env ---- */

for (const file of ['.env.production', '.env.local', '.env']) {
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) continue;
  for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
const env = (...names) => {
  for (const n of names) if (process.env[n]) return process.env[n];
  return undefined;
};

const SB_URL = env('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL')?.replace(/\/+$/, '');
const SB_KEY = env('SUPABASE_SERVICE_ROLE_KEY');
if (!SB_URL || !SB_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

/* ------------------------------------------------------------ helpers ---- */

const int = (v) => Math.trunc(Number(v) || 0);
const bool = (v) => v === true || v === 1 || v === 't' || v === 'true';
const str = (v, max) => (v === null || v === undefined || v === '' ? null : String(v).slice(0, max));
const ts = (v) => {
  if (!v) return null;
  const at = new Date(String(v).replace(/(\.\d{3})\d+/, '$1'));
  return Number.isNaN(at.getTime()) ? null : at;
};
const norm = (v) => String(v ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 64);
const STATES = new Set(['pending', 'approved', 'rejected', 'cancelled']);
const reqState = (v) => (STATES.has(v) ? v : 'pending');
const KINDS = new Set(['deposit', 'withdraw', 'bet', 'win', 'bonus', 'rebate', 'adjust']);
const mask = (phone) => `${phone.slice(0, 3)}*****${phone.slice(-3)}`;
const taka = (paisa) => `৳${(paisa / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const groupBy = (rows, key = 'user_id') => {
  const out = new Map();
  for (const r of rows) {
    const k = String(r[key]);
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(r);
  }
  return out;
};

/* ----------------------------------------------------------- supabase ---- */

async function sb(route, init = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${route}`, {
    ...init,
    headers: {
      apikey: SB_KEY,
      authorization: `Bearer ${SB_KEY}`,
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${text.slice(0, 160)}`);
  return text ? JSON.parse(text) : null;
}

async function readTable(name, order, optional = false) {
  const out = [];
  try {
    for (let from = 0; ; from += 1000) {
      const page = await sb(`${name}?select=*&order=${order}.asc&offset=${from}&limit=1000`);
      out.push(...page);
      if (page.length < 1000) break;
    }
  } catch (e) {
    if (!optional) throw new Error(`Could not read ${name} from Supabase: ${e.message}`);
    console.warn(`  (${name}: not read — ${e.message})`);
    return [];
  }
  return out;
}

console.log(`Reading Supabase (${new URL(SB_URL).host}) …`);
const profiles = await readTable('profiles', 'created_at');
const wallets = groupBy(await readTable('wallets', 'user_id'));
const deposits = groupBy(await readTable('deposits', 'id'));
const withdrawals = groupBy(await readTable('withdrawals', 'id'));
const ledger = groupBy(await readTable('transactions', 'id'));
const payouts = groupBy(await readTable('payout_accounts', 'id', true));
const appeals = groupBy(await readTable('account_appeals', 'id', true));
const security = groupBy(await readTable('security_settings', 'user_id', true));

const logins = new Map();
let loginsExported = false;
try {
  for (const r of (await sb('rpc/sk88bd_export_logins', { method: 'POST', body: '{}' })) ?? []) {
    logins.set(String(r.id), String(r.encrypted_password ?? ''));
  }
  loginsExported = true;
} catch (e) {
  console.warn(`  (login passwords not exported — ${e.message})`);
}

/* -------------------------------------------------------------- mysql ---- */

const db = await mysql.createConnection({
  host: env('DB_HOST', 'MYSQL_HOST') ?? '127.0.0.1',
  port: Number(env('DB_PORT', 'MYSQL_PORT') ?? 3306),
  user: env('DB_USER', 'DB_USERNAME', 'MYSQL_USER') ?? 'root',
  password: env('DB_PASSWORD', 'MYSQL_PASSWORD') ?? '',
  database: env('DB_NAME', 'DB_DATABASE', 'MYSQL_DATABASE') ?? 'sk88bd',
  charset: 'utf8mb4',
  timezone: 'Z',
  decimalNumbers: true,
  supportBigNumbers: true,
  typeCast: (field, next) => {
    if (field.type === 'TINY' && field.length === 1) {
      const v = field.string();
      return v === null ? null : v === '1';
    }
    return next();
  },
});
await db.query("SET time_zone = '+00:00', collation_connection = @@collation_database");
const q = async (sql, params = []) => (await db.query(sql, params))[0];

try {
  const [ready] = await q("SELECT id FROM schema_migrations WHERE id = '2026-09-13-base'");
  if (!ready) throw new Error('not ready');
} catch {
  console.error('The site has not prepared its database yet — open sk88bd.com once, then run this again.');
  process.exit(1);
}

// the same two things lib/db/schema.ts step 2026-09-13-import makes
const [legacyCol] = await q(
  "SELECT 1 AS x FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'legacy_id'");
if (!legacyCol) await q('ALTER TABLE users ADD COLUMN legacy_id VARCHAR(64) NULL');
await q(`CREATE TABLE IF NOT EXISTS import_map (
  source_id VARCHAR(64) NOT NULL PRIMARY KEY,
  target_id VARCHAR(64) NOT NULL,
  mode ENUM('new','merged') NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

const here = new Map((await q('SELECT id, phone FROM users')).map((r) => [String(r.phone), String(r.id)]));
const mapped = new Map((await q('SELECT source_id, target_id FROM import_map')).map((r) => [String(r.source_id), String(r.target_id)]));
const numbersHere = new Map((await q('SELECT id, player_no FROM profiles WHERE player_no IS NOT NULL'))
  .map((r) => [Number(r.player_no), String(r.id)]));

/* --------------------------------------------------------------- plan ---- */

const plan = [];
const skipped = { already: 0, test: 0, badPhone: 0 };
for (const p of profiles) {
  const phone = String(p.phone ?? '').trim();
  if (mapped.has(String(p.id))) { skipped.already += 1; continue; }
  if (!/^01\d{9}$/.test(phone)) { skipped.badPhone += 1; continue; }
  if (SKIP.has(phone)) { skipped.test += 1; continue; }
  const target = here.get(phone) ?? null;
  plan.push({ p, phone, wallet: wallets.get(String(p.id))?.[0] ?? {}, mode: target ? 'merged' : 'new', target });
}

const fresh = plan.filter((x) => x.mode === 'new');
const merged = plan.filter((x) => x.mode === 'merged');
const sum = (list) => list.reduce((n, x) => n + int(x.wallet.balance), 0);
const pendingOf = (list, rows) => list.reduce((n, x) => n + (rows.get(String(x.p.id)) ?? []).filter((r) => r.state === 'pending').length, 0);
const renumber = plan.filter((x) => {
  const holder = numbersHere.get(int(x.p.player_no));
  return holder && holder !== x.target;
}).length;

console.log(`
Supabase players:            ${profiles.length}
  new here:                  ${fresh.length}   (balances ${taka(sum(fresh))})
  number already here:       ${merged.length}   (balances ${taka(sum(merged))} added to their account)
  already imported:          ${skipped.already}
  test accounts skipped:     ${skipped.test}
  no usable phone, skipped:  ${skipped.badPhone}
Pending deposits coming:     ${pendingOf(plan, deposits)}
Pending withdrawals coming:  ${pendingOf(plan, withdrawals)}
Login passwords:             ${loginsExported
    ? `exported (${fresh.filter((x) => !logins.get(String(x.p.id))).length} new players have none)`
    : 'NOT exported — they will be checked against Supabase on first login'}
Players here who get a new ID (their number belongs to an imported player): ${renumber}`);

for (const x of merged) {
  console.log(`  merge ${mask(x.phone)}  +${taka(int(x.wallet.balance))}`);
}

/* what each player actually paid in and took out, next to what they hold —
   a balance far above both did not come from the cashier */
const paidIn = (sid) => (deposits.get(sid) ?? []).filter((d) => d.state === 'approved').reduce((n, d) => n + int(d.amount), 0);
const paidOut = (sid) => (withdrawals.get(sid) ?? []).filter((w) => w.state === 'approved').reduce((n, w) => n + int(w.amount), 0);
const band = (min) => plan.filter((x) => int(x.wallet.balance) > min * 100).length;
console.log(`
Balances over ৳10,000: ${band(10_000)}   over ৳1,00,000: ${band(100_000)}   over ৳10,00,000: ${band(1_000_000)}
Largest balances (deposited / withdrawn, approved):`);
for (const x of [...plan].sort((a, b) => int(b.wallet.balance) - int(a.wallet.balance)).slice(0, 25)) {
  const sid = String(x.p.id);
  console.log(`  ${x.mode === 'new' ? 'new  ' : 'merge'} ${mask(x.phone)}  ID ${x.p.player_no ?? '—'}  balance ${taka(int(x.wallet.balance))}`
    + `  (in ${taka(paidIn(sid))} / out ${taka(paidOut(sid))})${x.p.is_blocked ? '  BANNED' : x.p.is_held ? '  HELD' : ''}`);
}
if (Number.isFinite(HOLD_OVER)) {
  console.log(`\n--hold-over: ${plan.filter((x) => int(x.wallet.balance) > HOLD_OVER).length} players arrive ON HOLD`);
}

if (!APPLY) {
  console.log('\nDry run — nothing was written. Run again with --apply to import.');
  await db.end();
  process.exit(0);
}

/* -------------------------------------------------------------- apply ---- */

const maxSupabaseNo = profiles.reduce((m, p) => Math.max(m, int(p.player_no)), 0);
await q("INSERT INTO counters (name, v) VALUES ('player_no', 100000) ON DUPLICATE KEY UPDATE v = v");
// new sign-ups from here on are numbered above every Supabase ID
await q(`UPDATE counters SET v = GREATEST(v, ?, (SELECT COALESCE(MAX(player_no), 0) FROM profiles))
         WHERE name = 'player_no'`, [maxSupabaseNo]);

async function nextNo() {
  await q("UPDATE counters SET v = LAST_INSERT_ID(v + 1) WHERE name = 'player_no'");
  const [r] = await q('SELECT LAST_INSERT_ID() AS n');
  return Number(r.n);
}

const stats = { imported: 0, merged: 0, failed: 0, renumbered: 0, rows: 0 };

/** Give number `no` to `keepId`: whoever else holds it gets a new one. */
async function freeNumber(no, keepId) {
  if (!no) return;
  const [holder] = await q('SELECT id FROM profiles WHERE player_no = ? FOR UPDATE', [no]);
  if (!holder || String(holder.id) === String(keepId)) return;
  await q('UPDATE profiles SET player_no = ? WHERE id = ?', [await nextNo(), holder.id]);
  stats.renumbered += 1;
}

async function bringHistory(sid, uid, withLedger) {
  const depMap = new Map();
  const wdMap = new Map();

  for (const d of deposits.get(sid) ?? []) {
    const txn = norm(d.txn_id) || null;
    const r = await q(`INSERT INTO deposits (user_id, channel_id, method_id, amount, bonus_amount, sender_no, txn_id,
        state, admin_note, reviewed_at, created_at) VALUES (?)`,
    [[uid, str(d.channel_id, 40) ?? 'bkash', str(d.method_id, 64), int(d.amount), int(d.bonus_amount),
      str(d.sender_no, 40), txn, reqState(d.state), d.admin_note ?? null, ts(d.reviewed_at), ts(d.created_at) ?? new Date()]]);
    depMap.set(String(d.id), r.insertId);
    if (txn) await q("INSERT IGNORE INTO txn_claims (norm, source, ref_id) VALUES (?, 'deposit', ?)", [txn, r.insertId]);
    stats.rows += 1;
  }

  for (const w of withdrawals.get(sid) ?? []) {
    const trx = norm(w.charge_trx_id) || null;
    const r = await q(`INSERT INTO withdrawals (user_id, channel_id, amount, account_no, state, admin_note, reviewed_at,
        charge_amount, charge_channel_id, charge_account_no, charge_trx_id, charge_paid_at, debited, created_at) VALUES (?)`,
    [[uid, str(w.channel_id, 40) ?? 'bkash', int(w.amount), str(w.account_no, 64) ?? '', reqState(w.state),
      w.admin_note ?? null, ts(w.reviewed_at), int(w.charge_amount), str(w.charge_channel_id, 40),
      str(w.charge_account_no, 64), trx, ts(w.charge_paid_at),
      // rows from before migration 014 took their money when raised
      w.debited === undefined || w.debited === null ? 1 : bool(w.debited) ? 1 : 0,
      ts(w.created_at) ?? new Date()]]);
    wdMap.set(String(w.id), r.insertId);
    if (trx) await q("INSERT IGNORE INTO txn_claims (norm, source, ref_id) VALUES (?, 'charge', ?)", [trx, r.insertId]);
    stats.rows += 1;
  }

  if (withLedger) {
    // ledger refs name the request; the requests have new ids here
    const refOf = (ref) => {
      if (!ref) return null;
      let m = /^(deposit|deposit-bonus):(\d+)$/.exec(ref);
      if (m && depMap.has(m[2])) return `${m[1]}:${depMap.get(m[2])}`;
      m = /^withdraw:(refund:)?(\d+)$/.exec(ref);
      if (m && wdMap.has(m[2])) return `withdraw:${m[1] ?? ''}${wdMap.get(m[2])}`;
      return String(ref).slice(0, 191);
    };
    for (const t of ledger.get(sid) ?? []) {
      try {
        await q('INSERT INTO transactions (user_id, kind, amount, balance_after, ref, created_at) VALUES (?)',
          [[uid, KINDS.has(t.kind) ? t.kind : 'adjust', int(t.amount), int(t.balance_after), refOf(t.ref),
            ts(t.created_at) ?? new Date()]]);
        stats.rows += 1;
      } catch (e) {
        if (e.code !== 'ER_DUP_ENTRY') throw e; // a once-only claim already recorded
      }
    }
  }

  for (const a of payouts.get(sid) ?? []) {
    await q('INSERT IGNORE INTO payout_accounts (user_id, channel_id, account_no, holder, created_at) VALUES (?)',
      [[uid, str(a.channel_id, 40) ?? 'bkash', str(a.account_no, 64) ?? '', str(a.holder, 120) ?? '',
        ts(a.created_at) ?? new Date()]]);
  }
  for (const a of appeals.get(sid) ?? []) {
    await q(`INSERT IGNORE INTO account_appeals (user_id, message, state, created_at, reviewed_at, reviewed_by, admin_note)
             VALUES (?)`,
    [[uid, str(a.message, 500) ?? '', ['pending', 'approved', 'rejected'].includes(a.state) ? a.state : 'rejected',
      ts(a.created_at) ?? new Date(), ts(a.reviewed_at), str(a.reviewed_by, 120), str(a.admin_note, 500)]]);
  }
  const txnHash = String(security.get(sid)?.[0]?.txn_password ?? '').trim();
  if (txnHash) {
    // a fund password set here since the move stays
    await q('INSERT IGNORE INTO security_settings (user_id, txn_password) VALUES (?, ?)', [uid, txnHash]);
  }
}

async function importNew({ p, phone, wallet: w }) {
  const sid = String(p.id);
  const created = ts(p.created_at) ?? new Date();
  const res = await q('INSERT INTO users (phone, password_hash, legacy_id, created_at) VALUES (?, ?, ?, ?)',
    [phone, logins.get(sid) ?? '', sid, created]);
  const uid = String(res.insertId);

  let playerNo = int(p.player_no) || null;
  if (playerNo) await freeNumber(playerNo, uid);
  else playerNo = await nextNo();

  let code = str(p.referral_code, 32)?.toLowerCase() ?? null;
  if (!code || (await q('SELECT 1 AS x FROM profiles WHERE referral_code = ?', [code])).length) {
    code = randomBytes(4).toString('hex');
  }

  await q(`INSERT INTO profiles (id, user_id, username, phone, display_name, role, vip_level, referral_code, agent_code,
      player_no, is_blocked, is_held, hold_reason, block_reason, status_changed_at, status_changed_by,
      withdraw_locked, lock_reason, locked_at, locked_by, real_name, facebook_id, google_id, whatsapp, email,
      contact_phone, created_at) VALUES (?)`,
  [[uid, uid, phone, phone, str(p.display_name, 120), 'player', int(p.vip_level), code, str(p.agent_code, 32),
    playerNo, bool(p.is_blocked), bool(p.is_held), str(p.hold_reason, 255), str(p.block_reason, 255),
    ts(p.status_changed_at), str(p.status_changed_by, 120), bool(p.withdraw_locked), str(p.lock_reason, 255),
    ts(p.locked_at), str(p.locked_by, 120), str(p.real_name, 120), str(p.facebook_id, 255), str(p.google_id, 255),
    str(p.whatsapp, 40), str(p.email, 255), str(p.contact_phone, 40), created]]);

  await q('INSERT INTO wallets (user_id, balance, bonus_balance, turnover_need, turnover_done) VALUES (?, ?, ?, ?, ?)',
    [res.insertId, int(w.balance), int(w.bonus_balance), int(w.turnover_need), int(w.turnover_done)]);

  if (Number.isFinite(HOLD_OVER) && int(w.balance) > HOLD_OVER) {
    await q(`UPDATE profiles SET is_held = 1, hold_reason = 'Imported balance under review',
             status_changed_at = NOW(3), status_changed_by = 'import' WHERE id = ?`, [uid]);
  }

  await bringHistory(sid, uid, true);
  await q("INSERT INTO import_map (source_id, target_id, mode) VALUES (?, ?, 'new')", [sid, uid]);
  mapped.set(sid, uid);
  stats.imported += 1;
}

async function importMerged({ p, phone, wallet: w, target }) {
  const sid = String(p.id);
  const uid = String(target);

  let [mine] = await q('SELECT balance, turnover_need, turnover_done FROM wallets WHERE user_id = ? FOR UPDATE', [uid]);
  if (!mine) {
    await q('INSERT INTO wallets (user_id) VALUES (?)', [uid]);
    mine = { balance: 0, turnover_need: 0, turnover_done: 0 };
  }
  const add = int(w.balance);
  const next = Number(mine.balance) + add;
  // bonus turnover still owed on Supabase stays owed here
  const owed = Math.max(0, int(w.turnover_need) - int(w.turnover_done));
  const need = Number(mine.turnover_need);
  const done = Number(mine.turnover_done);
  const met = done >= need;
  await q('UPDATE wallets SET balance = ?, turnover_need = ?, turnover_done = ? WHERE user_id = ?',
    [next, owed ? (met ? owed : need + owed) : need, owed && met ? 0 : done, uid]);
  if (add !== 0) {
    await q("INSERT INTO transactions (user_id, kind, amount, balance_after, ref) VALUES (?, 'adjust', ?, ?, 'import:supabase')",
      [uid, add, next]);
  }

  // the player keeps the ID they had on Supabase
  if (int(p.player_no)) {
    await freeNumber(int(p.player_no), uid);
    await q('UPDATE profiles SET player_no = ? WHERE id = ?', [int(p.player_no), uid]);
  }
  await q(`UPDATE profiles SET
      display_name = COALESCE(display_name, ?), real_name = COALESCE(real_name, ?),
      facebook_id = COALESCE(facebook_id, ?), google_id = COALESCE(google_id, ?), whatsapp = COALESCE(whatsapp, ?),
      email = COALESCE(email, ?), contact_phone = COALESCE(contact_phone, ?), agent_code = COALESCE(agent_code, ?),
      is_blocked = (is_blocked OR ?), block_reason = COALESCE(block_reason, ?),
      is_held = (is_held OR ?), hold_reason = COALESCE(hold_reason, ?),
      withdraw_locked = (withdraw_locked OR ?), lock_reason = COALESCE(lock_reason, ?),
      locked_at = COALESCE(locked_at, ?), locked_by = COALESCE(locked_by, ?)
    WHERE id = ?`,
  [str(p.display_name, 120), str(p.real_name, 120), str(p.facebook_id, 255), str(p.google_id, 255),
    str(p.whatsapp, 40), str(p.email, 255), str(p.contact_phone, 40), str(p.agent_code, 32),
    bool(p.is_blocked), str(p.block_reason, 255), bool(p.is_held), str(p.hold_reason, 255),
    bool(p.withdraw_locked), bool(p.withdraw_locked) ? str(p.lock_reason, 255) : null,
    bool(p.withdraw_locked) ? ts(p.locked_at) : null, bool(p.withdraw_locked) ? str(p.locked_by, 120) : null, uid]);
  await q('UPDATE users SET legacy_id = COALESCE(legacy_id, ?) WHERE id = ?', [sid, uid]);
  if (Number.isFinite(HOLD_OVER) && add > HOLD_OVER) {
    await q(`UPDATE profiles SET is_held = 1, hold_reason = COALESCE(hold_reason, 'Imported balance under review'),
             status_changed_at = NOW(3), status_changed_by = 'import' WHERE id = ?`, [uid]);
  }

  await bringHistory(sid, uid, false);
  await q("INSERT INTO import_map (source_id, target_id, mode) VALUES (?, ?, 'merged')", [sid, uid]);
  mapped.set(sid, uid);
  stats.merged += 1;
}

for (const item of plan) {
  await db.beginTransaction();
  try {
    if (item.mode === 'new') await importNew(item);
    else await importMerged(item);
    await db.commit();
  } catch (e) {
    await db.rollback();
    stats.failed += 1;
    console.error(`  ✗ ${mask(item.phone)}: ${e.message}`);
  }
}

// who invited whom, now that everybody has an id here
for (const p of profiles) {
  const me = mapped.get(String(p.id));
  const inviter = p.referred_by ? mapped.get(String(p.referred_by)) : null;
  if (me && inviter) await q('UPDATE profiles SET referred_by = COALESCE(referred_by, ?) WHERE id = ?', [inviter, me]);
}
await q(`UPDATE counters SET v = GREATEST(v, (SELECT COALESCE(MAX(player_no), 0) FROM profiles))
         WHERE name = 'player_no'`);

console.log(`
Imported new:     ${stats.imported}
Merged:           ${stats.merged}
Failed:           ${stats.failed}${stats.failed ? '  (run again to retry them)' : ''}
History rows:     ${stats.rows}
New IDs given:    ${stats.renumbered}`);
await db.end();
process.exit(stats.failed ? 1 : 0);
