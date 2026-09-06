/** The cashier the admin designs: which deposit methods a player sees, what
    bonus each promises, the quick-pick amounts, every line of copy on the
    deposit and withdraw screens, and the withdraw-side rules.

    Pure — no node imports — so the deposit screen, the withdraw screen and
    the admin form all share these types and defaults. Persistence is in
    cashier-config-store.ts. Method `channelId` always points at one of the
    channels in lib/payments.ts: that is where the operator numbers live
    (admin → পেমেন্ট) and what the deposits/withdrawals tables reference. */

import { DEPOSIT_CHANNELS, QUICK_AMOUNTS, WITHDRAW_CHANNELS } from './payments';

/** Which menu the player uses inside bKash / Nagad. Drives the highlighted
    step in the how-to strip and the account kind we hand out. */
export type PayType = 'payment' | 'cashout' | 'sendmoney' | 'transfer';

export const PAY_TYPE_LABEL: Record<PayType, string> = {
  payment: 'পেমেন্ট',
  cashout: 'ক্যাশ আউট',
  sendmoney: 'সেন্ড মানি',
  transfer: 'ট্রান্সফার',
};

/** the operator account kinds (lib/payment-accounts) each pay type draws on */
export const PAY_TYPE_KINDS: Record<PayType, ('personal' | 'agent' | 'merchant')[]> = {
  payment: ['merchant'],
  cashout: ['agent'],
  sendmoney: ['personal'],
  transfer: ['personal', 'agent', 'merchant'],
};

export type DepositMethod = {
  id: string;
  /** "BKASH PAYMENT" — the tile label */
  name: string;
  /** operator numbers + ledger channel, one of lib/payments ids */
  channelId: string;
  payType: PayType;
  /** short line under the name, e.g. "+10% বোনাস"; blank hides it */
  bonusLabel: string;
  /** percent credited on approval, 0-100; informational for the admin queue */
  bonusPercent: number;
  /** emoji or an image URL (uploaded via /admin/banners style upload) */
  icon: string;
  /** tile colour, any CSS colour */
  color: string;
  /** shown as the "Payment channels" card subtitle, e.g. GATEWAY / AGENT */
  tag: string;
  /** taka */
  min: number;
  max: number;
  /** transaction id must be typed before submit */
  trxRequired: boolean;
  /** explanation under the method grid when this one is picked */
  note: string;
  active: boolean;
};

export type AmountPreset = {
  amount: number;
  /** badge on the chip, e.g. "+50"; blank hides it */
  bonusLabel: string;
};

export type WithdrawMethod = {
  id: string;
  name: string;
  channelId: string;
  icon: string;
  color: string;
  /** taka */
  min: number;
  max: number;
  /** placeholder + validation hint for the account field */
  accountHint: string;
  active: boolean;
};

export type CashierConfig = {
  deposit: {
    methods: DepositMethod[];
    amounts: AmountPreset[];
    /** headings */
    methodTitle: string;
    channelTitle: string;
    amountTitle: string;
    /** pink note under the channel card */
    channelNote: string;
    /** step 2 */
    stepHeaderNote: string;
    stepWarning: string;
    walletLabel: string;
    howToTitle: string;
    /** one step per line */
    howToSteps: string;
    trxLabel: string;
    trxHelpText: string;
    trxHelpUrl: string;
    trxPlaceholder: string;
    /** regex source the trx id must match; blank accepts anything */
    trxPattern: string;
    confirmTitle: string;
    confirmText: string;
    cautionTitle: string;
    cautionText: string;
    successTitle: string;
    successText: string;
    /** "Promotions" accordion under the amounts; blank hides it */
    promoTitle: string;
    promoText: string;
  };
  withdraw: {
    methods: WithdrawMethod[];
    /** "24 ঘন্টা" */
    processingTime: string;
    reminder: string;
    /** requests per player per day; 0 = unlimited */
    dailyLimit: number;
    /** saved e-wallets a player may keep per method */
    maxWallets: number;
    walletsTitle: string;
    emptyWalletsText: string;
    amountLabel: string;
    passwordLabel: string;
    passwordHint: string;
    note: string;
  };
  updatedAt: string | null;
};

const CHANNEL_COLOR: Record<string, string> = {
  bkash: '#e2136e',
  nagad: '#f7941d',
  rocket: '#8a3ab9',
  upay: '#1e88e5',
  bank: '#0f766e',
  usdt: '#26a17b',
};

const CHANNEL_ICON: Record<string, string> = {
  bkash: '🅱️',
  nagad: '🅽',
  rocket: '🚀',
  upay: '🆙',
  bank: '🏦',
  usdt: '₮',
};

export const CASHIER_DEFAULTS: CashierConfig = {
  deposit: {
    methods: DEPOSIT_CHANNELS.map((c, i) => ({
      id: c.id,
      name: c.name.toUpperCase(),
      channelId: c.id,
      payType: c.id === 'bank' || c.id === 'usdt' ? 'transfer' : 'sendmoney',
      bonusLabel: i === 0 ? '+৫% বোনাস' : '',
      bonusPercent: i === 0 ? 5 : 0,
      icon: CHANNEL_ICON[c.id] ?? c.glyph,
      color: CHANNEL_COLOR[c.id] ?? '#0f766e',
      tag: c.id === 'bank' ? 'BANK' : c.id === 'usdt' ? 'CRYPTO' : 'GATEWAY',
      min: c.min,
      max: c.max,
      trxRequired: true,
      note: `এই ${c.name} নাম্বারে টাকা পাঠিয়ে ট্রানজেকশন আইডি দিন। অ্যাডমিন যাচাই করলে ব্যালেন্সে যোগ হবে।`,
      active: true,
    })),
    amounts: QUICK_AMOUNTS.map((amount) => ({ amount, bonusLabel: '' })),
    methodTitle: 'ডিপোজিট মেথড',
    channelTitle: 'পেমেন্ট চ্যানেল',
    amountTitle: 'ডিপোজিট পরিমাণ',
    channelNote: 'এই নাম্বারে শুধুমাত্র নির্ধারিত মেথডে পেমেন্ট গ্রহণ করা হয়',
    stepHeaderNote: 'কম বা বেশি পাঠাবেন না',
    stepWarning: 'আপনি যদি টাকার পরিমাণ পরিবর্তন করেন, আপনি ক্রেডিট পেতে সক্ষম হবেন না।',
    walletLabel: 'ওয়ালেট নাম্বার',
    howToTitle: 'কিভাবে পাঠাবেন',
    howToSteps: 'অ্যাপ খুলুন\nউপরের মেনু বেছে নিন\nনাম্বার দিন\nAmount দিন\nReference দিন\nPIN দিয়ে নিশ্চিত করুন\nTrxID কপি করুন',
    trxLabel: 'পেমেন্টের TrxID নাম্বারটি লিখুন',
    trxHelpText: 'কিভাবে TrxID পেতে হয় তা দেখতে ক্লিক করুন',
    trxHelpUrl: '',
    trxPlaceholder: 'যেমন: 9F2K4L8M',
    trxPattern: '^[A-Za-z0-9]{6,20}$',
    confirmTitle: 'নিশ্চিত করুন',
    confirmText: 'এই অর্ডার একবারই জমা দেওয়া যাবে। আপনার ট্রানজেকশন আইডি সঠিক কিনা নিশ্চিত করুন:',
    cautionTitle: 'সতর্কতা:',
    cautionText: 'লেনদেন আইডি সঠিকভাবে পূরণ করতে হবে, অন্যথায় অর্ডার ব্যর্থ হবে! অনুগ্রহ করে নিশ্চিত হয়ে নিন যে আপনি দেখানো নাম্বারেই টাকা পাঠিয়েছেন। অন্য কোনো নাম্বারে পাঠালে সেই টাকা পাওয়ার কোনো সম্ভাবনা নেই।',
    successTitle: 'সফলভাবে জমা হয়েছে!',
    successText: 'আপনার ডিপোজিট অর্ডার সফলভাবে জমা দেওয়া হয়েছে। সিস্টেম ৫ মিনিটের মধ্যে যাচাই করা শুরু করবে।',
    promoTitle: 'প্রমোশন',
    promoText: '',
  },
  withdraw: {
    methods: WITHDRAW_CHANNELS.map((c) => ({
      id: c.id,
      name: c.name,
      channelId: c.id,
      icon: CHANNEL_ICON[c.id] ?? c.glyph,
      color: CHANNEL_COLOR[c.id] ?? '#0f766e',
      min: 500,
      max: 50_000,
      accountHint: c.id === 'bank' ? 'অ্যাকাউন্ট নাম্বার' : c.id === 'usdt' ? 'TRC20 অ্যাড্রেস' : '01XXXXXXXXX',
      active: true,
    })),
    processingTime: '২৪ ঘন্টা',
    reminder: 'উত্তোলনের আগে অনুগ্রহ করে নিশ্চিত করুন যে আপনার ই-ওয়ালেট (bKash, Nagad) সঠিকভাবে যুক্ত আছে। তথ্য ভুল হলে লেনদেন বিলম্বিত হতে পারে বা ব্যর্থ হতে পারে।',
    dailyLimit: 5,
    maxWallets: 5,
    walletsTitle: 'নিবন্ধিত ই-ওয়ালেট',
    emptyWalletsText: 'খালি ই-ওয়ালেট',
    amountLabel: 'উত্তোলন পরিমাণ',
    passwordLabel: 'লেনদেন পাসওয়ার্ড',
    passwordHint: 'আপনার লগইন পাসওয়ার্ডটি দিন',
    note: 'রিকোয়েস্ট করার সাথে সাথে টাকা ব্যালেন্স থেকে সরিয়ে রাখা হবে। অ্যাডমিন অনুমোদন করলে পাঠানো হবে, বাতিল করলে ব্যালেন্সে ফেরত আসবে।',
  },
  updatedAt: null,
};

export const KNOWN_CHANNEL_IDS = new Set(DEPOSIT_CHANNELS.map((c) => c.id));

export type CashierMutationReason =
  | 'invalid-method'
  | 'invalid-amounts'
  | 'invalid-limit'
  | 'unknown-channel'
  | 'invalid-pattern'
  | 'invalid-url';

export type CashierMutationResult =
  | { ok: true; config: CashierConfig }
  | { ok: false; reason: CashierMutationReason; field?: string };

/** The four bKash-style menu tiles in the how-to strip, in app order. The
    recharge tile is never the right one — it is there so the strip looks
    like the app's home screen. A 'transfer' method (bank, crypto) has no
    such menu, so the strip is skipped for it. */
export const HOWTO_TILES: { key: PayType | 'recharge'; label: string; glyph: string }[] = [
  { key: 'sendmoney', label: 'সেন্ড মানি', glyph: '📤' },
  { key: 'recharge', label: 'মোবাইল রিচার্জ', glyph: '📱' },
  { key: 'cashout', label: 'ক্যাশ আউট', glyph: '🏧' },
  { key: 'payment', label: 'পেমেন্ট', glyph: '🛍️' },
];

export function isImageIcon(icon: string) {
  return /^(https?:)?\/|^data:image\//.test(icon);
}
