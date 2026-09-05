/* ============================================================
   Brand tokens — re-skin the whole site from this one file.
   Colours live in app/globals.css :root.
   ============================================================ */

export const BRAND = {
  name: 'Sk88bd',
  /** wordmark is split so the two halves can carry different gradients */
  light: 'SK',
  accent: '88BD',
  tag: 'bet',
  currency: '৳',
  domain: 'sk88bd.live',
  /** Project owner's operational mailbox — support, admin sign-in, Supabase and
      Vercel accounts all hang off this address. */
  email: 'mpmony1@gmail.com',
  /** support handles shown in the floating buttons + footer */
  social: {
    whatsapp: 'https://wa.me/8801000000000',
    facebook: 'https://facebook.com/',
    telegram: 'https://t.me/',
  },
} as const;

/** ৳1,23,456 — Bengali digits off by design, operators read Latin numerals */
export const money = (n: number, decimals = 0) =>
  BRAND.currency +
  n.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
