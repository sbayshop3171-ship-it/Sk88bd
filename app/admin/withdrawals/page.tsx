import DataTable from '@/components/admin/DataTable';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';

export default async function AdminWithdrawals() {
  if (!(await getCurrentAdminSession())) return null;

  return (
    <>
      <h1 className="adm__h1">উইথড্র রিকোয়েস্ট</h1>
      <p className="adm__sub">
        অনুমোদনের আগে টার্নওভার সম্পূর্ণ হয়েছে কিনা দেখে নিন।
      </p>
      <DataTable
        columns={['#', 'ইউজার', 'চ্যানেল', 'পরিমাণ', 'অ্যাকাউন্ট', 'টার্নওভার', 'সময়', 'স্ট্যাটাস', '']}
        rows={[]}
        empty="কোনো পেন্ডিং উইথড্র নেই।"
      />
    </>
  );
}
