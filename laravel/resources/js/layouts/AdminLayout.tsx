import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import AdminNav from '../components/admin/AdminNav';
import { UIProvider } from '../providers/UIProvider';
import { BRAND } from '../lib/brand';

/** The admin area opts out of the player shell: no bottom nav, no floating
    support buttons, and a wider column than the phone-width site. */
export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <UIProvider>
            <div className="adm">
                <header className="adm__hd">
                    <Link href="/admin" className="adm__brand">
                        {BRAND.name} <span>অ্যাডমিন</span>
                    </Link>
                    <Link href="/" className="btn btn--ghost" style={{ fontSize: 12, padding: '6px 14px' }}>
                        সাইট দেখুন
                    </Link>
                </header>

                <AdminNav />

                <main className="adm__body">{children}</main>
            </div>
        </UIProvider>
    );
}
