'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { VIP_TIERS } from '@/lib/promotions';

/** Where each mission sends a signed-in player. A guest is sent to log in
    first, since none of these can be done without an account. */
const MISSIONS: [string, string, string, string][] = [
  ['📅', 'Daily check-in', 'Log in every day and take the bonus', '/member'],
  ['💰', 'First deposit', 'An extra bonus on today’s first deposit', '/deposit'],
  ['🎰', '10 slot rounds', 'Play 10 rounds on any slot', '/casino'],
  ['🏏', 'Cricket bet', 'Place a bet on any cricket match', '/sports'],
  ['👥', 'Bring a friend', 'Refer someone and take the bonus', '/refer'],
];

export default function RewardPage() {
  const { ready, session, profile } = useAuth();
  const signedIn = ready && Boolean(session);
  const level = profile?.vip_level ?? 0;

  return (
    <>
      <Header />
      <div className="hero">
        <h1>Reward Center</h1>
        <p>Finish the daily missions and win bonuses</p>
      </div>

      <section className="sec">
        <div className="sec__hd"><h2 className="sec__title">Daily Missions</h2></div>
        <div className="list-card" style={{ margin: 0 }}>
          {MISSIONS.map(([e, title, sub, href]) => (
            <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
              <span className="e" aria-hidden style={{ fontSize: 17 }}>{e}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{title}</span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>{sub}</span>
              </span>
              <Link href={signedIn ? href : '/login'} className="winners__play">Start</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="sec">
        <div className="sec__hd">
          <h2 className="sec__title">VIP Levels</h2>
          <div className="sec__ctrl"><Link href="/vip">Details</Link></div>
        </div>
        <div className="list-card" style={{ margin: 0 }}>
          {VIP_TIERS.map((v, i) => {
            const mine = signedIn && i + 1 === level;
            return (
              <div key={v.level} className={mine ? 'vip-now' : undefined}
                   style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', fontSize: 12.5, borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                <span style={{ fontWeight: 800, color: 'var(--gold)', width: 58 }}>{v.level}</span>
                <span style={{ color: 'var(--muted)', flex: 1 }}>Rebate {v.rebate}</span>
                <span style={{ fontWeight: 700 }}>{v.gift}</span>
                {mine && <span className="vip-tag">You</span>}
              </div>
            );
          })}
        </div>
      </section>

      <Footer />
    </>
  );
}
