'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import PageHeader from '@/components/PageHeader';
import { sumKind, useLedger } from '@/components/useLedger';
import { toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';
import { VIP_TIERS } from '@/lib/promotions';
import { t } from '@/lib/strings';

/** The tier ladder, with the player's own level marked and how far they are
    from the next one. Level is set by the admin (profiles.vip_level); the
    progress figure is total bet volume from the ledger. */
export default function VipPage() {
  const { profile } = useAuth();
  const { ready, signedIn, rows } = useLedger(1000);

  const level = profile?.vip_level ?? 0;
  const volume = -sumKind(rows ?? [], 'bet');
  const next = VIP_TIERS[level] ?? null;        // VIP_TIERS[0] is "VIP 1"
  const pct = next ? Math.min(100, Math.round((toTaka(volume) / next.need) * 100)) : 100;

  return (
    <>
      <PageHeader title="VIP Club" />
      <div className="vip-hero">
        <Image src="/games/exclusive-vip.webp" alt="" width={112} height={112} priority />
        <div>
          <h1>VIP Club</h1>
          <p>The more you play, the more rebate and rewards you get</p>
        </div>
      </div>

      {signedIn && (
        <div className="vip-prog">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>Your level: <b>VIP {level}</b></span>
            {next ? <span>Next: <b>{next.level}</b></span> : <span><b>Top level</b></span>}
          </div>
          <div className="tov__bar"><i style={{ width: `${pct}%` }} /></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, color: 'var(--muted)' }}>
            <span>Bet volume {money(toTaka(volume))}</span>
            {next && <span>Needs {money(next.need)}</span>}
          </div>
        </div>
      )}

      {ready && !signedIn && (
        <div className="wallet-bar">
          <Link href="/login" className="btn btn--ghost" style={{ padding: 12 }}>{t.login}</Link>
          <Link href="/register" className="btn btn--gold" style={{ padding: 12 }}>{t.register}</Link>
        </div>
      )}

      <div className="list-card">
        {VIP_TIERS.map((v, i) => {
          const mine = signedIn && i + 1 === level;
          return (
            <div key={v.level} className={mine ? 'vip-now' : undefined}
                 style={{ padding: '13px 14px', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <b style={{ color: 'var(--gold)', fontSize: 14 }}>{v.level}</b>
                {mine && <span className="vip-tag">You</span>}
                <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700 }}>{v.gift}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                Turnover required {money(v.need)} · rebate {v.rebate}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
