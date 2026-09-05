import { Link, usePage } from '@inertiajs/react';
import { t } from '../lib/strings';
import { GiftIcon, HomeIcon, MedalIcon, UserIcon, UsersIcon } from './Icons';

const NAV = [
    { href: '/', label: t.navHome, Icon: HomeIcon },
    { href: '/promotions', label: t.navPromotion, Icon: GiftIcon },
    { href: '/refer', label: t.navInvite, Icon: UsersIcon, mid: true },
    { href: '/reward', label: t.navReward, Icon: MedalIcon },
    { href: '/member', label: t.navMember, Icon: UserIcon },
];

export default function BottomNav() {
    const path = new URL(usePage().url, 'http://x').pathname;

    return (
        <nav className="nav" aria-label="প্রধান মেনু">
            {NAV.map(({ href, label, Icon, mid }) => {
                const active = href === '/' ? path === '/' : path.startsWith(href);
                const cls = [mid ? 'mid' : '', active ? 'on' : ''].filter(Boolean).join(' ');
                return (
                    <Link key={href} href={href} className={cls} aria-current={active ? 'page' : undefined}>
                        {mid ? <i className="bubble"><Icon /></i> : <Icon />}
                        <span>{label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
