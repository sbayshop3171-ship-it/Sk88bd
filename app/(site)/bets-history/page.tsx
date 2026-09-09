'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import Empty from '@/components/Empty';
import PageHeader from '@/components/PageHeader';
import { useLedger, when, type LedgerRow } from '@/components/useLedger';
import { toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';
import { findGame } from '@/lib/catalogue';
import { t } from '@/lib/strings';

/* ============================================================
   Betting Record.

   Laid out the way the reference does it: a tab per product, a
   date range and a game filter over the list, and the four
   figures that actually get read — staked, valid, won, net — kept
   in a bar at the bottom of the screen rather than at the top,
   so they are still there after scrolling through a day of bets.

   Every bet we settle today runs on our own engine, and the
   reference files that kind of game under Slot, so ours land
   there too. The other four tabs are real and will fill the day
   an aggregator is wired up; until then they say so.
   ============================================================ */

type Cat = 'slot' | 'live' | 'poker' | 'fish' | 'sports';

const TABS: [Cat, string][] = [
  ['slot', 'Slot'],
  ['live', 'Live'],
  ['poker', 'Poker'],
  ['fish', 'Fish'],
  ['sports', 'Sports'],
];

type Bet = {
  key: string;
  game: string;
  name: string;
  cat: Cat;
  round: string;
  stake: number;
  payout: number;
  multiplier: number | null;
  at: string;
  settled: boolean;
};

/** `<game>:<round>[:<slot>]` for the stake, the same plus `:<n>x` for the
    win. Dropping that last segment gives a key both sides share, so this
    pairs mini-game rounds and Aviator seats without knowing either shape. */
const winKey = (ref: string) => ref.replace(/:[\d.]+x$/, '');

function pairBets(rows: LedgerRow[]): Bet[] {
  const wins = new Map<string, LedgerRow>();
  for (const r of rows) {
    if (r.kind === 'win' && r.ref) wins.set(winKey(r.ref), r);
  }

  return rows
    .filter((r) => r.kind === 'bet' && r.ref)
    .map((r) => {
      const ref = r.ref!;
      const game = ref.split(':')[0];
      const win = wins.get(ref);
      const m = win?.ref?.match(/:([\d.]+)x$/)?.[1];
      return {
        key: String(r.id),
        game,
        name: findGame(game)?.name ?? game,
        cat: 'slot' as Cat,
        round: ref.split(':')[1] ?? '',
        stake: -r.amount,
        payout: win?.amount ?? 0,
        multiplier: m ? parseFloat(m) : null,
        at: r.created_at,
        settled: Boolean(win) || Date.now() - Date.parse(r.created_at) > 60_000,
      };
    });
}

/** yyyy-mm-dd for an <input type="date">, in the browser's own day. */
const dayOf = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
  .toISOString().slice(0, 10);

export default function BetsHistoryPage() {
  const { ready, signedIn, rows } = useLedger(500);
  const all = useMemo(() => pairBets(rows ?? []), [rows]);

  const [cat, setCat] = useState<Cat>('slot');
  const today = dayOf(new Date());
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [game, setGame] = useState('all');

  const games = useMemo(() => {
    const seen = new Map<string, string>();
    for (const b of all) if (!seen.has(b.game)) seen.set(b.game, b.name);
    return [...seen];
  }, [all]);

  const bets = useMemo(() => all.filter((b) => {
    if (b.cat !== cat) return false;
    if (game !== 'all' && b.game !== game) return false;
    const day = b.at.slice(0, 10);
    return day >= from && day <= to;
  }), [all, cat, game, from, to]);

  const staked = bets.reduce((s, b) => s + b.stake, 0);
  /* Valid bet is the part that counts towards turnover: a round that never
     settled is not counted for or against anybody yet. */
  const valid = bets.filter((b) => b.settled).reduce((s, b) => s + b.stake, 0);
  const won = bets.reduce((s, b) => s + b.payout, 0);
  const net = won - staked;

  return (
    <>
      <PageHeader
        title="Betting Record"
        action={<Link href="/turnover" className="br__excl">Exclusion turnover list</Link>}
      />

      <div className="br__tabs scroll-x" role="tablist">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={cat === key}
            className={cat === key ? 'on' : ''}
            onClick={() => setCat(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="br__filters">
        <label className="br__range">
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          <em>–</em>
          <input type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} />
        </label>
        <select className="br__pick" value={game} onChange={(e) => setGame(e.target.value)}>
          <option value="all">All</option>
          {games.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>

      {ready && !signedIn && (
        <>
          <Empty glyph="📋" text="Log in to see your own bets." />
          <div className="wallet-bar">
            <Link href="/login" className="btn btn--ghost" style={{ padding: 12 }}>{t.login}</Link>
            <Link href="/register" className="btn btn--gold" style={{ padding: 12 }}>{t.register}</Link>
          </div>
        </>
      )}

      {signedIn && rows === null && <Empty glyph="📋" text="Loading…" />}

      {signedIn && rows && bets.length === 0 && (
        <Empty
          glyph="📋"
          text={cat === 'slot' ? 'No data' : 'এই ক্যাটাগরির গেম চালু হলে এখানে রেকর্ড দেখা যাবে।'}
        />
      )}

      {signedIn && bets.length > 0 && (
        <div className="hist br__list">
          {bets.map((b) => (
            <div className="hist__row" key={b.key}>
              <div className="hist__main">
                <b className={b.payout > 0 ? 'is-up' : b.settled ? 'is-down' : ''}>
                  {b.payout > 0
                    ? `+${money(toTaka(b.payout), 2)}`
                    : b.settled ? `−${money(toTaka(b.stake), 2)}` : 'Running…'}
                </b>
                <span className="hist__ch">{b.name}{b.round && ` · Round #${b.round}`}</span>
              </div>
              <div className="hist__side">
                <span className={`hist__state ${b.payout > 0 ? 'hist__state--approved' : b.settled ? 'hist__state--rejected' : 'hist__state--pending'}`}>
                  {b.payout > 0 ? `${b.multiplier?.toFixed(2)}x` : b.settled ? 'Lost' : 'Running'}
                </span>
                <small>{when(b.at)}</small>
              </div>
              <p className="hist__note">Stake {money(toTaka(b.stake))}</p>
            </div>
          ))}
        </div>
      )}

      {signedIn && (
        <div className="br__sum">
          <div><span>Bet amount</span><b>{money(toTaka(staked), 2)}</b></div>
          <div><span>Valid bet</span><b>{money(toTaka(valid), 2)}</b></div>
          <div><span>Winnings</span><b>{money(toTaka(won), 2)}</b></div>
          <div>
            <span>Profit and loss</span>
            <b className={net >= 0 ? 'is-up' : 'is-down'}>
              {(net < 0 ? '−' : '') + money(toTaka(Math.abs(net)), 2)}
            </b>
          </div>
        </div>
      )}
    </>
  );
}
