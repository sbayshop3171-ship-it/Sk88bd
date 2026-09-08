import NoAccess from '@/components/admin/NoAccess';
import SiteContentControl from '@/components/admin/SiteContentControl';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { can } from '@/lib/admin-roles';
import { getSiteContent } from '@/lib/site-content-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminBanners() {
  const session = await getCurrentAdminSession();
  if (!session) return null;
  if (!can(session.role, 'content.write')) return <NoAccess role={session.role} what="ব্যানার ও ঘোষণা" />;

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
