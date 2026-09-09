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
  personal: 'Personal',
  agent: 'Agent',
  merchant: 'Merchant',
};

export const USE_LABEL: Record<PaymentAccountUse, string> = {
  deposit: 'Deposit',
  withdraw: 'Withdraw charge',
  both: 'Both',
};

/** Spelled out under the picker, because "Withdraw" on a number the operator
    *receives* on is easy to read backwards. */
export const USE_HELP: Record<PaymentAccountUse, string> = {
  deposit: 'Players send their deposits to this number',
  withdraw: 'Withdrawal agent charges are collected on this number',
  both: 'Both deposits and withdrawal charges come to this number',
};
