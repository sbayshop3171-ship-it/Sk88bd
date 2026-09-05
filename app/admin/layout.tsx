import Link from 'next/link';
import type { Metadata } from 'next';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminLogoutButton from '@/components/admin/AdminLogoutButton';
import AdminNav from '@/components/admin/AdminNav';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { BRAND } from '@/lib/brand';
import { isBackendReady } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${BRAND.name} — অ্যাডমিন`,
  robots: { index: false, follow: false },
};

/** The admin area opts out of the player shell: no bottom nav, no floating
    support buttons, and a wider column than the phone-width site. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentAdminSession();

  if (!session) {
    return <AdminLogin />;
  }

  return (
    <div className="adm">
      <header className="adm__hd">
        <Link href="/admin" className="adm__brand">
          {BRAND.name} <span>অ্যাডমিন</span>
        </Link>
        <div className="adm__hd-actions">
          <span className="adm__user">{session.username}</span>
          <Link href="/" className="btn btn--ghost adm__site-link">
            সাইট দেখুন
          </Link>
          <AdminLogoutButton />
        </div>
      </header>

      <AdminNav />

      {!isBackendReady() && (
        <div className="adm__warn">
          ডেটাবেস যুক্ত হয়নি — <code>.env.local</code> এ Supabase কী বসালে সব
          স্ক্রিন লাইভ ডেটা দেখাবে। এখন শুধু ইন্টারফেস দেখা যাচ্ছে।
        </div>
      )}

      <main className="adm__body">{children}</main>
    </div>
  );
}
