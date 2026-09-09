/** @type {import('next').NextConfig} */
/* Sent on every response. The site had none of these, which left the
   ordinary browser-side attacks — a competitor framing the cashier to
   harvest taps, a stray script reading the referrer path of an admin page,
   a mistyped content type being sniffed into script — with nothing in
   the way.

   Deliberately not here: a Content-Security-Policy. The pages inline both
   styles and scripts, so a real policy needs nonces threaded through the
   app, and a policy loose enough to work without them is decoration. Worth
   doing, but as its own change rather than smuggled into this one. */
const securityHeaders = [
  // the cashier and the admin panel must never be framed by anyone
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
];

const nextConfig = {
  reactStrictMode: true,
  // `next dev` blocks cross-origin requests to dev assets; the phone on the
  // LAN loads the site by the machine's address, so name it here. Dev only.
  allowedDevOrigins: ['192.168.0.111'],
  // the version banner names the framework and its version to anyone asking
  poweredByHeader: false,
  // game tiles ask for quality 72; Next 16 only serves listed qualities
  images: { qualities: [72, 75] },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  /* The agent's door. It is done here rather than in proxy.ts because a
     rewrite from the proxy answers with an absolute `x-middleware-rewrite`
     built from the origin's own address — behind Cloudflare that arrives as
     https://localhost:3251/… and Next tries to proxy to it. A config rewrite
     is handled by the router itself and never leaves the process. The proxy
     still runs first, and marks which door was used. */
  async rewrites() {
    return [
      { source: '/agent', destination: '/admin' },
      { source: '/agent/:path*', destination: '/admin/:path*' },
    ];
  },
};

export default nextConfig;
