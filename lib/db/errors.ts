/** A refusal the money code raises on purpose. The messages are the ones the
    Postgres functions used to raise ("account locked", "txn used",
    "turnover left 1234"…), because every route and screen already matches on
    them to tell the player what happened. `code` keeps the Postgres error
    code where a caller checks it ('23505' = already done). */
export class DbFail extends Error {
  constructor(message: string, readonly code = 'P0001', readonly hint?: string) {
    super(message);
    this.name = 'DbFail';
  }
}

export type DbErrorShape = { message: string; code?: string; hint?: string };

/** Any thrown error, as the `{ message, code }` the old client returned. */
export function toDbError(e: unknown): DbErrorShape {
  if (e instanceof DbFail) return { message: e.message, code: e.code, hint: e.hint };
  const err = (e ?? {}) as { code?: string; sqlMessage?: string; message?: string };
  if (err.code === 'ER_DUP_ENTRY') {
    return { message: `duplicate key value violates unique constraint (${err.sqlMessage ?? ''})`, code: '23505' };
  }
  if (err.code === 'ER_BAD_FIELD_ERROR') {
    return { message: `column does not exist: ${err.sqlMessage ?? ''}`, code: '42703' };
  }
  if (err.code === 'ER_NO_SUCH_TABLE') {
    return { message: `relation does not exist: ${err.sqlMessage ?? ''}`, code: '42P01' };
  }
  return { message: err.sqlMessage || err.message || 'Database error', code: err.code };
}
