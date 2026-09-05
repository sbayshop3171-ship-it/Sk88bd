/* ============================================================
   Supabase access.

   The project is not wired yet, so every helper degrades to `null`
   when the env vars are missing — the site builds and runs without
   a backend, and each feature can check `isBackendReady()` to decide
   between live data and the placeholder it ships with today.
   ============================================================ */

import { createBrowserClient, createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isBackendReady = () => Boolean(URL && ANON);

/** Browser client. Returns null until the project env vars are set. */
export function browserClient(): SupabaseClient | null {
  if (!URL || !ANON) return null;
  return createBrowserClient(URL, ANON);
}

/**
 * Server client bound to the request's cookies.
 *
 * `cookies` is passed in rather than imported so this module stays usable
 * from route handlers, server components and middleware alike.
 */
export function serverClient(cookies: {
  getAll: () => { name: string; value: string }[];
  setAll: (list: { name: string; value: string; options?: object }[]) => void;
}): SupabaseClient | null {
  if (!URL || !ANON) return null;
  return createServerClient(URL, ANON, {
    cookies: {
      getAll: cookies.getAll,
      setAll: (list) => {
        // read-only contexts (server components) cannot set cookies
        try { cookies.setAll(list); } catch { /* ignore */ }
      },
    },
  });
}

/**
 * Service-role client for admin work: approving cashier requests, adjusting
 * balances, settling rounds. Server-side only — this key bypasses RLS.
 */
export function adminClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!URL || !key) return null;
  if (typeof window !== 'undefined') {
    throw new Error('adminClient() must never run in the browser');
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js');
  return createClient(URL, key, { auth: { persistSession: false } });
}
