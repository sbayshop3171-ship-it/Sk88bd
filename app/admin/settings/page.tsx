import NoAccess from '@/components/admin/NoAccess';
import { BRAND } from '@/lib/brand';
import DataTable from '@/components/admin/DataTable';
import SiteSettingsControl from '@/components/admin/SiteSettingsControl';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { can } from '@/lib/admin-roles';
import { getSiteSettings } from '@/lib/site-settings-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminSettings() {
  const session = await getCurrentAdminSession();
  if (!session) return null;
  if (!can(session.role, 'settings.write')) return <NoAccess role={session.role} what="সেটিংস" />;

  const settings = await getSiteSettings();

  return (
    <>
      <h1 className="adm__h1">সেটিংস</h1>

      <h2 className="adm__h2">অ্যাডমিন লগইন</h2>
      <p className="adm__sub">
        সুপার অ্যাডমিনের ইউজারনেম ও পাসওয়ার্ড সার্ভারের{' '}
        <code>.env.production</code> এ — <code>ADMIN_USERNAME</code> /{' '}
        <code>ADMIN_PASSWORD</code>। বদলে অ্যাপ রিস্টার্ট করলে চালু সেশনগুলো
        লগআউট হয়ে যাবে। এই অ্যাকাউন্টটি কোনো স্ক্রিন থেকে মোছা যায় না, তাই
        প্যানেল থেকে পুরোপুরি বেরিয়ে যাওয়ার ভয় নেই।
      </p>
      <p className="adm__sub">
        অ্যাডমিন আর এজেন্টদের লগইন <b>“স্টাফ”</b> ট্যাব থেকে — সেখানে বানানো,
        রোল বদলানো, পাসওয়ার্ড রিসেট বা বন্ধ করা যায়। এজেন্ট শুধু ডিপোজিট-উইথড্র
        অনুমোদন আর ইউজার দেখতে পারে; <b>পেমেন্ট নাম্বার শুধু সুপার অ্যাডমিন</b>{' '}
        বদলাতে পারেন।
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
