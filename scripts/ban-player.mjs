#!/usr/bin/env node
/* ============================================================
   Ban a player by their player ID, from the server — the same thing
   the Ban button at /admin/users does: the profile is marked banned,
   and every session the account has ends at once.

   Run in the app folder:
     node scripts/ban-player.mjs 100043                  shows the player, writes nothing
     node scripts/ban-player.mjs 100043 "reason" --apply bans them

   Reads the DB_* settings from the environment or .env.production.
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

for (const file of ['.env.production', '.env.local', '.env']) {
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) continue;
  for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
const env = (...names) => names.map((n) => process.env[n]).find(Boolean);

const args = process.argv.slice(2).filter((a) => a !== '--apply');
const APPLY = process.argv.includes('--apply');
const playerNo = Number(args[0]);
const reason = (args[1] ?? 'Banned by admin').slice(0, 255);
if (!Number.isInteger(playerNo) || playerNo <= 0) {
  console.error('Usage: node scripts/ban-player.mjs <player ID> ["reason"] [--apply]');
  process.exit(1);
}

const db = await mysql.createConnection({
  host: env('DB_HOST', 'MYSQL_HOST') ?? '127.0.0.1',
  port: Number(env('DB_PORT', 'MYSQL_PORT') ?? 3306),
  user: env('DB_USER', 'DB_USERNAME', 'MYSQL_USER') ?? 'root',
  password: env('DB_PASSWORD', 'MYSQL_PASSWORD') ?? '',
  database: env('DB_NAME', 'DB_DATABASE', 'MYSQL_DATABASE') ?? 'sk88bd',
  charset: 'utf8mb4',
  timezone: 'Z',
  decimalNumbers: true,
});
await db.query("SET time_zone = '+00:00', collation_connection = @@collation_database");
const q = async (sql, params = []) => (await db.query(sql, params))[0];

const [p] = await q('SELECT id, phone, is_blocked, block_reason FROM profiles WHERE player_no = ?', [playerNo]);
if (!p) {
  console.error(`No player with ID ${playerNo}.`);
  process.exit(1);
}
const uid = String(p.id);
const [w] = await q('SELECT balance FROM wallets WHERE user_id = ?', [uid]);
const [pending] = await q(
  "SELECT COUNT(*) AS n, COALESCE(SUM(amount), 0) AS total FROM withdrawals WHERE user_id = ? AND state = 'pending'", [uid]);
const phone = String(p.phone ?? '');
const taka = (paisa) => `৳${(Number(paisa) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

console.log(`Player ID ${playerNo}  ${phone.slice(0, 3)}*****${phone.slice(-3)}
  balance:             ${taka(w?.balance ?? 0)}
  already banned:      ${p.is_blocked ? `yes (${p.block_reason ?? 'no reason'})` : 'no'}
  pending withdrawals: ${Number(pending.n)} (${taka(pending.total)}) — reject these at /admin/withdrawals`);

if (!APPLY) {
  console.log('\nNothing written. Add --apply to ban.');
  await db.end();
  process.exit(0);
}

await q(`UPDATE profiles SET is_blocked = 1, block_reason = ?, status_changed_at = NOW(3), status_changed_by = 'server-script'
         WHERE id = ?`, [reason, uid]);
// every session the account has ends now, as the admin panel's ban does
await q('UPDATE users SET session_version = session_version + 1 WHERE id = ?', [uid]);
const [after] = await q('SELECT is_blocked, block_reason FROM profiles WHERE id = ?', [uid]);
console.log(`\nBanned: ${after.is_blocked ? 'yes' : 'NO'} — "${after.block_reason}". Their sessions are ended.`);
await db.end();
