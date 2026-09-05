import SiteContentControl from '@/components/admin/SiteContentControl';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { getSiteContent } from '@/lib/site-content-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminBanners() {
  if (!(await getCurrentAdminSession())) return null;

  return (
    <>
      <h1 className="adm__h1">ব্যানার ও ঘোষণা</h1>
      <p className="adm__sub">
        হোম পেজের স্লাইডার আর প্রথমবার ঢুকলে দেখানো ঘোষণা পপআপ — দুটোই এখান থেকে
        বদলানো যায়। সেভ করার সাথে সাথে সাইটে দেখা যাবে।
      </p>
      <SiteContentControl initial={await getSiteContent()} />
    </>
  );
}
