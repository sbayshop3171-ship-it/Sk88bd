import DataTable from '@/components/admin/DataTable';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';

export default async function AdminUsers() {
  if (!(await getCurrentAdminSession())) return null;

  return (
    <>
      <h1 className="adm__h1">ইউজার</h1>
      <p className="adm__sub">ব্যালেন্স অ্যাডজাস্ট, ব্লক/আনব্লক, VIP লেভেল ও রেফারেল দেখা যাবে।</p>
      <DataTable
        columns={['ইউজার', 'ফোন', 'ব্যালেন্স', 'VIP', 'রেফার কোড', 'রেজিস্ট্রেশন', 'স্ট্যাটাস', '']}
        rows={[]}
        empty="কোনো ইউজার নেই।"
      />
    </>
  );
}
