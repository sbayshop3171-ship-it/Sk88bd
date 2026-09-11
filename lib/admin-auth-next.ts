import { cookies, headers } from 'next/headers';
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
  if (!(await sameSiteRequest())) return { ok: false, response: deny('cross-site', 403) };
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

/* Cross-site request forgery. The session cookie is SameSite=Lax, which
   already keeps it off another site's POST — this is the second lock, for
   the day a browser or a sibling subdomain lets one through. A request that
   changes something must come from the panel's own pages. Browsers send
   Sec-Fetch-Site on every request; a server-side caller (curl, a script
   with a stolen cookie) sends neither header and is judged by the cookie
   alone, as before. */
async function sameSiteRequest(): Promise<boolean> {
  const h = await headers();
  const site = h.get('sec-fetch-site');
  if (site) return site === 'same-origin' || site === 'none';
  const origin = h.get('origin');
  if (!origin) return true;
  const host = h.get('x-forwarded-host') ?? h.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function deny(reason: string, status: number) {
  return NextResponse.json(
    { ok: false, reason },
    { status, headers: { 'cache-control': 'no-store' } },
  );
}
