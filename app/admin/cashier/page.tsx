import NoAccess from '@/components/admin/NoAccess';
import CashierConfigControl from '@/components/admin/CashierConfigControl';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { can } from '@/lib/admin-roles';
import { getCashierConfig } from '@/lib/cashier-config-store';
import { DEPOSIT_CHANNELS } from '@/lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The cashier the players see: deposit methods with their bonus, the amount
    chips, every line of copy, and the withdraw rules. */
export default async function AdminCashier() {
  const session = await getCurrentAdminSession();
  if (!session) return null;
  if (!can(session.role, 'cashier.config')) return <NoAccess role={session.role} what="Cashier setup" />;

  return (
    <>
      <h1 className="adm__h1">Cashier</h1>
      <p className="adm__sub">
        Everything the player sees on the deposit and withdraw pages — methods, bonus
        labels, amount chips, instructions, warnings, success messages — is set here, and
        goes live on save. The receiving numbers live in the “Payments” tab; each method
        uses a number from one of those channels.
      </p>
      <CashierConfigControl
        initial={await getCashierConfig()}
        channels={DEPOSIT_CHANNELS.map(({ id, name }) => ({ id, name }))}
      />
    </>
  );
}
