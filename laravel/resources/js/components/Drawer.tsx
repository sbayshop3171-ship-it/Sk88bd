import { Link } from '@inertiajs/react';
import { t } from '../lib/strings';
import { BRAND } from '../lib/brand';
import { Wordmark } from './Header';
import { useUI } from '../providers/UIProvider';

type Item = [emoji: string, label: string, href: string];

const GAME_LINKS: Item[] = [
    ['🔥', 'হট গেমস', '/#sec-hot'],
    ['🏏', 'স্পোর্টস', '/sports'],
    ['🎲', 'লাইভ ক্যাসিনো', '/#sec-live'],
    ['🎰', 'স্লট', '/#sec-slot'],
    ['🃏', 'পোকার', '/#sec-poker'],
    ['🐟', 'ফিশিং', '/#sec-fish'],
    ['🎮', 'ই-স্পোর্টস', '/#sec-esports'],
    ['🎟️', 'লটারি', '/#sec-lottery'],
];

const ACCOUNT_LINKS: Item[] = [
    ['💰', 'ডিপোজিট', '/deposit'],
    ['💸', 'উইথড্র', '/withdraw'],
    ['📋', 'বেটিং রেকর্ড', '/bets-history'],
    ['📊', 'অ্যাকাউন্ট স্টেটমেন্ট', '/account-statement'],
    ['🎁', 'রিওয়ার্ড সেন্টার', '/reward'],
    ['👑', 'ভিআইপি ক্লাব', '/vip'],
    ['👥', 'বন্ধুদের রেফার করুন', '/refer'],
];

const SUPPORT_LINKS: Item[] = [
    ['🎧', 'কাস্টমার সাপোর্ট', '/support'],
    ['📱', 'অ্যাপ ডাউনলোড', '/download'],
    ['🛡️', 'সিকিউরিটি সেন্টার', '/security'],
    ['❓', 'হেল্প সেন্টার', '/support'],
];

function Group({ title, items, onNavigate }: { title: string; items: Item[]; onNavigate: () => void }) {
    return (
        <>
            <h4>{title}</h4>
            <ul>
                {items.map(([e, label, href]) => (
                    <li key={label}>
                        <Link href={href} onClick={onNavigate}>
                            <i className="e" aria-hidden>{e}</i>{label}
                        </Link>
                    </li>
                ))}
            </ul>
        </>
    );
}

export default function Drawer() {
    const { drawerOpen, closeDrawer } = useUI();

    return (
        <aside
            className={`drawer${drawerOpen ? ' on' : ''}`}
            aria-hidden={!drawerOpen}
            // keeps the closed drawer out of the tab order on wide viewports
            inert={!drawerOpen}
        >
            <div className="drawer__hd">
                <div className="logo"><Wordmark /><span className="logo__sub">{BRAND.tag}</span></div>
            </div>
            <Group title={t.gameCenter} items={GAME_LINKS} onNavigate={closeDrawer} />
            <Group title={t.myAccount} items={ACCOUNT_LINKS} onNavigate={closeDrawer} />
            <Group title={t.support} items={SUPPORT_LINKS} onNavigate={closeDrawer} />
        </aside>
    );
}
