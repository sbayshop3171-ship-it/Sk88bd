'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { tabsFor, type AdminPermission } from '@/lib/admin-roles';
import { panelHref, type PanelBase } from '@/lib/panel-base';

/** `base` is the door the panel was entered by — /admin for the operator,
    /agent for an agent. Every tab points back through it, so an agent never
    picks up the operator's URL by clicking around. */
export default function AdminNav({ permissions, base }: { permissions: AdminPermission[]; base: PanelBase }) {
  const path = usePathname() ?? '';
  return (
    <nav className="adm__nav scroll-x">
      {tabsFor({ permissions }).map((t) => {
        const href = panelHref(base, t.href);
        const on = href === base ? path === base : path.startsWith(href);
        return (
          <Link key={t.href} href={href} className={on ? 'on' : ''}>{t.label}</Link>
        );
      })}
    </nav>
  );
}
