/* ============================================================
   Running a builder spec (lib/db/builder.ts) against MySQL.

   Trusted: this is what server code gets from adminClient(). The one
   thing it guards on its own behalf is the SQL text — table and column
   names must be plain identifiers, and every value is a parameter — so
   nothing a caller passes through can become SQL. Which rows a player
   may touch is decided before this, in lib/db/policy.ts.

   Supported, because the app uses it: select lists with PostgREST-style
   embeds (`profiles!user_id (phone)`, `wallets (balance)`), eq/neq/in/
   gt/gte/lt/lte/is/like/ilike, `.or('a.eq.1,b.ilike.%x%')`, order,
   limit, `{ count: 'exact', head: true }`, insert, update and delete.
   ============================================================ */

import type { Filter, FilterOp, QueryResult, QuerySpec } from './builder';
import { toDbError } from './errors';
import { rows, withConn, write, type Conn, type Row } from './pool';

const IDENT = /^[a-z_][a-z0-9_]*$/;

const qi = (name: string) => {
  if (!IDENT.test(name)) throw new Error(`invalid identifier "${name}"`);
  return `\`${name}\``;
};

type Embed = { table: string; local: string; foreign: string; cols: string[] };

/** Split on commas that are not inside brackets. */
function splitTop(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of text) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

function parseSelect(columns: string | null): { cols: string[] | '*'; embeds: Embed[] } {
  const items = splitTop(columns ?? '*');
  const embeds: Embed[] = [];
  const cols: string[] = [];
  let star = false;
  for (const item of items) {
    const embed = /^([a-z_][a-z0-9_]*)(?:!([a-z_][a-z0-9_]*))?\s*\(([^)]*)\)$/s.exec(item);
    if (embed) {
      // `profiles!user_id (…)`: this row's user_id is the profile's id.
      // `wallets (…)` from a profile: the wallet's user_id is this row's id.
      embeds.push({
        table: embed[1],
        local: embed[2] ?? 'id',
        foreign: embed[2] ? 'id' : 'user_id',
        cols: splitTop(embed[3]).map((c) => { qi(c); return c; }),
      });
    } else if (item === '*') {
      star = true;
    } else {
      qi(item);
      cols.push(item);
    }
  }
  return { cols: star || cols.length === 0 ? '*' : cols, embeds };
}

function cond(f: Filter, params: unknown[]): string {
  const col = qi(f.col);
  const v = f.value;
  switch (f.op) {
    case 'eq':
      if (v === null) return `${col} IS NULL`;
      params.push(v);
      return `${col} = ?`;
    case 'neq':
      if (v === null) return `${col} IS NOT NULL`;
      params.push(v);
      return `(${col} <> ? OR ${col} IS NULL)`;
    case 'gt': params.push(v); return `${col} > ?`;
    case 'gte': params.push(v); return `${col} >= ?`;
    case 'lt': params.push(v); return `${col} < ?`;
    case 'lte': params.push(v); return `${col} <= ?`;
    case 'in': {
      const list = Array.isArray(v) ? v : [];
      if (list.length === 0) return '1 = 0';
      params.push(list);
      return `${col} IN (?)`;
    }
    case 'is':
      if (v === null || v === 'null') return `${col} IS NULL`;
      return v === true || v === 'true' ? `${col} = 1` : `${col} = 0`;
    case 'like':
    case 'ilike':
      params.push(String(v));
      return `${col} LIKE ?`;
    default:
      throw new Error(`unsupported filter "${String(f.op)}"`);
  }
}

const OR_PART = /^([a-z_][a-z0-9_]*)\.(eq|neq|gt|gte|lt|lte|like|ilike|is|in)\.(.*)$/s;

/** `a.eq.1,b.in.(x,y),c.is.null` → one bracketed OR. */
function orGroup(expr: string, params: unknown[]): string {
  const parts = splitTop(expr).map((part) => {
    const m = OR_PART.exec(part);
    if (!m) throw new Error(`unsupported or() filter "${part}"`);
    const op = m[2] as FilterOp;
    let value: unknown = m[3];
    if (op === 'in') value = m[3].replace(/^\(|\)$/g, '').split(',').map((s) => s.trim()).filter(Boolean);
    if (op === 'is') value = m[3] === 'null' ? null : m[3] === 'true';
    return cond({ col: m[1], op, value }, params);
  });
  return parts.length ? `(${parts.join(' OR ')})` : '1 = 1';
}

function whereOf(spec: QuerySpec, params: unknown[]): string {
  const parts = [
    ...spec.filters.map((f) => cond(f, params)),
    ...spec.or.map((expr) => orGroup(expr, params)),
  ];
  return parts.length ? ` WHERE ${parts.join(' AND ')}` : '';
}

async function attach(c: Conn, data: Row[], embeds: Embed[]) {
  for (const e of embeds) {
    const keys = [...new Set(data.map((r) => r[e.local]).filter((k) => k !== null && k !== undefined).map(String))];
    const found = new Map<string, Row>();
    if (keys.length) {
      const want = e.cols.includes(e.foreign) ? e.cols : [...e.cols, e.foreign];
      const hits = await rows(c,
        `SELECT ${want.map(qi).join(', ')} FROM ${qi(e.table)} WHERE ${qi(e.foreign)} IN (?)`, [keys]);
      for (const hit of hits) {
        const key = String(hit[e.foreign]);
        if (!found.has(key)) {
          if (!e.cols.includes(e.foreign)) delete hit[e.foreign];
          found.set(key, hit);
        }
      }
    }
    for (const r of data) r[e.table] = found.get(String(r[e.local])) ?? null;
  }
}

async function select(c: Conn, spec: QuerySpec): Promise<QueryResult> {
  const table = qi(spec.table);
  const { cols, embeds } = parseSelect(spec.columns);

  let count: number | null = null;
  if (spec.count) {
    const params: unknown[] = [];
    const hit = await rows(c, `SELECT COUNT(*) AS n FROM ${table}${whereOf(spec, params)}`, params);
    count = Number(hit[0]?.n ?? 0);
    if (spec.head) return { data: null, error: null, count };
  }

  // an embed needs its key column even when the caller did not ask for it
  const extra = cols === '*' ? [] : embeds.map((e) => e.local).filter((k) => !cols.includes(k));
  const list = cols === '*' ? '*' : [...cols, ...new Set(extra)].map(qi).join(', ');

  const params: unknown[] = [];
  let sql = `SELECT ${list} FROM ${table}${whereOf(spec, params)}`;
  if (spec.order.length) sql += ` ORDER BY ${spec.order.map((o) => `${qi(o.col)} ${o.asc ? 'ASC' : 'DESC'}`).join(', ')}`;
  if (spec.limit !== null) sql += ` LIMIT ${Math.max(0, Math.min(10_000, Math.floor(Number(spec.limit) || 0)))}`;

  const data = await rows(c, sql, params);
  if (embeds.length) await attach(c, data, embeds);
  for (const key of new Set(extra)) for (const r of data) delete r[key];
  return { data, error: null, count };
}

function entries(payload: Record<string, unknown> | null) {
  return Object.entries(payload ?? {}).filter(([, v]) => v !== undefined);
}

async function insert(c: Conn, spec: QuerySpec): Promise<QueryResult> {
  const pairs = entries(spec.payload);
  if (!pairs.length) throw new Error('insert needs at least one column');
  const res = await write(c,
    `INSERT INTO ${qi(spec.table)} (${pairs.map(([k]) => qi(k)).join(', ')}) VALUES (?)`,
    [pairs.map(([, v]) => v)]);
  if (!spec.columns) return { data: null, error: null, count: null };
  const { cols } = parseSelect(spec.columns);
  const back = await rows(c,
    `SELECT ${cols === '*' ? '*' : cols.map(qi).join(', ')} FROM ${qi(spec.table)} WHERE id = ?`, [res.insertId]);
  return { data: back, error: null, count: null };
}

async function update(c: Conn, spec: QuerySpec): Promise<QueryResult> {
  const pairs = entries(spec.payload);
  if (!pairs.length) throw new Error('update needs at least one column');
  if (!spec.filters.length && !spec.or.length) throw new Error('update needs a filter');
  const params: unknown[] = pairs.map(([, v]) => v);
  const res = await write(c,
    `UPDATE ${qi(spec.table)} SET ${pairs.map(([k]) => `${qi(k)} = ?`).join(', ')}${whereOf(spec, params)}`, params);
  // what the caller reads back is how many rows it touched
  return {
    data: spec.columns ? Array.from({ length: res.affectedRows }, () => ({})) : null,
    error: null,
    count: res.affectedRows,
  };
}

async function remove(c: Conn, spec: QuerySpec): Promise<QueryResult> {
  if (!spec.filters.length && !spec.or.length) throw new Error('delete needs a filter');
  const params: unknown[] = [];
  const res = await write(c, `DELETE FROM ${qi(spec.table)}${whereOf(spec, params)}`, params);
  return { data: null, error: null, count: res.affectedRows };
}

export async function execSpec(spec: QuerySpec, conn?: Conn): Promise<QueryResult> {
  const go = (c: Conn) => {
    switch (spec.action) {
      case 'select': return select(c, spec);
      case 'insert': return insert(c, spec);
      case 'update': return update(c, spec);
      case 'delete': return remove(c, spec);
      default: throw new Error('unknown action');
    }
  };
  try {
    return await (conn ? go(conn) : withConn(go));
  } catch (e) {
    return { data: null, error: toDbError(e), count: null };
  }
}
