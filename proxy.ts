import { NextResponse, type NextRequest } from 'next/server';

/**
 * Two doors to the same panel.
 *
 * Agents are given ag.sk88bd.com, or sk88bd.com/agent, rather than
 * sk88bd.com/admin: the address an agent hands round is not the operator's,
 * and neither door should teach them the operator's own URL. Both are a
 * rewrite rather than a redirect, so the address bar keeps saying what was
 * typed — a redirect put /admin in front of every agent on their first
 * click, which was the whole thing this was meant to avoid.
 *
 * It is one app either way: the panel, its API and its session cookie are
 * the ones already there. The header below tells the layout which door was
 * used, so the links inside point back through it (lib/panel-base.ts).
 */
const AGENT_HOSTS = ['ag.'];

const PANEL_BASE_HEADER = 'x-panel-base';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /agent, and everything under it, is the panel
  if (pathname === '/agent' || pathname.startsWith('/agent/')) {
    const rest = pathname.slice('/agent'.length).replace(/\/$/, '');
    return panel(request, rest ? `/admin${rest}` : '/admin');
  }

  /* The subdomain's root only. Everything else on that host — /agent/…,
     /api/admin, /_next — is already the right path, and rewriting those
     would turn every asset request into /admin/_next/… and serve nothing. */
  const host = request.headers.get('host')?.toLowerCase() ?? '';
  if (pathname === '/' && AGENT_HOSTS.some((prefix) => host.startsWith(prefix))) {
    return panel(request, '/admin');
  }

  return NextResponse.next();
}

/** Serve an /admin route while the browser keeps the address it asked for.

    The destination is built by cloning `nextUrl`, not from `request.url`:
    behind nginx the latter is http://127.0.0.1:3251/…, so `new URL()` on it
    produced an absolute address on another origin. Next read that as an
    external proxy target and the edge answered 500 — while the origin,
    asked directly, was fine. `nextUrl.clone()` keeps the deployment's own
    origin and carries the query string with it. */
function panel(request: NextRequest, destination: string) {
  const url = request.nextUrl.clone();
  url.pathname = destination;

  const headers = new Headers(request.headers);
  headers.set(PANEL_BASE_HEADER, '/agent');
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  matcher: ['/', '/agent', '/agent/:path*'],
};
