import CashierControl from '@/components/admin/CashierControl';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { listCashier } from '@/lib/cashier';
import { isBackendReady } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminWithdrawals() {
  if (!(await getCurrentAdminSession())) return null;

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
