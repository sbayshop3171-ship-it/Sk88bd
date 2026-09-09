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
        The money is held aside the moment a request is made, so a player cannot gamble
        with funds that are already on their way out. Rejecting a request returns the
        money to their balance.
      </p>
      <CashierControl
        table="withdrawals"
        initialRows={rows.ok ? rows.data : []}
        backendReady={isBackendReady()}
      />
    </>
  );
}
