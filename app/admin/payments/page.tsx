import NoAccess from '@/components/admin/NoAccess';
import PaymentAccountsControl from '@/components/admin/PaymentAccountsControl';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { can } from '@/lib/admin-roles';
import { DEPOSIT_CHANNELS, WITHDRAW_CHANNELS } from '@/lib/payments';
import { MAX_PER_CHANNEL } from '@/lib/payment-accounts';
import { listAccounts } from '@/lib/payment-accounts-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Operator wallet numbers. The deposit screen pulls one at random from what
    is active here, so adding several spreads players across them. */
export default async function AdminPayments() {
  const session = await getCurrentAdminSession();
  if (!session) return null;
  if (!can(session, 'payments.read')) return <NoAccess what="Payment accounts" />;

  const seen = new Set<string>();
  const channels = [...DEPOSIT_CHANNELS, ...WITHDRAW_CHANNELS]
    .filter((c) => (seen.has(c.id) ? false : seen.add(c.id)))
    .map(({ id, name, glyph, art }) => ({ id, name, glyph, art }));

  return (
    <>
      <h1 className="adm__h1">Payment Accounts</h1>
      <p className="adm__sub">
        Every channel — bKash, Nagad and the rest — can hold up to {MAX_PER_CHANNEL}
        numbers. When a player opens the deposit page one of the active numbers is picked
        at random — a different one each time.
      </p>
      <PaymentAccountsControl
        channels={channels}
        initialAccounts={await listAccounts()}
        canWrite={can(session, 'payments.write')}
      />
    </>
  );
}
