/* ============================================================
   The database client for server code.

   Shaped like the Supabase client it replaces, so the cashier, bonus,
   game and admin code kept their calls: `.from()` runs a builder spec
   straight against MySQL (lib/db/exec.ts), `.rpc()` runs the money
   functions (lib/db/rpc.ts), and `.auth.getUser()` reads the player
   from the signed session cookie. Never import this from a component
   that runs in the browser.
   ============================================================ */

import { endSessions } from './accounts';
import { Query, type DbError } from './builder';
import { execSpec } from './exec';
import { dbConfigured } from './pool';
import { callRpc } from './rpc';
import { SESSION_COOKIE, userFromToken } from './session';

type CookieStore = {
  getAll: () => { name: string; value: string }[];
  setAll?: (list: { name: string; value: string; options?: object }[]) => void;
};

function makeClient(store: CookieStore | null) {
  return {
    from: (table: string) => new Query(table, (spec) => execSpec(spec)),
    rpc: (fn: string, args: Record<string, unknown> = {}) => callRpc(fn, args),
    auth: {
      async getUser() {
        let token: string | undefined;
        if (store) {
          token = store.getAll().find((c) => c.name === SESSION_COOKIE)?.value;
        } else {
          const { cookies } = await import('next/headers');
          token = (await cookies()).get(SESSION_COOKIE)?.value;
        }
        const user = await userFromToken(token).catch(() => null);
        return {
          data: { user: user ? { id: user.id, email: user.email, created_at: user.created_at } : null },
          error: null,
        };
      },
      admin: {
        /** A ban (or a password set by staff) ends the player's sessions. */
        async updateUserById(userId: string, attrs: Record<string, unknown>): Promise<{ data: null; error: DbError | null }> {
          try {
            if ('ban_duration' in attrs || 'password' in attrs) await endSessions(userId);
            return { data: null, error: null };
          } catch (e) {
            return { data: null, error: { message: e instanceof Error ? e.message : 'Database error' } };
          }
        },
      },
    },
  };
}

export type Db = ReturnType<typeof makeClient>;

/** Full access, for code that has already checked who is asking. */
export function adminClient(): Db | null {
  return dbConfigured() ? makeClient(null) : null;
}

/** The same client, reading the player from these cookies. */
export function serverClient(store?: CookieStore): Db | null {
  return dbConfigured() ? makeClient(store ?? null) : null;
}
