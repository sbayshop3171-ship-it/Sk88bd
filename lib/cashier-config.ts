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

/** What the per-1,000 charge is worked out on: the player's whole wallet, or
    only the amount they asked for. */
export type ChargeBasis = 'balance' | 'amount';

export const CHARGE_BASIS_LABEL: Record<ChargeBasis, string> = {
  balance: 'মোট ওয়ালেট ব্যালেন্সের উপর',
  amount: 'শুধু উত্তোলনের পরিমাণের উপর',
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
    /** amber notice at the top of the pick screen. {min} / {max} become the
        picked method's limits; a blank title hides the whole block. */
    noticeTitle: string;
    noticeText: string;
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
    /** taka the player owes per 1,000 taka; 0 turns the whole charge off */
    chargePerThousand: number;
    /** whether that rate is applied to the wallet balance or the request */
    chargeBasis: ChargeBasis;
    chargeTitle: string;
    /** {rate} = the charge on 1,000 taka, {min} / {max} the method's limits */
    chargeText: string;
    /** red line under the charge; blank hides it */
    chargeWarning: string;

    /* ---- step 2: the summary the player confirms ---- */
    summaryTitle: string;
    /** red line across the top of the summary */
    summaryWarning: string;
    /** heading over the charge figure, e.g. "এজেন্ট ক্যাশআউট চার্জ" */
    chargeLabel: string;
    rulesTitle: string;
    /** one rule per line; a line starting with ! is shown in red */
    rules: string;
    applyLabel: string;

    /* ---- step 3: paying the charge to an agent number ---- */
    payTitle: string;
    payWarning: string;
    agentNote: string;
    chargeExactNote: string;
    guideTitle: string;
    /** one bullet per line */
    guideLines: string;
    chargeTrxLabel: string;
    chargeTrxPlaceholder: string;
    chargeCaution: string;
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

/* Brand marks rather than emoji: the method tiles are the first thing a
   player checks before sending money, and a 🅱️ standing in for bKash reads
   as a placeholder. These are our own SVGs in each brand's colour — the
   admin can point any method at a real logo file instead, since an icon
   beginning with "/" is rendered as an image (see isImageIcon). */
const CHANNEL_ICON: Record<string, string> = {
  bkash: '/payments/bkash.svg',
  nagad: '/payments/nagad.svg',
  rocket: '/payments/rocket.svg',
  upay: '/payments/upay.svg',
  bank: '/payments/bank.svg',
  usdt: '/payments/usdt.svg',
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
    noticeTitle: 'সর্বনিম্ন ডিপোজিট {min}',
    noticeText: 'একবারে {min} টাকার কম পাঠাবেন না। এর চেয়ে কম পাঠালে সেই টাকা অ্যাকাউন্টে যোগ করা হবে না এবং ফেরতও দেওয়া হবে না। একবারে সর্বোচ্চ {max} পাঠানো যাবে।',
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
    chargePerThousand: 44,
    chargeBasis: 'balance',
    chargeTitle: 'উত্তোলন চার্জ',
    chargeText: 'প্রতি ১,০০০ টাকায় {rate} হারে এজেন্ট ক্যাশআউট চার্জ দিতে হবে।',
    chargeWarning: 'চার্জ পরিশোধ না করলে উত্তোলনের টাকা ছাড় করা হবে না।',
    summaryTitle: 'উত্তোলন সারাংশ',
    summaryWarning: 'শুধুমাত্র আমাদের দেওয়া এজেন্ট নাম্বারে চার্জ পাঠাবেন, অন্যথায় উত্তোলন সফল হবে না।',
    chargeLabel: 'এজেন্ট ক্যাশআউট চার্জ',
    rulesTitle: 'উত্তোলন নিয়মাবলী',
    rules: [
      'নিজের নামে থাকা সঠিক অ্যাকাউন্ট নাম্বার দিন',
      'এক রিকোয়েস্টে সর্বোচ্চ {max} তোলা যাবে',
      '!এজেন্ট ক্যাশআউট চার্জ মোট ওয়ালেট ব্যালেন্সের উপর হিসাব করা হয়',
      '!প্রতি ১,০০০ টাকায় {rate} চার্জ',
      '!সম্পূর্ণ চার্জ একবারেই পরিশোধ করতে হবে',
      'চার্জ যাচাই হলে {time} এর মধ্যে টাকা পাঠানো হবে',
    ].join('\n'),
    applyLabel: 'উত্তোলনের জন্য আবেদন করুন',
    payTitle: 'চার্জ পরিশোধ',
    payWarning: 'নিচের এজেন্ট নাম্বারে চার্জ পাঠিয়ে TrxID দিন — তবেই উত্তোলন প্রক্রিয়া শুরু হবে।',
    agentNote: 'এই নাম্বারে শুধুমাত্র ক্যাশ আউট গ্রহণ করা হয়',
    chargeExactNote: 'ঠিক এই পরিমাণ পাঠাতে হবে — কম বা বেশি নয়',
    guideTitle: 'গুরুত্বপূর্ণ নির্দেশনা',
    guideLines: [
      'পুরো চার্জ {charge} এক ট্রানজেকশনেই ক্যাশ আউট করুন',
      'উপরে দেখানো এজেন্ট নাম্বার ছাড়া অন্য কোথাও পাঠাবেন না',
    ].join('\n'),
    chargeTrxLabel: 'চার্জ পেমেন্টের TrxID লিখুন',
    chargeTrxPlaceholder: 'যেমন: 9F2K4L8M',
    chargeCaution: 'লেনদেন আইডি সঠিকভাবে দিতে হবে, না হলে উত্তোলন বাতিল হয়ে যাবে।',
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

/** The figure the charge is a percentage of. */
export function chargeBase(basis: ChargeBasis, amount: number, balance: number) {
  const base = basis === 'balance' ? balance : amount;
  return Number.isFinite(base) && base > 0 ? base : 0;
}

/** What the player owes on a withdrawal: the per-1,000 rate pro-rated to the
    amount and rounded up to the next taka. 0 when the admin turned it off. */
export function withdrawCharge(amount: number, perThousand: number) {
  if (!Number.isFinite(amount) || amount <= 0 || perThousand <= 0) return 0;
  return Math.ceil((amount * perThousand) / 1000);
}

/** Fill {min}, {max}, {rate}… in an admin-written line. A token the caller
    did not supply is left on screen as-is rather than blanked out. */
export function fillTokens(template: string, tokens: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => tokens[key] ?? whole);
}

export function isImageIcon(icon: string) {
  return /^(https?:)?\/|^data:image\//.test(icon);
}
