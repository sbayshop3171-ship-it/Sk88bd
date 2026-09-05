'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/admin', label: 'ড্যাশবোর্ড' },
  { href: '/admin/deposits', label: 'ডিপোজিট' },
  { href: '/admin/withdrawals', label: 'উইথড্র' },
  { href: '/admin/users', label: 'ইউজার' },
  { href: '/admin/payments', label: 'পেমেন্ট' },
  { href: '/admin/games', label: 'গেম' },
  { href: '/admin/aviator-signal', label: 'সিগন্যাল' },
  { href: '/admin/app-keys', label: 'অ্যাপ কী' },
  { href: '/admin/banners', label: 'ব্যানার' },
  { href: '/admin/settings', label: 'সেটিংস' },
];

export default function AdminNav() {
  const path = usePathname();
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
