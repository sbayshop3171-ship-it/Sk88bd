/** Whether a player may move money right now.

    Two switches sit on a profile, both set from /admin/users:

    - **banned** (`is_blocked`) — the account is shut. The auth user is banned
      too, so a fresh login or a token refresh fails; this check covers the
      hour an already-issued token still has left.
    - **on hold** (`is_held`, migration 012) — the player can still sign in
      and read their balance, but nothing moves: no bets, no bonus claims, no
      withdrawal. It is for "we are looking into this account", when shutting
      the door would also stop them talking to support.

    Every server route that debits or credits a wallet asks here first. The
    database repeats the check inside the functions a browser can call
    (migration 012), so a player who skips this server entirely meets the
    same answer. */

import type { SupabaseClient } from '@supabase/supabase-js';

export type AccountBlock = 'banned' | 'held';

export const ACCOUNT_BLOCK_MESSAGE: Record<AccountBlock, string> = {
  banned: 'This account has been banned. Contact support.',
  held: 'This account is on hold. Contact support.',
};

/** null when the player is clear to play. A database that has not run
    migration 012 has no `is_held`, so it falls back to the ban flag alone
    rather than letting the missing column stop every bet on the site. */
export async function accountBlock(db: SupabaseClient, uid: string): Promise<AccountBlock | null> {
  let { data, error } = await db
    .from('profiles')
    .select('is_blocked, is_held')
    .eq('id', uid)
    .maybeSingle();

  if (error && /column|schema cache/i.test(error.message)) {
    ({ data, error } = await db.from('profiles').select('is_blocked').eq('id', uid).maybeSingle());
  }
  // a read that fails outright says nothing either way; the database checks
  // again where it matters, so do not turn a hiccup into a lockout
  if (error || !data) return null;

  const row = data as { is_blocked?: boolean; is_held?: boolean };
  if (row.is_blocked) return 'banned';
  if (row.is_held) return 'held';
  return null;
}
