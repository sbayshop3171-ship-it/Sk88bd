import CashierControl from '@/components/admin/CashierControl';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { listCashier } from '@/lib/cashier';
import { isBackendReady } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminDeposits() {
  if (!(await getCurrentAdminSession())) return null;

  const rows = await listCashier('deposits', 'pending');

  return (
    <>
      <h1 className="adm__h1">ডিপোজিট রিকোয়েস্ট</h1>
      <p className="adm__sub">
        অনুমোদন করলে প্লেয়ারের ওয়ালেটে টাকা যোগ হবে এবং লেজারে এন্ট্রি হবে —
        দুটো একসাথে, একটা হয়ে অন্যটা বাদ পড়ার সুযোগ নেই। একই রিকোয়েস্টে দুবার
        চাপলেও টাকা একবারই যাবে।
      </p>
      <CashierControl
        table="deposits"
        initialRows={rows.ok ? rows.data : []}
        backendReady={isBackendReady()}
      />
    </>
  );
}
