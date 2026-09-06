import { BRAND } from '@/lib/brand';
import AdminPasswordPanel from '@/components/admin/AdminPasswordPanel';
import DataTable from '@/components/admin/DataTable';
import SiteSettingsControl from '@/components/admin/SiteSettingsControl';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { getSiteSettings } from '@/lib/site-settings-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminSettings() {
  if (!(await getCurrentAdminSession())) return null;

  return (
    <>
      <h1 className="adm__h1">সেটিংস</h1>

      <AdminPasswordPanel />

      <h2 className="adm__h2">লিমিট, সাপোর্ট ও নোটিশ</h2>
      <p className="adm__sub">
        ডিপোজিট / উইথড্রের সর্বনিম্ন-সর্বোচ্চ, সাপোর্ট বাটনের লিংক আর হোম পেজের
        চলমান নোটিশ — সেভ করলেই সাইটে বদলে যায়। রিসিভিং নাম্বার “পেমেন্ট” ট্যাবে।
      </p>
      <SiteSettingsControl initial={await getSiteSettings()} />

      <h2 className="adm__h2">সাইট</h2>
      <DataTable
        columns={['কী', 'মান']}
        rows={[
          ['সাইটের নাম', BRAND.name],
          ['ডোমেইন', BRAND.domain],
          ['কারেন্সি', `${BRAND.currency} BDT`],
          ['সাপোর্ট ইমেইল', BRAND.email],
        ]}
      />
    </>
  );
}
