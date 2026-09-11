import NoAccess from '@/components/admin/NoAccess';
import CashierControl from '@/components/admin/CashierControl';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { can } from '@/lib/admin-roles';
import { listCashier } from '@/lib/cashier';
import { isBackendReady } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminWithdrawals() {
  const session = await getCurrentAdminSession();
  if (!session) return null;
  if (!can(session.role, 'cashier.review')) return <NoAccess role={session.role} what="Withdrawal requests" />;

  const rows = await listCashier('withdrawals', 'pending');

  return (
    <>
      <h1 className="adm__h1">Withdrawal Requests</h1>
      <p className="adm__sub">
        The money leaves the player's balance when they send the handling-fee TrxID. A
        request with no TrxID keeps the balance whole until you approve, and approving
        takes it then — refused if they have played it away meanwhile, so reject it
        instead. Rejecting gives back whatever was taken. Lock rejects too, and also stops
        the player's withdrawals, with the reason you give shown on their My Account.
      </p>
      <CashierControl
        table="withdrawals"
        initialRows={rows.ok ? rows.data : []}
        initialError={rows.ok ? '' : rows.message ?? `Could not load the requests (${rows.reason})`}
        backendReady={isBackendReady()}
        canLock={can(session.role, 'players.lock')}
      />
    </>
  );
}
