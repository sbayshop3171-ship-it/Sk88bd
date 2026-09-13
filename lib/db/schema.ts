/* ============================================================
   The database's shape, brought up to date on first use.

   There is no one to run migrations by hand on this server, so the app
   does it: the first query after a start runs every step below that
   `schema_migrations` has not recorded, under a named lock so two
   workers cannot race. Each step is written to be safe to repeat — a
   step that dies half way is simply run again next start.

   The first step also repairs what the 2026-09-13 MySQL move left
   behind: deposits and withdrawals were keyed by a VARCHAR nobody
   filled in (so every deposit insert failed), and the ledger, payout
   wallets, appeals and password tables were never created. A table
   whose key cannot be altered in place is renamed `<name>_legacy` and
   its rows copied into the new one; the old table is kept, not dropped.
   ============================================================ */

import { randomBytes } from 'node:crypto';
import { connect, one, rows, run, type Conn } from './pool';

const TABLE = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';

let ready: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = migrate().catch((e) => {
      ready = null; // try again on the next request rather than never
      throw e;
    });
  }
  return ready;
}

type Step = { id: string; up: (c: Conn) => Promise<void> };

async function migrate() {
  const c = await connect();
  try {
    await run(c, "SELECT GET_LOCK('sk88bd_schema', 60)");
    await run(c, `CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ${TABLE}`);
    const done = new Set((await rows(c, 'SELECT id FROM schema_migrations')).map((r) => String(r.id)));
    for (const step of STEPS) {
      if (done.has(step.id)) continue;
      await step.up(c);
      await run(c, 'INSERT IGNORE INTO schema_migrations (id) VALUES (?)', [step.id]);
      console.log(`[db] schema step ${step.id} applied`);
    }
  } finally {
    try { await run(c, "SELECT RELEASE_LOCK('sk88bd_schema')"); } catch { /* released with the session */ }
    c.release();
  }
}

/* ------------------------------------------------------------ helpers ---- */

async function tableExists(c: Conn, table: string) {
  return Boolean(await one(c,
    'SELECT 1 AS x FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [table]));
}

async function columnType(c: Conn, table: string, column: string): Promise<string | null> {
  const row = await one(c,
    'SELECT DATA_TYPE AS t FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [table, column]);
  return row ? String(row.t).toLowerCase() : null;
}

async function addColumn(c: Conn, table: string, column: string, definition: string) {
  if (await columnType(c, table, column) === null) {
    await run(c, `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

async function indexExists(c: Conn, table: string, name: string) {
  return Boolean(await one(c,
    'SELECT 1 AS x FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1',
    [table, name]));
}

async function addIndex(c: Conn, table: string, name: string, definition: string) {
  if (!(await indexExists(c, table, name))) await run(c, `ALTER TABLE \`${table}\` ADD ${definition}`);
}

/** Move a table out of the way under a name nothing else uses. */
async function setAside(c: Conn, table: string): Promise<string> {
  let name = `${table}_legacy`;
  for (let n = 2; await tableExists(c, name); n += 1) name = `${table}_legacy${n}`;
  await run(c, `RENAME TABLE \`${table}\` TO \`${name}\``);
  console.warn(`[db] ${table} had an unusable shape; kept as ${name}, rows copied over`);
  return name;
}

async function columnsOf(c: Conn, table: string): Promise<Set<string>> {
  const found = await rows(c,
    'SELECT COLUMN_NAME AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [table]);
  return new Set(found.map((r) => String(r.n)));
}

/** A column of the legacy table if it has it, a fallback expression if not. */
const pick = (cols: Set<string>, name: string, fallback: string) => (cols.has(name) ? `\`${name}\`` : fallback);

const NORM_SQL = (expr: string) => `NULLIF(UPPER(REGEXP_REPLACE(COALESCE(${expr}, ''), '[^A-Za-z0-9]', '')), '')`;

/* -------------------------------------------------------------- steps ---- */

const STEPS: Step[] = [
  {
    id: '2026-09-13-base',
    async up(c) {
      /* ---------- accounts ---------- */
      await run(c, `CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        phone VARCHAR(15) NOT NULL,
        password_hash VARCHAR(255) NOT NULL DEFAULT '',
        session_version INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_users_phone (phone)
      ) ${TABLE}`);
      await addColumn(c, 'users', 'session_version', 'INT NOT NULL DEFAULT 0');

      await run(c, `CREATE TABLE IF NOT EXISTS profiles (
        id VARCHAR(64) NOT NULL,
        user_id VARCHAR(64) NULL,
        username VARCHAR(255) NULL,
        phone VARCHAR(20) NULL,
        display_name VARCHAR(120) NULL,
        role ENUM('player','agent','admin') NOT NULL DEFAULT 'player',
        vip_level INT NOT NULL DEFAULT 0,
        referral_code VARCHAR(32) NULL,
        agent_code VARCHAR(32) NULL,
        player_no BIGINT UNSIGNED NULL,
        is_blocked TINYINT(1) NOT NULL DEFAULT 0,
        is_held TINYINT(1) NOT NULL DEFAULT 0,
        hold_reason VARCHAR(255) NULL,
        block_reason VARCHAR(255) NULL,
        withdraw_locked TINYINT(1) NOT NULL DEFAULT 0,
        lock_reason VARCHAR(255) NULL,
        locked_at DATETIME(3) NULL,
        locked_by VARCHAR(120) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_profiles_player_no (player_no),
        KEY idx_profiles_phone (phone),
        KEY idx_profiles_agent_code (agent_code)
      ) ${TABLE}`);
      for (const [column, definition] of [
        ['user_id', 'VARCHAR(64) NULL'],
        ['phone', 'VARCHAR(20) NULL'],
        ['display_name', 'VARCHAR(120) NULL'],
        ['role', "ENUM('player','agent','admin') NOT NULL DEFAULT 'player'"],
        ['vip_level', 'INT NOT NULL DEFAULT 0'],
        ['referral_code', 'VARCHAR(32) NULL'],
        ['referred_by', 'VARCHAR(64) NULL'],
        ['agent_code', 'VARCHAR(32) NULL'],
        ['player_no', 'BIGINT UNSIGNED NULL'],
        ['is_blocked', 'TINYINT(1) NOT NULL DEFAULT 0'],
        ['is_held', 'TINYINT(1) NOT NULL DEFAULT 0'],
        ['hold_reason', 'VARCHAR(255) NULL'],
        ['block_reason', 'VARCHAR(255) NULL'],
        ['status_changed_at', 'DATETIME(3) NULL'],
        ['status_changed_by', 'VARCHAR(120) NULL'],
        ['withdraw_locked', 'TINYINT(1) NOT NULL DEFAULT 0'],
        ['lock_reason', 'VARCHAR(255) NULL'],
        ['locked_at', 'DATETIME(3) NULL'],
        ['locked_by', 'VARCHAR(120) NULL'],
        ['real_name', 'VARCHAR(120) NULL'],
        ['facebook_id', 'VARCHAR(255) NULL'],
        ['google_id', 'VARCHAR(255) NULL'],
        ['whatsapp', 'VARCHAR(40) NULL'],
        ['email', 'VARCHAR(255) NULL'],
        ['contact_phone', 'VARCHAR(40) NULL'],
        ['created_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'],
      ] as const) {
        await addColumn(c, 'profiles', column, definition);
      }

      await run(c, `CREATE TABLE IF NOT EXISTS wallets (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        balance BIGINT NOT NULL DEFAULT 0,
        bonus_balance BIGINT NOT NULL DEFAULT 0,
        turnover_need BIGINT NOT NULL DEFAULT 0,
        turnover_done BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_wallets_user (user_id)
      ) ${TABLE}`);
      await addColumn(c, 'wallets', 'bonus_balance', 'BIGINT NOT NULL DEFAULT 0');
      await addColumn(c, 'wallets', 'turnover_need', 'BIGINT NOT NULL DEFAULT 0');
      await addColumn(c, 'wallets', 'turnover_done', 'BIGINT NOT NULL DEFAULT 0');

      // every login has a profile and a wallet, whichever code created it
      const haveProfile = new Set((await rows(c, 'SELECT id FROM profiles')).map((r) => String(r.id)));
      for (const u of await rows(c, 'SELECT id, phone FROM users')) {
        const id = String(u.id);
        if (haveProfile.has(id)) continue;
        await run(c, 'INSERT IGNORE INTO profiles (id, user_id, username, phone) VALUES (?, ?, ?, ?)',
          [id, id, u.phone, u.phone]);
      }
      await run(c, `INSERT IGNORE INTO wallets (user_id)
        SELECT u.id FROM users u WHERE NOT EXISTS (SELECT 1 FROM wallets w WHERE w.user_id = u.id)`);

      // referral codes: 8 hex, one per player
      for (const p of await rows(c, "SELECT id FROM profiles WHERE referral_code IS NULL OR referral_code = ''")) {
        await run(c, 'UPDATE profiles SET referral_code = ? WHERE id = ?', [randomBytes(4).toString('hex'), p.id]);
      }
      try {
        await addIndex(c, 'profiles', 'uq_profiles_referral', 'UNIQUE KEY uq_profiles_referral (referral_code)');
      } catch {
        await addIndex(c, 'profiles', 'idx_profiles_referral', 'KEY idx_profiles_referral (referral_code)');
      }

      // player IDs, in signup order, after any already handed out
      const top = await one(c, 'SELECT COALESCE(MAX(player_no), 100000) AS n FROM profiles');
      let next = Math.max(100000, Number(top?.n ?? 100000));
      for (const p of await rows(c, 'SELECT id FROM profiles WHERE player_no IS NULL ORDER BY created_at, id')) {
        next += 1;
        await run(c, 'UPDATE profiles SET player_no = ? WHERE id = ?', [next, p.id]);
      }
      await run(c, `CREATE TABLE IF NOT EXISTS counters (
        name VARCHAR(100) NOT NULL PRIMARY KEY,
        v BIGINT NOT NULL DEFAULT 0
      ) ${TABLE}`);
      await run(c, `INSERT INTO counters (name, v) VALUES ('player_no', ?)
        ON DUPLICATE KEY UPDATE v = GREATEST(v, VALUES(v))`, [next]);

      /* ---------- cashier ---------- */
      const depIdType = await columnType(c, 'deposits', 'id');
      const depLegacy = depIdType && depIdType !== 'bigint' ? await setAside(c, 'deposits') : null;
      await run(c, `CREATE TABLE IF NOT EXISTS deposits (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id VARCHAR(64) NOT NULL,
        channel_id VARCHAR(40) NOT NULL,
        method_id VARCHAR(64) NULL,
        amount BIGINT NOT NULL,
        bonus_amount BIGINT NOT NULL DEFAULT 0,
        sender_no VARCHAR(40) NULL,
        txn_id VARCHAR(64) NULL,
        state ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
        admin_note TEXT NULL,
        reviewed_by VARCHAR(120) NULL,
        reviewed_at DATETIME(3) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        KEY idx_deposits_state (state, created_at),
        KEY idx_deposits_user (user_id, created_at),
        KEY idx_deposits_txn (txn_id)
      ) ${TABLE}`);
      if (depLegacy) {
        const cols = await columnsOf(c, depLegacy);
        await run(c, `INSERT INTO deposits (user_id, channel_id, amount, sender_no, txn_id, state, admin_note, reviewed_at, created_at)
          SELECT user_id,
                 COALESCE(NULLIF(${pick(cols, 'channel_id', 'NULL')}, ''), NULLIF(${pick(cols, 'method', 'NULL')}, ''), 'bkash'),
                 ROUND(amount),
                 ${pick(cols, 'sender_no', 'NULL')},
                 ${NORM_SQL(pick(cols, 'txn_id', 'NULL'))},
                 ${pick(cols, 'state', "'pending'")},
                 ${pick(cols, 'admin_note', 'NULL')},
                 ${pick(cols, 'reviewed_at', 'NULL')},
                 ${pick(cols, 'created_at', 'CURRENT_TIMESTAMP(3)')}
          FROM \`${depLegacy}\` ORDER BY ${pick(cols, 'created_at', '1')}`);
      }

      const wdIdType = await columnType(c, 'withdrawals', 'id');
      const wdLegacy = wdIdType && wdIdType !== 'bigint' ? await setAside(c, 'withdrawals') : null;
      await run(c, `CREATE TABLE IF NOT EXISTS withdrawals (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id VARCHAR(64) NOT NULL,
        channel_id VARCHAR(40) NOT NULL,
        amount BIGINT NOT NULL,
        account_no VARCHAR(64) NOT NULL DEFAULT '',
        state ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
        admin_note TEXT NULL,
        reviewed_by VARCHAR(120) NULL,
        reviewed_at DATETIME(3) NULL,
        charge_amount BIGINT NOT NULL DEFAULT 0,
        charge_channel_id VARCHAR(40) NULL,
        charge_account_no VARCHAR(64) NULL,
        charge_trx_id VARCHAR(64) NULL,
        charge_paid_at DATETIME(3) NULL,
        debited TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        KEY idx_withdrawals_state (state, created_at),
        KEY idx_withdrawals_user (user_id, created_at),
        KEY idx_withdrawals_charge_txn (charge_trx_id)
      ) ${TABLE}`);
      if (wdLegacy) {
        const cols = await columnsOf(c, wdLegacy);
        await run(c, `INSERT INTO withdrawals (user_id, channel_id, amount, account_no, state, admin_note, reviewed_at,
            charge_amount, charge_channel_id, charge_account_no, charge_trx_id, charge_paid_at, debited, created_at)
          SELECT user_id,
                 COALESCE(NULLIF(${pick(cols, 'channel_id', 'NULL')}, ''), NULLIF(${pick(cols, 'method', 'NULL')}, ''), 'bkash'),
                 ROUND(amount),
                 COALESCE(${pick(cols, 'account_no', 'NULL')}, ''),
                 ${pick(cols, 'state', "'pending'")},
                 ${pick(cols, 'admin_note', 'NULL')},
                 ${pick(cols, 'reviewed_at', 'NULL')},
                 ROUND(COALESCE(${pick(cols, 'charge_amount', '0')}, 0)),
                 ${pick(cols, 'charge_channel_id', 'NULL')},
                 ${pick(cols, 'charge_account_no', 'NULL')},
                 ${NORM_SQL(pick(cols, 'charge_trx_id', 'NULL'))},
                 ${pick(cols, 'charge_paid_at', 'NULL')},
                 0,
                 ${pick(cols, 'created_at', 'CURRENT_TIMESTAMP(3)')}
          FROM \`${wdLegacy}\` ORDER BY ${pick(cols, 'created_at', '1')}`);
      }

      /* ---------- the ledger ---------- */
      if (await tableExists(c, 'transactions') && await columnType(c, 'transactions', 'kind') === null) {
        await setAside(c, 'transactions');
      }
      /* claim_ref is the ref of a once-only payout (sign-in, rebate, promo,
         a deposit's bonus…) and null for everything else, so the unique key
         on it is the "cannot be paid twice" guard, however the requests race */
      await run(c, `CREATE TABLE IF NOT EXISTS transactions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id VARCHAR(64) NOT NULL,
        kind ENUM('deposit','withdraw','bet','win','bonus','rebate','adjust') NOT NULL,
        amount BIGINT NOT NULL,
        balance_after BIGINT NOT NULL,
        ref VARCHAR(191) NULL,
        claim_ref VARCHAR(191) GENERATED ALWAYS AS (CASE
          WHEN ref LIKE 'signin:%' OR ref LIKE 'rescue:%' OR ref LIKE 'rebate:%' OR ref LIKE 'promo:%'
            OR ref LIKE 'spin:%' OR ref LIKE 'mission:%' OR ref LIKE 'deposit-bonus:%' THEN ref
          ELSE NULL END) STORED,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        KEY idx_transactions_user (user_id, created_at),
        KEY idx_transactions_user_kind (user_id, kind),
        KEY idx_transactions_ref (ref),
        UNIQUE KEY uq_transactions_claim (user_id, claim_ref)
      ) ${TABLE}`);

      /* ---------- player-side tables ---------- */
      await run(c, `CREATE TABLE IF NOT EXISTS payout_accounts (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id VARCHAR(64) NOT NULL,
        channel_id VARCHAR(40) NOT NULL,
        account_no VARCHAR(64) NOT NULL,
        holder VARCHAR(120) NOT NULL DEFAULT '',
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        UNIQUE KEY uq_payout_accounts (user_id, channel_id, account_no)
      ) ${TABLE}`);

      await run(c, `CREATE TABLE IF NOT EXISTS account_appeals (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id VARCHAR(64) NOT NULL,
        message VARCHAR(500) NOT NULL,
        state ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        pending_user VARCHAR(64) GENERATED ALWAYS AS (CASE WHEN state = 'pending' THEN user_id ELSE NULL END) STORED,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        reviewed_at DATETIME(3) NULL,
        reviewed_by VARCHAR(120) NULL,
        admin_note VARCHAR(500) NULL,
        PRIMARY KEY (id),
        KEY idx_account_appeals_user (user_id, created_at),
        UNIQUE KEY uq_account_appeals_pending (pending_user)
      ) ${TABLE}`);

      await run(c, `CREATE TABLE IF NOT EXISTS security_settings (
        user_id VARCHAR(64) NOT NULL PRIMARY KEY,
        txn_password VARCHAR(255) NULL,
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ${TABLE}`);

      await run(c, `CREATE TABLE IF NOT EXISTS security_attempts (
        user_id VARCHAR(100) NOT NULL PRIMARY KEY,
        fails INT NOT NULL DEFAULT 0,
        locked_until DATETIME(3) NULL,
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ${TABLE}`);

      await run(c, `CREATE TABLE IF NOT EXISTS login_attempts (
        k VARCHAR(100) NOT NULL PRIMARY KEY,
        fails INT NOT NULL DEFAULT 0,
        locked_until DATETIME(3) NULL,
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ${TABLE}`);

      /* ---------- one TrxID, one payment ----------
         Every deposit TrxID and withdrawal-charge TrxID, normalised, as a
         primary key: a second claim on the same ID is a duplicate-key error
         inside the claiming transaction, so two requests cannot both pass. */
      await run(c, `CREATE TABLE IF NOT EXISTS txn_claims (
        norm VARCHAR(64) NOT NULL PRIMARY KEY,
        source ENUM('deposit','charge') NOT NULL,
        ref_id BIGINT UNSIGNED NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ${TABLE}`);
      await run(c, `INSERT IGNORE INTO txn_claims (norm, source, ref_id)
        SELECT ${NORM_SQL('txn_id')}, 'deposit', id FROM deposits WHERE ${NORM_SQL('txn_id')} IS NOT NULL`);
      await run(c, `INSERT IGNORE INTO txn_claims (norm, source, ref_id)
        SELECT ${NORM_SQL('charge_trx_id')}, 'charge', id FROM withdrawals WHERE ${NORM_SQL('charge_trx_id')} IS NOT NULL`);
    },
  },
];
