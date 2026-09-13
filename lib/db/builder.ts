/* ============================================================
   The query builder both sides speak.

   Every screen and route was written against Supabase's chained
   builder — `.from('x').select('a, b').eq('id', 1).maybeSingle()` —
   so the MySQL move keeps that shape rather than rewriting forty call
   sites. The builder only records what was asked for; how it runs is
   the transport's business:

     • in the browser (lib/supabase.ts) the spec goes to /api/data/query,
       which checks it against the player's own rows (lib/db/policy.ts);
     • on the server (lib/db/server.ts) it runs straight against MySQL,
       trusted, because only server code can reach that client.

   No imports: this file is bundled into the browser.
   ============================================================ */

export type FilterOp = 'eq' | 'neq' | 'in' | 'gt' | 'gte' | 'lt' | 'lte' | 'is' | 'ilike' | 'like';

export type Filter = { col: string; op: FilterOp; value: unknown };

export type QuerySpec = {
  table: string;
  action: 'select' | 'insert' | 'update' | 'delete';
  /** the select list, or what to hand back after a write */
  columns: string | null;
  count: boolean;
  head: boolean;
  filters: Filter[];
  /** PostgREST-style `a.eq.1,b.ilike.%x%` groups — the trusted server only */
  or: string[];
  order: { col: string; asc: boolean }[];
  limit: number | null;
  payload: Record<string, unknown> | null;
};

export type DbError = { message: string; code?: string; hint?: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type QueryResult<T = any> = { data: T; error: DbError | null; count: number | null };

export type Transport = (spec: QuerySpec) => Promise<QueryResult>;

export class Query implements PromiseLike<QueryResult> {
  private spec: QuerySpec;
  private running: Promise<QueryResult> | null = null;

  constructor(table: string, private readonly transport: Transport) {
    this.spec = {
      table,
      action: 'select',
      columns: null,
      count: false,
      head: false,
      filters: [],
      or: [],
      order: [],
      limit: null,
      payload: null,
    };
  }

  /** At the head of a chain, the columns to read; after insert/update/delete,
      what to hand back. */
  select(columns = '*', opts?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) {
    this.spec.columns = columns;
    if (opts?.count) this.spec.count = true;
    if (opts?.head) this.spec.head = true;
    return this;
  }

  insert(row: Record<string, unknown>) {
    this.spec.action = 'insert';
    this.spec.payload = row;
    return this;
  }

  update(row: Record<string, unknown>) {
    this.spec.action = 'update';
    this.spec.payload = row;
    return this;
  }

  delete() {
    this.spec.action = 'delete';
    return this;
  }

  private where(col: string, op: FilterOp, value: unknown) {
    this.spec.filters.push({ col, op, value });
    return this;
  }

  eq(col: string, value: unknown) { return this.where(col, 'eq', value); }
  neq(col: string, value: unknown) { return this.where(col, 'neq', value); }
  in(col: string, values: readonly unknown[]) { return this.where(col, 'in', [...values]); }
  gt(col: string, value: unknown) { return this.where(col, 'gt', value); }
  gte(col: string, value: unknown) { return this.where(col, 'gte', value); }
  lt(col: string, value: unknown) { return this.where(col, 'lt', value); }
  lte(col: string, value: unknown) { return this.where(col, 'lte', value); }
  is(col: string, value: null | boolean) { return this.where(col, 'is', value); }
  ilike(col: string, pattern: string) { return this.where(col, 'ilike', pattern); }
  like(col: string, pattern: string) { return this.where(col, 'like', pattern); }

  or(filter: string) {
    this.spec.or.push(filter);
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.spec.order.push({ col, asc: opts?.ascending ?? true });
    return this;
  }

  limit(n: number) {
    this.spec.limit = n;
    return this;
  }

  private run(): Promise<QueryResult> {
    if (!this.running) {
      this.running = this.transport(this.spec).catch((e: unknown) => ({
        data: null,
        error: { message: e instanceof Error ? e.message : 'Database error' },
        count: null,
      }));
    }
    return this.running;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async maybeSingle<T = any>(): Promise<QueryResult<T | null>> {
    this.spec.limit = this.spec.limit ?? 1;
    const r = await this.run();
    const rows = Array.isArray(r.data) ? r.data : [];
    return { data: (r.error ? null : rows[0] ?? null) as T | null, error: r.error, count: r.count };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async single<T = any>(): Promise<QueryResult<T | null>> {
    const r = await this.maybeSingle<T>();
    if (!r.error && r.data === null) return { ...r, error: { message: 'no rows returned', code: 'PGRST116' } };
    return r;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  returns<T = any>(): PromiseLike<QueryResult<T>> {
    return this.run() as Promise<QueryResult<T>>;
  }

  then<R1 = QueryResult, R2 = never>(
    onfulfilled?: ((value: QueryResult) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): Promise<R1 | R2> {
    return this.run().then(onfulfilled, onrejected);
  }
}
