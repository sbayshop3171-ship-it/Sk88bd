'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { VIP_TIERS } from '@/lib/promotions';

/** Where each mission sends a signed-in player. A guest is sent to log in
    first, since none of these can be done without an account. */
const MISSIONS: [string, string, string, string][] = [
  ['📅', 'দৈনিক চেক-ইন', 'প্রতিদিন লগইন করে বোনাস নিন', '/member'],
  ['💰', 'প্রথম ডিপোজিট', 'আজকের প্রথম ডিপোজিটে অতিরিক্ত বোনাস', '/deposit'],
  ['🎰', '১০টি স্লট রাউন্ড', 'যেকোনো স্লটে ১০ রাউন্ড খেলুন', '/casino'],
  ['🏏', 'ক্রিকেট বেট', 'যেকোনো ক্রিকেট ম্যাচে বেট করুন', '/sports'],
  ['👥', 'একজন বন্ধু আনুন', 'রেফার করে বোনাস নিন', '/refer'],
];

export default function RewardPage() {
  const { ready, session, profile } = useAuth();
  const signedIn = ready && Boolean(session);
  const level = profile?.vip_level ?? 0;

  return (
    <>
      <Header />
      <div className="hero">
        <h1>রিওয়ার্ড সেন্টার</h1>
        <p>ডেইলি মিশন সম্পূর্ণ করে বোনাস জিতুন</p>
      </div>

      <section className="sec">
        <div className="sec__hd"><h2 className="sec__title">ডেইলি মিশন</h2></div>
        <div className="list-card" style={{ margin: 0 }}>
          {MISSIONS.map(([e, title, sub, href]) => (
            <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
              <span className="e" aria-hidden style={{ fontSize: 17 }}>{e}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{title}</span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>{sub}</span>
              </span>
              <Link href={signedIn ? href : '/login'} className="winners__play">শুরু</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="sec">
        <div className="sec__hd">
          <h2 className="sec__title">ভিআইপি লেভেল</h2>
          <div className="sec__ctrl"><Link href="/vip">বিস্তারিত</Link></div>
        </div>
        <div className="list-card" style={{ margin: 0 }}>
          {VIP_TIERS.map((v, i) => {
            const mine = signedIn && i + 1 === level;
            return (
              <div key={v.level} className={mine ? 'vip-now' : undefined}
                   style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', fontSize: 12.5, borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                <span style={{ fontWeight: 800, color: 'var(--gold)', width: 58 }}>{v.level}</span>
                <span style={{ color: 'var(--muted)', flex: 1 }}>রিবেট {v.rebate}</span>
                <span style={{ fontWeight: 700 }}>{v.gift}</span>
                {mine && <span className="vip-tag">আপনি</span>}
              </div>
            );
          })}
        </div>
      </section>

      <Footer />
    </>
  );
}
