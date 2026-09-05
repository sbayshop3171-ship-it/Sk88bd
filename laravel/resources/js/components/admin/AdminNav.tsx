import { Link, usePage } from '@inertiajs/react';

const TABS = [
    { href: '/admin', label: 'ড্যাশবোর্ড' },
    { href: '/admin/deposits', label: 'ডিপোজিট' },
    { href: '/admin/withdrawals', label: 'উইথড্র' },
    { href: '/admin/users', label: 'ইউজার' },
    { href: '/admin/bets', label: 'বেট' },
    { href: '/admin/games', label: 'গেম' },
    { href: '/admin/promotions', label: 'প্রোমোশন' },
    { href: '/admin/banners', label: 'ব্যানার' },
    { href: '/admin/reports', label: 'রিপোর্ট' },
    { href: '/admin/ledger', label: 'লেজার' },
    { href: '/admin/audit', label: 'অডিট লগ' },
    { href: '/admin/settings', label: 'সেটিংস' },
];

export default function AdminNav() {
    const path = new URL(usePage().url, 'http://x').pathname;

    return (
        <nav className="adm__nav scroll-x">
            {TABS.map((t) => {
                const on = t.href === '/admin' ? path === '/admin' : path.startsWith(t.href);
                return (
                    <Link key={t.href} href={t.href} className={on ? 'on' : ''}>{t.label}</Link>
                );
            })}
        </nav>
    );
}
