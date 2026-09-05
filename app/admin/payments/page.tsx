import PaymentAccountsControl from '@/components/admin/PaymentAccountsControl';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { DEPOSIT_CHANNELS, WITHDRAW_CHANNELS } from '@/lib/payments';
import { MAX_PER_CHANNEL } from '@/lib/payment-accounts';
import { listAccounts } from '@/lib/payment-accounts-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Operator wallet numbers. The deposit screen pulls one at random from what
    is active here, so adding several spreads players across them. */
export default async function AdminPayments() {
  if (!(await getCurrentAdminSession())) return null;

  const seen = new Set<string>();
  const channels = [...DEPOSIT_CHANNELS, ...WITHDRAW_CHANNELS]
    .filter((c) => (seen.has(c.id) ? false : seen.add(c.id)))
    .map(({ id, name, glyph, art }) => ({ id, name, glyph, art }));

  return (
    <>
      <h1 className="adm__h1">পেমেন্ট অ্যাকাউন্ট</h1>
      <p className="adm__sub">
        bKash, Nagad সহ প্রতিটি চ্যানেলে সর্বোচ্চ {MAX_PER_CHANNEL} টি নাম্বার রাখা
        যায়। প্লেয়ার ডিপোজিট পেজে গেলে সক্রিয় নাম্বারগুলো থেকে একটি র‍্যান্ডম নাম্বার
        দেখানো হয় — প্রতিবার আলাদা।
      </p>
      <PaymentAccountsControl channels={channels} initialAccounts={await listAccounts()} />
    </>
  );
}
