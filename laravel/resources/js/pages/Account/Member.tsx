import { Head, Link, router } from '@inertiajs/react';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import { useAuth } from '../../lib/auth';
import { taka } from '../../lib/brand';
import { t } from '../../lib/strings';

type Row = [emoji: string, label: string, href: string];

const WALLET: Row[] = [
    ['💰', 'ডিপোজিট', '/deposit'],
    ['💸', 'উইথড্র', '/withdraw'],
    ['📊', 'ব্যালেন্স ওভারভিউ', '/balance-overview'],
    ['🔄', 'টার্নওভার', '/turnover'],
];

const RECORDS: Row[] = [
    ['📋', 'বেটিং রেকর্ড', '/bets-history'],
    ['🧾', 'অ্যাকাউন্ট স্টেটমেন্ট', '/account-statement'],
    ['💰', 'ডিপোজিট হিস্টোরি', '/deposit-history'],
    ['💸', 'উইথড্র হিস্টোরি', '/withdraw-history'],
];

const ACCOUNT: Row[] = [
    ['👤', 'আমার প্রোফাইল', '/my-profile'],
    ['🛡️', 'সিকিউরিটি সেন্টার', '/security'],
    ['👑', 'ভিআইপি ক্লাব', '/vip'],
    ['👥', 'রেফার ও কমিশন', '/refer'],
    ['🎁', 'রিওয়ার্ড সেন্টার', '/reward'],
    ['🎧', 'কাস্টমার সাপোর্ট', '/support'],
];

function List({ rows }: { rows: Row[] }) {
    return (
        <div className="list-card">
            {rows.map(([e, label, href]) => (
                <Link key={href + label} href={href}>
                    <span className="e" aria-hidden>{e}</span>
                    {label}
                    <span className="arrow" aria-hidden>›</span>
                </Link>
            ))}
        </div>
    );
}

export default function Member() {
    const { user, wallet, signedIn } = useAuth();

    return (
        <>
            <Head title="অ্যাকাউন্ট" />
            <Header />

            <div className="profile">
                <i className="profile__av" aria-hidden>👤</i>
                <div style={{ minWidth: 0 }}>
                    <div className="profile__n">
                        {signedIn ? (user?.display_name || user?.phone || 'প্লেয়ার') : 'গেস্ট'}
                    </div>
                    <div className="profile__id">
                        {signedIn ? `VIP ${user?.vip_level ?? 0} · ${user?.referral_code ?? ''}` : 'লগইন করুন'}
                    </div>
                </div>
                <div className="profile__bal">
                    <b>{taka(wallet?.balance ?? 0)}</b>
                    <small>ব্যালেন্স</small>
                </div>
            </div>

            {signedIn ? (
                <div className="wallet-bar">
                    <Link href="/deposit" className="btn btn--gold" style={{ padding: 12 }}>{t.deposit}</Link>
                    <Link href="/withdraw" className="btn btn--ghost" style={{ padding: 12 }}>{t.withdraw}</Link>
                </div>
            ) : (
                <div className="wallet-bar">
                    <Link href="/login" className="btn btn--ghost" style={{ padding: 12 }}>{t.login}</Link>
                    <Link href="/register" className="btn btn--gold" style={{ padding: 12 }}>{t.register}</Link>
                </div>
            )}

            <List rows={WALLET} />
            <List rows={RECORDS} />
            <List rows={ACCOUNT} />

            {signedIn && user?.role === 'admin' && (
                <div className="list-card">
                    <Link href="/admin">
                        <span className="e" aria-hidden>🛠️</span>
                        অ্যাডমিন প্যানেল
                        <span className="arrow" aria-hidden>›</span>
                    </Link>
                </div>
            )}

            {signedIn && (
                <div className="list-card">
                    <button type="button" onClick={() => router.post('/logout')}>
                        <span className="e" aria-hidden>🚪</span>
                        {t.logout}
                        <span className="arrow" aria-hidden>›</span>
                    </button>
                </div>
            )}

            <Footer />
        </>
    );
}
