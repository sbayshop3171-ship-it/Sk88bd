'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import Empty from '@/components/Empty';
import PageHeader from '@/components/PageHeader';
import { sumKind, useLedger } from '@/components/useLedger';
import { toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';
import { t } from '@/lib/strings';

/** Wagering requirement. `turnover_need` is set on the wallet when a bonus is
    granted and `turnover_done` is advanced by bets; both live on the wallet
    row so the header does not have to sum the ledger. Total bet volume comes
    from the ledger for the "so far" figure. */
export default function TurnoverPage() {
  const { wallet } = useAuth();
  const { ready, signedIn, rows } = useLedger(1000);

  const need = wallet?.turnover_need ?? 0;
  const done = wallet?.turnover_done ?? 0;
  const pct = need > 0 ? Math.min(100, Math.round((done / need) * 100)) : 0;
  const betVolume = -sumKind(rows ?? [], 'bet');

  return (
    <>
      <PageHeader title="টার্নওভার" />

      <div className="note" style={{ margin: 12 }}>
        বোনাস নেওয়ার পর নির্দিষ্ট টার্নওভার সম্পূর্ণ করলে ব্যালেন্স উইথড্র করা যাবে।
      </div>

      {ready && !signedIn && (
        <div className="wallet-bar">
          <Link href="/login" className="btn btn--ghost" style={{ padding: 12 }}>{t.login}</Link>
          <Link href="/register" className="btn btn--gold" style={{ padding: 12 }}>{t.register}</Link>
        </div>
      )}

      {signedIn && need > 0 && (
        <div className="tov">
          <div className="tov__hd">
            <span>চলমান টার্নওভার</span>
            <b>{pct}%</b>
          </div>
          <div className="tov__bar"><i style={{ width: `${pct}%` }} /></div>
          <div className="tov__row">
            <span>সম্পন্ন</span><b>{money(toTaka(done))}</b>
          </div>
          <div className="tov__row">
            <span>প্রয়োজন</span><b>{money(toTaka(need))}</b>
          </div>
          <div className="tov__row">
            <span>বাকি</span><b>{money(toTaka(Math.max(0, need - done)))}</b>
          </div>
        </div>
      )}

      {signedIn && need === 0 && (
        <Empty glyph="🔄" text="এখন কোনো চলমান টার্নওভার নেই — ব্যালেন্স উইথড্র করা যাবে।" />
      )}

      {signedIn && (
        <div className="stat" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
          <div><b>{money(toTaka(betVolume))}</b><small>মোট বেট ভলিউম</small></div>
          <div><b>{money(toTaka(wallet?.bonus_balance ?? 0))}</b><small>বোনাস ব্যালেন্স</small></div>
        </div>
      )}
    </>
  );
}
