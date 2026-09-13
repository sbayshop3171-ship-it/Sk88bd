/** Cross-site request forgery, for the player's routes.

    The session cookie is SameSite=Lax, which already keeps it off another
    site's POST — this is the second lock, the same one the admin panel has
    (lib/admin-auth-next.ts). Browsers send Sec-Fetch-Site on every request;
    a caller that sends neither it nor Origin (curl, a script) is judged by
    the cookie alone. */
export function sameSiteRequest(req: Request): boolean {
  const site = req.headers.get('sec-fetch-site');
  if (site) return site === 'same-origin' || site === 'none';
  const origin = req.headers.get('origin');
  if (!origin) return true;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
