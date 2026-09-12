/** Which players a staff member may see.

    An agent sees only the players who signed up through their own link
    (the operator's rule, 2026-09-11); an admin or the super admin sees
    everybody. Read off the session, never a parameter, so it cannot be
    widened from the URL bar. */

import { can, type AdminPermission } from './admin-roles';
import { findStaffById } from './admin-users-store';
import { adminClient } from './supabase';

/** undefined = everybody; otherwise the agent code to filter on. */
export async function playerScope(session: { uid: string; permissions: readonly AdminPermission[] }): Promise<string | undefined> {
  if (can(session, 'agents.read')) return undefined;
  const me = await findStaffById(session.uid);
  // an agent without a code of their own sees nobody, not everybody
  return me?.refCode || '~none~';
}

/** Whether a player falls inside a scope from playerScope(). The list is
    already narrowed for an agent; a write names its player in the body, so
    it asks again rather than trusting the id it was sent. */
export async function inScope(scope: string | undefined, userId: string): Promise<boolean> {
  if (scope === undefined) return true;
  const db = adminClient();
  if (!db) return false;
  const { data } = await db.from('profiles').select('agent_code').eq('id', userId).maybeSingle();
  return Boolean(data && (data as { agent_code: string | null }).agent_code === scope);
}
