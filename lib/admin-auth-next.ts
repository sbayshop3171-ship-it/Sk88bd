import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, getAdminSessionFromCookie, type AdminSession } from './admin-auth';
import { can, type AdminPermission } from './admin-roles';

export async function getCurrentAdminSession() {
  const cookieStore = await cookies();
  return getAdminSessionFromCookie(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export type AdminGuard =
  | { ok: true; session: AdminSession }
  | { ok: false; response: NextResponse };

/**
 * The gate every /api/admin route stands behind.
 *
 * Signed in is no longer the whole question: an agent holds a valid session
 * and still has no business repointing a payment number. The route names the
 * permission it needs and gets a 403 for a session that does not carry it —
 * hiding the tab in the nav is a courtesy, this is the lock.
 */
export async function requireAdmin(permission?: AdminPermission): Promise<AdminGuard> {
  const session = await getCurrentAdminSession();
  if (!session) return { ok: false, response: deny('unauthorized', 401) };
  if (permission && !can(session.role, permission)) {
    return { ok: false, response: deny('forbidden', 403) };
  }
  return { ok: true, session };
}

/** Same question for a server page: the session if it may be here, else null
    so the page can render the "no access" note. */
export async function adminSessionWith(permission: AdminPermission): Promise<AdminSession | null> {
  const session = await getCurrentAdminSession();
  if (!session) return null;
  return can(session.role, permission) ? session : null;
}

function deny(reason: string, status: number) {
  return NextResponse.json(
    { ok: false, reason },
    { status, headers: { 'cache-control': 'no-store' } },
  );
}
