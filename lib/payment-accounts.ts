/** Shared shape of an operator payment account.

    Kept apart from payment-accounts-store.ts because that one reads and writes
    .data/ through node:fs — importing it from a client component drags the
    whole server module into the browser bundle. Everything here is pure, so
    both the admin screen and the deposit screen can import it. */

export const MAX_PER_CHANNEL = 5;

export type PaymentAccountStatus = 'active' | 'disabled';
export type PaymentAccountKind = 'personal' | 'agent' | 'merchant';
export type PaymentAccountUse = 'deposit' | 'withdraw' | 'both';

export type PaymentAccount = {
  id: string;
  channelId: string;
  /** wallet number, bank account, or USDT address */
  number: string;
  /** account holder name shown to the player */
  holder: string;
  kind: PaymentAccountKind;
  use: PaymentAccountUse;
  /** extra line under the number, e.g. a bank branch or USDT network */
  note: string;
  status: PaymentAccountStatus;
  /** relative chance of being picked, 1-10 */
  weight: number;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentAccountInput = {
  channelId: string;
  number: string;
  holder: string;
  kind: PaymentAccountKind;
  use: PaymentAccountUse;
  note: string;
  status: PaymentAccountStatus;
  weight: number;
};

/** What the player is shown. No id, no counters, no admin metadata. */
export type PublicDepositAccount = {
  channelId: string;
  channelName: string;
  number: string;
  holder: string;
  kind: PaymentAccountKind;
  note: string;
};

export type AccountMutationReason =
  | 'unknown-channel'
  | 'channel-full'
  | 'invalid-number'
  | 'duplicate-number'
  | 'invalid-holder'
  | 'not-found';

export type AccountMutationResult =
  | { ok: true; accounts: PaymentAccount[] }
  | { ok: false; reason: AccountMutationReason };

export const KIND_LABEL: Record<PaymentAccountKind, string> = {
  personal: 'পার্সোনাল',
  agent: 'এজেন্ট',
  merchant: 'মার্চেন্ট',
};

export const USE_LABEL: Record<PaymentAccountUse, string> = {
  deposit: 'ডিপোজিট',
  withdraw: 'উইথড্র চার্জ',
  both: 'দুটোই',
};

/** Spelled out under the picker, because "উইথড্র" on a number the operator
    *receives* on is easy to read backwards. */
export const USE_HELP: Record<PaymentAccountUse, string> = {
  deposit: 'প্লেয়ার এই নাম্বারে ডিপোজিট পাঠাবে',
  withdraw: 'উত্তোলনের এজেন্ট চার্জ এই নাম্বারে জমা হবে',
  both: 'ডিপোজিট আর উত্তোলনের চার্জ — দুটোই এই নাম্বারে',
};
