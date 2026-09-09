/** Bonus offers. Placeholder copy — the admin panel will own these records. */
export interface Promo {
  id: string;
  title: string;
  body: string;
  glyph: string;
  art: string;
  badge?: string;
}

export const PROMOTIONS: Promo[] = [
  { id: 'signup', title: '৳18 Sign Up Bonus', glyph: '🎁', art: 'a3', badge: 'NEW',
    body: 'Register, verify your mobile number and complete your first deposit to receive a ৳18 bonus.' },
  { id: 'deposit-5', title: '5% Bonus On Every Deposit', glyph: '💰', art: 'a5', badge: 'POPULAR',
    body: 'A 5% bonus on every deposit, for life. No cap — as many deposits, as many bonuses.' },
  { id: 'rebate', title: '1% Monthly Rebate Cashback', glyph: '🔄', art: 'a2',
    body: '1% cashback on your total monthly betting turnover, credited automatically.' },
  { id: 'refer', title: '40% Referral Commission', glyph: '👥', art: 'a1',
    body: 'Invite a friend. The more they play, the more commission you earn — for life.' },
  { id: 'cricket', title: 'Cricket Exchange Bonus', glyph: '🏏', art: 'a7',
    body: 'Bet on the cricket exchange for a special bonus and a lower commission rate.' },
  { id: 'vip', title: 'VIP Level Up Reward', glyph: '👑', art: 'a6',
    body: 'An upgrade bonus at every VIP level, higher rebates and faster withdrawals.' },
];

/** VIP tiers — turnover thresholds are placeholders. */
export const VIP_TIERS = [
  { level: 'VIP 1', need: 50_000, rebate: '0.3%', gift: '৳50' },
  { level: 'VIP 2', need: 250_000, rebate: '0.5%', gift: '৳300' },
  { level: 'VIP 3', need: 1_000_000, rebate: '0.7%', gift: '৳1,500' },
  { level: 'VIP 4', need: 5_000_000, rebate: '0.9%', gift: '৳8,000' },
  { level: 'VIP 5', need: 20_000_000, rebate: '1.2%', gift: '৳40,000' },
];
