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
        Nothing leaves the player's balance until you approve — approving takes the
        amount then. If they have played the money away while the request waited, the
        approval is refused and you reject it instead. Rejecting leaves the balance as it
        is. Lock rejects too, and also stops the player's withdrawals, with the reason you
        give shown on their My Account.
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
