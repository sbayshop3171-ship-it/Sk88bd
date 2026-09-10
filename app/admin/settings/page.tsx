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
  if (!can(session.role, 'settings.write')) return <NoAccess role={session.role} what="Settings" />;

  const settings = await getSiteSettings();

  return (
    <>
      <h1 className="adm__h1">Settings</h1>

      <h2 className="adm__h2">Admin login</h2>
      <p className="adm__sub">
        The super admin's username and password live in the server's{' '}
        <code>.env.production</code> — <code>ADMIN_USERNAME</code> /{' '}
        <code>ADMIN_PASSWORD</code>. Changing them and restarting the app logs out every
        open session. This account cannot be deleted from any screen, so there is no way
        to lock yourself out of the panel entirely.
      </p>
      <p className="adm__sub">
        Admin and agent logins are managed in the <b>“Staff”</b> tab — create them there,
        change roles, reset passwords or disable them. An agent can only approve deposits
        and withdrawals and view players — <b>agents can never change payment numbers</b>.
        Admins can.
      </p>

      <h2 className="adm__h2">Limits, support &amp; notice</h2>
      <p className="adm__sub">
        Deposit and withdrawal minimums and maximums, the support button links and the
        scrolling notice on the home page — all live on save. Receiving numbers are in the “Payments” tab.
      </p>
      <SiteSettingsControl initial={settings} />

      <h2 className="adm__h2">Site</h2>
      <DataTable
        columns={['Key', 'Value']}
        rows={[
          ['Site name', BRAND.name],
          ['Domain', BRAND.domain],
          ['Currency', `${BRAND.currency} BDT`],
          ['Support email', settings.support.email || '—'],
        ]}
      />
    </>
  );
}
