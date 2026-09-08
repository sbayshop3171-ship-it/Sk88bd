'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { tabsFor, type AdminRole } from '@/lib/admin-roles';

export default function AdminNav({ role }: { role: AdminRole }) {
  const path = usePathname();
  return (
    <nav className="adm__nav scroll-x">
      {tabsFor(role).map((t) => {
        const on = t.href === '/admin' ? path === '/admin' : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={on ? 'on' : ''}>{t.label}</Link>
        );
      })}
    </nav>
  );
}
