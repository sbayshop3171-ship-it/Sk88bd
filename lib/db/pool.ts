/* ============================================================
   The MySQL connection. Server-side only.

   Settings come from the environment: DB_HOST, DB_PORT, DB_USER (or
   DB_USERNAME), DB_PASSWORD, DB_NAME (or DB_DATABASE). Every
   connection runs in UTC, so a timestamp is the same instant whatever
   column type holds it, and rows come back the way the app always read
   them: times as ISO strings, TINYINT(1) flags as booleans, money
   (BIGINT paisa) as numbers.
   ============================================================ */

import mysql from 'mysql2/promise';
import type { Pool, PoolConnection } from 'mysql2/promise';
import { ensureSchema } from './schema';

export type Conn = PoolConnection;
export type Row = Record<string, unknown>;

const env = (...names: string[]) => {
  for (const name of names) {
    const value = process.env[name];
    if (value !== undefined && value !== '') return value;
  }
  return undefined;
};

/** Whether this server has a database to talk to at all. */
export const dbConfigured = () => Boolean(env('DB_NAME', 'DB_DATABASE', 'MYSQL_DATABASE'));

/* TINYINT(1) is how MySQL spells boolean. The screens test `row.debited ===
   true` and friends, so the flag has to arrive as one. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const typeCast = (field: any, next: () => unknown) => {
  if (field.type === 'TINY' && field.length === 1) {
    const value = field.string();
    return value === null ? null : value === '1';
  }
  return next();
};

type State = { pool: Pool; utc: WeakSet<object> };
const KEY = '__sk88bd_mysql__';
const holder = globalThis as typeof globalThis & { [KEY]?: State };

function state(): State {
  if (!holder[KEY]) {
    const pool = mysql.createPool({
      host: env('DB_HOST', 'MYSQL_HOST') ?? '127.0.0.1',
      port: Number(env('DB_PORT', 'MYSQL_PORT') ?? 3306),
      user: env('DB_USER', 'DB_USERNAME', 'MYSQL_USER') ?? 'root',
      password: env('DB_PASSWORD', 'MYSQL_PASSWORD') ?? '',
      database: env('DB_NAME', 'DB_DATABASE', 'MYSQL_DATABASE') ?? 'sk88bd',
      charset: 'utf8mb4',
      timezone: 'Z',
      decimalNumbers: true,
      supportBigNumbers: true,
      typeCast,
      waitForConnections: true,
      connectionLimit: 15,
      maxIdle: 5,
      idleTimeout: 60_000,
      enableKeepAlive: true,
    });
    holder[KEY] = { pool, utc: new WeakSet() };
  }
  return holder[KEY]!;
}

/** A pooled connection, switched to UTC the first time it is handed out.
    Callers release it; use withConn/tx rather than this where possible. */
export async function connect(): Promise<Conn> {
  const { pool, utc } = state();
  const c = await pool.getConnection();
  // the promise wrapper is new on every checkout; the socket underneath is not
  const socket = (c as unknown as { connection?: object }).connection ?? c;
  if (!utc.has(socket)) {
    // text the query makes itself (CAST, CONCAT) compares in the tables'
    // collation, not the driver's — MySQL 8 refuses to mix the two
    await c.query("SET time_zone = '+00:00', collation_connection = @@collation_database");
    utc.add(socket);
  }
  return c;
}

const ISO_INSTANT = /^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d+)?)?(Z|[+-]\d\d:?\d\d)$/;

/** MySQL does not read "…T…Z"; a Date it does, and mysql2 writes it in UTC. */
function param(value: unknown): unknown {
  if (typeof value === 'string' && ISO_INSTANT.test(value)) {
    const at = new Date(value);
    return Number.isNaN(at.getTime()) ? value : at;
  }
  if (Array.isArray(value)) return value.map(param);
  return value;
}

/** Rows with every Date turned into the ISO string the app compares on. */
export function tidy(result: unknown): Row[] {
  if (!Array.isArray(result)) return [];
  return result.map((row) => {
    const out: Row = {};
    for (const [key, value] of Object.entries(row as Row)) {
      out[key] = value instanceof Date ? value.toISOString() : value;
    }
    return out;
  });
}

export type WriteResult = { insertId: number; affectedRows: number };

/** One statement. Values always travel as parameters, never in the text. */
export async function run(c: Conn, sql: string, params: unknown[] = []): Promise<unknown> {
  const [result] = await c.query(sql, params.map(param));
  return result;
}

export async function write(c: Conn, sql: string, params: unknown[] = []): Promise<WriteResult> {
  return (await run(c, sql, params)) as WriteResult;
}

export async function rows(c: Conn, sql: string, params: unknown[] = []): Promise<Row[]> {
  return tidy(await run(c, sql, params));
}

export async function one(c: Conn, sql: string, params: unknown[] = []): Promise<Row | null> {
  return (await rows(c, sql, params))[0] ?? null;
}

/** A connection for the length of `fn`, after the schema is known to be
    current. */
export async function withConn<T>(fn: (c: Conn) => Promise<T>): Promise<T> {
  await ensureSchema();
  const c = await connect();
  try {
    return await fn(c);
  } finally {
    c.release();
  }
}

/** `fn` inside one transaction: everything it wrote lands, or none of it. */
export async function tx<T>(fn: (c: Conn) => Promise<T>): Promise<T> {
  return withConn(async (c) => {
    await c.beginTransaction();
    try {
      const out = await fn(c);
      await c.commit();
      return out;
    } catch (e) {
      try { await c.rollback(); } catch { /* the connection is gone; nothing to undo */ }
      throw e;
    }
  });
}
