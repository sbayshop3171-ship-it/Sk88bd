import { NextResponse, type NextRequest } from 'next/server';

/**
 * Two doors to the same panel.
 *
 * Agents are given ag.sk88bd.com rather than sk88bd.com/admin: the address
 * an agent hands round is not the operator's, and a subdomain keeps the
 * staff entrance off the front page. It is a rewrite, not a second app —
 * the panel, its API and its session cookie are the ones already there.
 *
 * Only the bare root is rewritten. Everything else on that host — /admin,
 * /api/admin, /_next — is already the right path, and rewriting those would
 * turn every asset request into /admin/_next/... and serve nothing.
 */
const AGENT_HOSTS = ['ag.'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // a plain, memorable path for anybody who has the domain but not the
  // subdomain — /agent is easier to say down a phone than /admin
  if (pathname === '/agent' || pathname === '/agent/') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  const host = request.headers.get('host')?.toLowerCase() ?? '';
  if (pathname === '/' && AGENT_HOSTS.some((prefix) => host.startsWith(prefix))) {
    return NextResponse.rewrite(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/agent'],
};
