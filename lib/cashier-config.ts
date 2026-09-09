/** The cashier the admin designs: which deposit methods a player sees, what
    bonus each promises, the quick-pick amounts, every line of copy on the
    deposit and withdraw screens, and the withdraw-side rules.

    Pure — no node imports — so the deposit screen, the withdraw screen and
    the admin form all share these types and defaults. Persistence is in
    cashier-config-store.ts. Method `channelId` always points at one of the
    channels in lib/payments.ts: that is where the operator numbers live
    (admin → Payments) and what the deposits/withdrawals tables reference. */

import { DEPOSIT_CHANNELS, QUICK_AMOUNTS, WITHDRAW_CHANNELS } from './payments';

/** Which menu the player uses inside bKash / Nagad. Drives the highlighted
    step in the how-to strip and the account kind we hand out. */
export type PayType = 'payment' | 'cashout' | 'sendmoney' | 'transfer';

export const PAY_TYPE_LABEL: Record<PayType, string> = {
  payment: 'Payment',
  cashout: 'Cash Out',
  sendmoney: 'Send Money',
  transfer: 'Transfer',
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
  /** short line under the name, e.g. "+10% Bonus"; blank hides it */
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
  balance: 'On the total wallet balance',
  amount: 'On the withdrawal amount only',
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
    /** "24 hours" */
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
    /** heading over the charge figure, e.g. "Agent cash-out charge" */
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
      bonusLabel: '',
      bonusPercent: i === 0 ? 5 : 0,
      icon: CHANNEL_ICON[c.id] ?? c.glyph,
      color: CHANNEL_COLOR[c.id] ?? '#0f766e',
      tag: c.id === 'bank' ? 'BANK' : c.id === 'usdt' ? 'CRYPTO' : 'GATEWAY',
      min: c.min,
      max: c.max,
      trxRequired: true,
      note: `Send the money to this ${c.name} number and enter the transaction ID. It is credited to your balance once an admin verifies it.`,
      active: true,
    })),
    amounts: QUICK_AMOUNTS.map((amount) => ({ amount, bonusLabel: '' })),
    methodTitle: 'Deposit Method',
    channelTitle: 'Payment Channel',
    amountTitle: 'Deposit Amount',
    channelNote: 'This number accepts payments through the selected method only',
    stepHeaderNote: 'Do not send more or less',
    stepWarning: 'If you change the amount you will not be able to receive the credit.',
    walletLabel: 'Wallet Number',
    howToTitle: 'How to send',
    howToSteps: 'Open the app\nPick the menu above\nEnter the number\nEnter the amount\nEnter the reference\nConfirm with your PIN\nCopy the TrxID',
    trxLabel: 'Enter the TrxID of your payment',
    trxHelpText: 'Click to see how to find your TrxID',
    trxHelpUrl: '',
    trxPlaceholder: 'e.g. 9F2K4L8M',
    trxPattern: '^[A-Za-z0-9]{6,20}$',
    confirmTitle: 'Confirm',
    confirmText: 'This order can only be submitted once. Make sure your transaction ID is correct:',
    cautionTitle: 'Caution:',
    cautionText: 'The transaction ID must be filled in correctly or the order will fail. Please make sure you sent the money to the number shown here — money sent to any other number cannot be recovered.',
    successTitle: 'Submitted successfully!',
    successText: 'Your deposit order has been submitted. The system starts verifying it within 5 minutes.',
    promoTitle: 'Promotion',
    promoText: '',
    noticeTitle: 'Minimum deposit {min}',
    noticeText: 'Do not send less than {min} in one transaction. Anything below that is not credited to your account and cannot be refunded. The most you can send at once is {max}.',
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
      accountHint: c.id === 'bank' ? 'Account number' : c.id === 'usdt' ? 'TRC20 address' : '01XXXXXXXXX',
      active: true,
    })),
    processingTime: '24 hours',
    reminder: 'Before withdrawing, please make sure your e-wallet (bKash, Nagad) is added correctly. Wrong details can delay or fail the transaction.',
    dailyLimit: 5,
    maxWallets: 5,
    walletsTitle: 'Registered E-Wallets',
    emptyWalletsText: 'No e-wallet yet',
    amountLabel: 'Withdrawal Amount',
    passwordLabel: 'Transaction Password',
    passwordHint: 'Enter your login password',
    note: 'The amount is held aside the moment you request it. It is sent once an admin approves, and returned to your balance if the request is rejected.',
    chargePerThousand: 44,
    chargeBasis: 'balance',
    chargeTitle: 'Withdrawal Charge',
    chargeText: 'An agent cash-out charge of {rate} per ৳1,000 applies.',
    chargeWarning: 'The withdrawal is not released until the charge is paid.',
    summaryTitle: 'Withdrawal Summary',
    summaryWarning: 'Send the charge only to the agent number we give you, otherwise the withdrawal will not go through.',
    chargeLabel: 'Agent Cash-Out Charge',
    rulesTitle: 'Withdrawal Rules',
    rules: [
      'Give a correct account number held in your own name',
      'You can withdraw up to {max} in a single request',
      '!The agent cash-out charge is calculated on your total wallet balance',
      '!{rate} charge per ৳1,000',
      '!The full charge must be paid in one go',
    ].join('\n'),
    applyLabel: 'Apply for withdrawal',
    payTitle: 'Pay the charge',
    payWarning: 'Send the charge to the agent number below and enter the TrxID — only then does the withdrawal start processing.',
    agentNote: 'This number accepts cash out only',
    chargeExactNote: 'Send exactly this amount — no more, no less',
    guideTitle: 'Important instructions',
    guideLines: [
      'Cash out the whole {charge} charge in a single transaction',
      'Do not send it anywhere but the agent number shown above',
    ].join('\n'),
    chargeTrxLabel: 'Enter the TrxID of the charge payment',
    chargeTrxPlaceholder: 'e.g. 9F2K4L8M',
    chargeCaution: 'The transaction ID must be correct, or the withdrawal is cancelled.',
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
  { key: 'sendmoney', label: 'Send Money', glyph: '📤' },
  { key: 'recharge', label: 'Mobile Recharge', glyph: '📱' },
  { key: 'cashout', label: 'Cash Out', glyph: '🏧' },
  { key: 'payment', label: 'Payment', glyph: '🛍️' },
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

/** The badge on a deposit tile, written from the percent the cashier will
    actually credit.

    It used to be a free-text field the admin typed next to the percent, and
    nothing tied the two together — bKash sat on "+10% Bonus" while paying 5
    for as long as nobody noticed. There is now one number: whatever percent
    the admin sets is what the tile says. */
export function bonusBadge(percent: number): string {
  if (!Number.isFinite(percent) || percent <= 0) return '';
  return `+${percent}% Bonus`;
}

export function isImageIcon(icon: string) {
  return /^(https?:)?\/|^data:image\//.test(icon);
}
