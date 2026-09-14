/* ============================================================
   The browser's database client.

   The site ran on Supabase until 2026-09-13 and every screen was
   written against its client, so this one keeps the same face — the
   `auth` calls and the `.from().select().eq()` builder — while the work
   happens on our own server:

     • signing up, in and out, and changing the password go to
       /api/auth/*, which sets an httpOnly session cookie the page itself
       never sees;
     • `.from()` queries go to /api/data/query, which only ever answers
       with the signed-in player's own rows (lib/db/policy.ts);
     • `.rpc()` goes to /api/data/rpc — the fund password, nothing else.

   No server code is imported here; this file ships to the browser.
   ============================================================ */

import { Query, type DbError, type QueryResult, type QuerySpec } from './db/builder';
import { normalizePhone } from './auth';

export type { DbError };

export type Session = {
  user: { id: string; email: string | null; created_at: string | null };
  /** an admin reset the password; every page sends the player to choose
      their own until they do */
  mustChangePassword?: boolean;
};

type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'USER_UPDATED';
type Listener = (event: AuthEvent, session: Session | null) => void;

/** There is always a database behind the site now. */
export const isBackendReady = () => true;

async function post(url: string, body: unknown): Promise<{ status: number; json: Record<string, unknown> | null }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'same-origin',
      cache: 'no-store',
    });
    let json: Record<string, unknown> | null = null;
    try { json = (await res.json()) as Record<string, unknown>; } catch { /* not JSON */ }
    return { status: res.status, json };
  } catch {
    return { status: 0, json: null };
  }
}

const offline: DbError = { message: 'Could not reach the server — check the connection and try again' };

async function transport(spec: QuerySpec): Promise<QueryResult> {
  const { json } = await post('/api/data/query', spec);
  if (json && 'error' in json) {
    return {
      data: json.data ?? null,
      error: (json.error as DbError | null) ?? null,
      count: typeof json.count === 'number' ? json.count : null,
    };
  }
  return { data: null, error: offline, count: null };
}

/** The phone part of the <phone>@id.sk88bd.live login the screens pass. */
const phoneOf = (email: string) => normalizePhone(String(email ?? '').split('@')[0]);

function createClient() {
  let loaded: Promise<Session | null> | null = null;
  const listeners = new Set<Listener>();

  const settle = (event: AuthEvent, session: Session | null) => {
    loaded = Promise.resolve(session);
    listeners.forEach((listener) => listener(event, session));
  };

  const load = () => {
    loaded ??= fetch('/api/auth/session', { cache: 'no-store', credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { session?: Session | null } | null) => json?.session ?? null)
      .catch(() => {
        loaded = null; // ask again next time rather than remember a failure
        return null;
      });
    return loaded;
  };

  // the 2026-09-13 build kept a fake session here; it means nothing now
  try { localStorage.removeItem('sk88bd_session'); } catch { /* private mode */ }

  return {
    auth: {
      async getSession() {
        return { data: { session: await load() } };
      },
      async getUser() {
        return { data: { user: (await load())?.user ?? null } };
      },
      async signUp(args: { email: string; password: string; options?: { data?: Record<string, unknown> } }) {
        const meta = args.options?.data ?? {};
        const { json } = await post('/api/auth/register', {
          phone: phoneOf(args.email),
          password: args.password,
          referralCode: meta.referral_code ?? null,
          agentCode: meta.agent_code ?? null,
        });
        const session = (json?.ok ? json.session : null) as Session | null;
        if (!session) {
          return { data: { user: null, session: null }, error: { message: String(json?.message ?? offline.message) } };
        }
        settle('SIGNED_IN', session);
        return { data: { user: session.user, session }, error: null };
      },
      async signInWithPassword(args: { email: string; password: string }) {
        const { json } = await post('/api/auth/login', { phone: phoneOf(args.email), password: args.password });
        const session = (json?.ok ? json.session : null) as Session | null;
        if (!session) {
          return { data: { user: null, session: null }, error: { message: String(json?.message ?? offline.message) } };
        }
        settle('SIGNED_IN', session);
        return { data: { user: session.user, session }, error: null };
      },
      async updateUser(args: { password?: string }) {
        const { json } = await post('/api/auth/password', { password: args.password ?? '' });
        const session = (json?.ok ? json.session : null) as Session | null;
        if (!session) return { data: { user: null }, error: { message: String(json?.message ?? offline.message) } };
        settle('USER_UPDATED', session);
        return { data: { user: session.user }, error: null };
      },
      async signOut() {
        await post('/api/auth/logout', {});
        settle('SIGNED_OUT', null);
        return { error: null };
      },
      onAuthStateChange(listener: Listener) {
        listeners.add(listener);
        return { data: { subscription: { unsubscribe: () => { listeners.delete(listener); } } } };
      },
    },

    from: (table: string) => new Query(table, transport),

    async rpc(fn: string, args: Record<string, unknown> = {}): Promise<QueryResult> {
      const { json } = await post('/api/data/rpc', { fn, args });
      if (json && 'error' in json) {
        return { data: json.data ?? null, error: (json.error as DbError | null) ?? null, count: null };
      }
      return { data: null, error: offline, count: null };
    },
  };
}

export type SupabaseClient = ReturnType<typeof createClient>;

let client: SupabaseClient | null = null;

/** One client for the tab. Null while rendering on the server. */
export function browserClient(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;
  client ??= createClient();
  return client;
}
