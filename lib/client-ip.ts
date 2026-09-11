/** The address a request really came from, for lockouts and rate limits.

    nginx on the VPS sets `X-Real-IP` to `$remote_addr`, and its
    `set_real_ip_from` list (conf.d/cloudflare.conf) turns that into the
    visitor's address only when the connection came from Cloudflare. So it is
    the one header a caller cannot write: through Cloudflare it is the
    visitor, straight to the origin it is whoever connected.

    `cf-connecting-ip` used to be read first. The origin answers on its own
    IP too, and there anybody can send that header — a fresh made-up value on
    every guess meant a fresh lockout bucket every time, and the "six tries"
    limit on the admin and signal-key logins never shut. It is only a
    fallback now, for a server that sets no X-Real-IP at all (local dev). */
export function clientIp(req: Request): string {
  const real = req.headers.get('x-real-ip')?.trim();
  const fallback = req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0];
  return (real || fallback?.trim() || 'unknown').slice(0, 64);
}
