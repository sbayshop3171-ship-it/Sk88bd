import Link from 'next/link';
import type { Metadata } from 'next';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminLogoutButton from '@/components/admin/AdminLogoutButton';
import AdminNav from '@/components/admin/AdminNav';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { ROLE_LABEL } from '@/lib/admin-roles';
import { BRAND } from '@/lib/brand';
import { panelBase } from '@/lib/panel-base-next';
import { isBackendReady } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The tab title follows the door too — an agent's browser history should
    not read "Admin" either. */
export async function generateMetadata(): Promise<Metadata> {
  const base = await panelBase();
  return {
    title: `${BRAND.name} — ${base === '/agent' ? 'এজেন্ট' : 'Admin'}`,
    robots: { index: false, follow: false },
  };
}

/** The admin area opts out of the player shell: no bottom nav, no floating
    support buttons, and a wider column than the phone-width site. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentAdminSession();
  const base = await panelBase();

  if (!session) {
    return <AdminLogin base={base} />;
  }

  return (
    <div className="adm">
      <header className="adm__hd">
        <Link href={base} className="adm__brand">
          {BRAND.name} <span>{base === '/agent' ? 'এজেন্ট' : 'Admin'}</span>
        </Link>
        <div className="adm__hd-actions">
          <span className="adm__user">
            {session.username} <small>{ROLE_LABEL[session.role]}</small>
          </span>
          <Link href="/" className="btn btn--ghost adm__site-link">
            View site
          </Link>
          <AdminLogoutButton />
        </div>
      </header>

      <AdminNav role={session.role} base={base} />

      {!isBackendReady() && (
        <div className="adm__warn">
          The database is not connected — put the Supabase keys in <code>.env.local</code>
          and every screen shows live data. Right now this is the interface only.
        </div>
      )}

      <main className="adm__body">{children}</main>
    </div>
  );
}
