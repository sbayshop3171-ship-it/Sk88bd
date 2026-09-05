import DataTable from '@/components/admin/DataTable';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';

export default async function AdminDeposits() {
  if (!(await getCurrentAdminSession())) return null;

  return (
    <>
      <h1 className="adm__h1">ডিপোজিট রিকোয়েস্ট</h1>
      <p className="adm__sub">
        অনুমোদন করলে প্লেয়ারের ওয়ালেটে টাকা যোগ হবে এবং লেজারে এন্ট্রি হবে।
      </p>
      <DataTable
        columns={['#', 'ইউজার', 'চ্যানেল', 'পরিমাণ', 'সেন্ডার', 'TxnID', 'সময়', 'স্ট্যাটাস', '']}
        rows={[]}
        empty="কোনো পেন্ডিং ডিপোজিট নেই।"
      />
    </>
  );
}
