/** Which players a staff member may see.

    An agent sees only the players who signed up through their own link
    (the operator's rule, 2026-09-11); an admin or the super admin sees
    everybody. Read off the session, never a parameter, so it cannot be
    widened from the URL bar. */

import { can, type AdminRole } from './admin-roles';
import { findStaffById } from './admin-users-store';

/** undefined = everybody; otherwise the agent code to filter on. */
export async function playerScope(session: { uid: string; role: AdminRole }): Promise<string | undefined> {
  if (can(session.role, 'agents.read')) return undefined;
  const me = await findStaffById(session.uid);
  // an agent without a code of their own sees nobody, not everybody
  return me?.refCode || '~none~';
}
