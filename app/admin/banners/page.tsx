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
  if (!can(session.role, 'content.write')) return <NoAccess role={session.role} what="Banners and announcements" />;

  return (
    <>
      <h1 className="adm__h1">Banners &amp; Announcements</h1>
      <p className="adm__sub">
        The home page slider and the announcement popup shown on a first visit are both
        edited here. Changes appear on the site the moment you save.
      </p>
      <SiteContentControl initial={await getSiteContent()} />
    </>
  );
}
