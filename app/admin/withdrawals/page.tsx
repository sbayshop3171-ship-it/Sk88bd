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
  if (!can(session.role, 'cashier.review')) return <NoAccess role={session.role} what="উইথড্র রিকোয়েস্ট" />;

  const rows = await listCashier('withdrawals', 'pending');

  return (
    <>
      <h1 className="adm__h1">উইথড্র রিকোয়েস্ট</h1>
      <p className="adm__sub">
        রিকোয়েস্ট করার সময়েই টাকা প্লেয়ারের ব্যালেন্স থেকে সরিয়ে রাখা হয়, তাই
        অপেক্ষায় থাকা টাকা দিয়ে সে আর খেলতে পারে না। বাতিল করলে টাকা তার
        ব্যালেন্সে ফেরত যায়।
      </p>
      <CashierControl
        table="withdrawals"
        initialRows={rows.ok ? rows.data : []}
        backendReady={isBackendReady()}
      />
    </>
  );
}
