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
  { id: 'signup', title: '৳১৮ সাইন আপ বোনাস', glyph: '🎁', art: 'a3', badge: 'নতুন',
    body: 'রেজিস্টার করে মোবাইল নাম্বার ভেরিফাই করুন এবং প্রথম ডিপোজিট সম্পূর্ণ করলেই ৳১৮ বোনাস।' },
  { id: 'deposit-5', title: '৫% প্রতিবার ডিপোজিট বোনাস', glyph: '💰', art: 'a5', badge: 'জনপ্রিয়',
    body: 'আজীবন, প্রতিটি ডিপোজিটে ৫% বোনাস। কোনো সীমা নেই — যতবার ডিপোজিট, ততবার বোনাস।' },
  { id: 'rebate', title: '১% মাসিক রিবেট ক্যাশব্যাক', glyph: '🔄', art: 'a2',
    body: 'প্রতি মাসের মোট বেটিং টার্নওভারের উপর ১% ক্যাশব্যাক অটোমেটিক জমা হবে।' },
  { id: 'refer', title: '৪০% রেফারেল কমিশন', glyph: '👥', art: 'a1',
    body: 'বন্ধুকে ইনভাইট করুন। সে যত খেলবে, আপনি তত আজীবন কমিশন পাবেন।' },
  { id: 'cricket', title: 'ক্রিকেট এক্সচেঞ্জ বোনাস', glyph: '🏏', art: 'a7',
    body: 'ক্রিকেট এক্সচেঞ্জে বেট করলে বিশেষ বোনাস ও কম কমিশন রেট।' },
  { id: 'vip', title: 'ভিআইপি লেভেল আপ রিওয়ার্ড', glyph: '👑', art: 'a6',
    body: 'প্রতিটি ভিআইপি লেভেলে আপগ্রেড বোনাস, বেশি রিবেট ও দ্রুত উইথড্র।' },
];

/** VIP tiers — turnover thresholds are placeholders. */
export const VIP_TIERS = [
  { level: 'VIP 1', need: 50_000, rebate: '0.3%', gift: '৳৫০' },
  { level: 'VIP 2', need: 250_000, rebate: '0.5%', gift: '৳৩০০' },
  { level: 'VIP 3', need: 1_000_000, rebate: '0.7%', gift: '৳১,৫০০' },
  { level: 'VIP 4', need: 5_000_000, rebate: '0.9%', gift: '৳৮,০০০' },
  { level: 'VIP 5', need: 20_000_000, rebate: '1.2%', gift: '৳৪০,০০০' },
];
