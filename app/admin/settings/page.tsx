import { BRAND } from '@/lib/brand';
import DataTable from '@/components/admin/DataTable';
import SiteSettingsControl from '@/components/admin/SiteSettingsControl';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { getSiteSettings } from '@/lib/site-settings-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminSettings() {
  if (!(await getCurrentAdminSession())) return null;

  const settings = await getSiteSettings();

  return (
    <>
      <h1 className="adm__h1">সেটিংস</h1>

      <h2 className="adm__h2">অ্যাডমিন লগইন</h2>
      <p className="adm__sub">
        ইউজারনেম <b>admin</b>, পাসওয়ার্ড কোডে নির্দিষ্ট করা আছে
        (<code>lib/admin-auth.ts</code>)। বদলাতে হলে সার্ভারের{' '}
        <code>.env.production</code> এ <code>ADMIN_USERNAME</code> /{' '}
        <code>ADMIN_PASSWORD</code> দিন, তারপর অ্যাপ রিস্টার্ট করুন — বদলালে
        চালু সেশনগুলো লগআউট হয়ে যাবে।
      </p>

      <h2 className="adm__h2">লিমিট, সাপোর্ট ও নোটিশ</h2>
      <p className="adm__sub">
        ডিপোজিট / উইথড্রের সর্বনিম্ন-সর্বোচ্চ, সাপোর্ট বাটনের লিংক আর হোম পেজের
        চলমান নোটিশ — সেভ করলেই সাইটে বদলে যায়। রিসিভিং নাম্বার “পেমেন্ট” ট্যাবে।
      </p>
      <SiteSettingsControl initial={settings} />

      <h2 className="adm__h2">সাইট</h2>
      <DataTable
        columns={['কী', 'মান']}
        rows={[
          ['সাইটের নাম', BRAND.name],
          ['ডোমেইন', BRAND.domain],
          ['কারেন্সি', `${BRAND.currency} BDT`],
          ['সাপোর্ট ইমেইল', settings.support.email || '—'],
        ]}
      />
    </>
  );
}
