import DataTable from '@/components/admin/DataTable';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';

export default async function AdminBanners() {
  if (!(await getCurrentAdminSession())) return null;

  return (
    <>
      <h1 className="adm__h1">ব্যানার ও ঘোষণা</h1>
      <p className="adm__sub">
        হোম পেজের স্লাইডার ও শুরুতে দেখানো ঘোষণা পপআপের ছবি এখান থেকে বদলানো যাবে।
      </p>
      <DataTable
        columns={['শিরোনাম', 'অবস্থান', 'ছবি', 'লিংক', 'সক্রিয়', 'ক্রম', '']}
        rows={[]}
        empty="কোনো ব্যানার নেই — ডেটাবেস যুক্ত হলে যোগ করা যাবে।"
      />
    </>
  );
}
