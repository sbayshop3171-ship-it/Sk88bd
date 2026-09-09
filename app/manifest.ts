import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/brand';

/** What Chrome reads to offer "Install app". Together with the service worker
    in public/sw.js and HTTPS, this is what makes the site installable; the
    prompt itself is raised by components/InstallPrompt.tsx. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} — Online Casino & Cricket Exchange`,
    short_name: BRAND.name,
    description:
      'Bangladesh’s online gaming platform — live casino, slots, cricket exchange, fishing and lottery.',
    lang: 'bn',
    dir: 'ltr',
    start_url: '/?src=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#04211f',
    theme_color: '#04211f',
    categories: ['games', 'entertainment'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Deposit', url: '/deposit' },
      { name: 'Withdraw', url: '/withdraw' },
      { name: 'Aviator', url: '/game/aviator' },
    ],
  };
}
