import { Head, Link, router } from '@inertiajs/react';
import Footer from '../components/Footer';
import Header from '../components/Header';
import { taka } from '../lib/brand';
import { useAuth } from '../lib/auth';
import type { VipTier } from '../types';

/** [emoji, title, subtitle, where the player actually does it] */
const MISSIONS: [string, string, string, string][] = [
    ['💰', 'প্রথম ডিপোজিট', 'আজকের প্রথম ডিপোজিটে অতিরিক্ত বোনাস', '/deposit'],
    ['🎰', '১০টি স্লট রাউন্ড', 'যেকোনো স্লটে ১০ রাউন্ড খেলুন', '/casino?category=slot'],
    ['🏏', 'ক্রিকেট বেট', 'যেকোনো ক্রিকেট ম্যাচে বেট করুন', '/sports'],
    ['👥', 'একজন বন্ধু আনুন', 'রেফার করে বোনাস নিন', '/refer'],
];

interface Checkin {
    amount: number;
    turnoverMultiplier: number;
    claimedToday: boolean;
}

function Row({
    emoji,
    title,
    sub,
    action,
}: {
    emoji: string;
    title: string;
    sub: string;
    action: React.ReactNode;
}) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
            <span className="e" aria-hidden style={{ fontSize: 17 }}>{emoji}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{title}</span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>{sub}</span>
            </span>
            {action}
        </div>
    );
}

export default function Reward({ tiers, checkin }: { tiers: VipTier[]; checkin: Checkin }) {
    const { signedIn } = useAuth();

    const claim = () => router.post('/reward/check-in', {}, { preserveScroll: true });

    const checkinSub = checkin.amount > 0
        ? `প্রতিদিন ${taka(checkin.amount)} — ${checkin.turnoverMultiplier}x টার্নওভার শেষে তোলা যাবে`
        : 'এখন বন্ধ আছে';

    return (
        <>
            <Head title="রিওয়ার্ড সেন্টার" />
            <Header />
            <div className="hero">
                <h1>রিওয়ার্ড সেন্টার</h1>
                <p>ডেইলি মিশন সম্পূর্ণ করে বোনাস জিতুন</p>
            </div>

            <section className="sec">
                <div className="sec__hd"><h2 className="sec__title">ডেইলি মিশন</h2></div>
                <div className="list-card" style={{ margin: 0 }}>
                    <Row
                        emoji="📅"
                        title="দৈনিক চেক-ইন"
                        sub={checkinSub}
                        action={
                            !signedIn ? (
                                <Link href="/login" className="winners__play">লগইন</Link>
                            ) : checkin.claimedToday ? (
                                <span className="winners__play is-done">নেওয়া হয়েছে</span>
                            ) : (
                                <button type="button" className="winners__play" onClick={claim} disabled={checkin.amount <= 0}>
                                    নিন
                                </button>
                            )
                        }
                    />
                    {MISSIONS.map(([e, title, sub, href]) => (
                        <Row
                            key={title}
                            emoji={e}
                            title={title}
                            sub={sub}
                            action={<Link href={href} className="winners__play">শুরু</Link>}
                        />
                    ))}
                </div>
            </section>

            <section className="sec">
                <div className="sec__hd"><h2 className="sec__title">ভিআইপি লেভেল</h2></div>
                <div className="list-card" style={{ margin: 0 }}>
                    {tiers.map((v) => (
                        <div key={v.level} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', fontSize: 12.5, borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                            <span style={{ fontWeight: 800, color: 'var(--gold)', width: 58 }}>{v.level}</span>
                            <span style={{ color: 'var(--muted)', flex: 1 }}>রিবেট {v.rebate}</span>
                            <span style={{ fontWeight: 700 }}>{v.gift}</span>
                        </div>
                    ))}
                </div>
            </section>

            <Footer />
        </>
    );
}
