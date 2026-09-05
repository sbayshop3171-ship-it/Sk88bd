'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import AviatorCanvas from '@/components/aviator/AviatorCanvas';
import BetPanel, { MIN_STAKE, emptySlot, type Slot } from '@/components/aviator/BetPanel';
import HistoryStrip from '@/components/aviator/HistoryStrip';
import LiveBets from '@/components/aviator/LiveBets';
import { useAviatorRound } from '@/components/aviator/useAviatorRound';
import PageHeader from '@/components/PageHeader';
import { useUI } from '@/components/UIProvider';
import { BETTING_MS, fmtX, randomHex } from '@/lib/aviator';
import { money } from '@/lib/brand';

const BALANCE_KEY = 'sk88bd:demo-balance';
const SEED_KEY = 'sk88bd:client-seed';
const START_BALANCE = 5000;

export default function AviatorPage() {
  const { toast } = useUI();

  // demo wallet — replaced by the Supabase balance once deposits are wired
  const [balance, setBalance] = useState(START_BALANCE);
  const [clientSeed, setClientSeed] = useState('');
  /** two independent seats, exactly like the reference game */
  const [slots, setSlots] = useState<[Slot, Slot]>([emptySlot(100), emptySlot(500)]);

  // storage and crypto only exist on the client
  useEffect(() => {
    try {
      const b = localStorage.getItem(BALANCE_KEY);
      if (b !== null) setBalance(Number(b) || 0);
      let seed = localStorage.getItem(SEED_KEY);
      if (!seed) { seed = randomHex(8); localStorage.setItem(SEED_KEY, seed); }
      setClientSeed(seed);
    } catch {
      setClientSeed(randomHex(8));
    }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(BALANCE_KEY, String(balance)); } catch { /* private mode */ }
  }, [balance]);

  /* Immersive: while Aviator is open the site chrome (bottom nav, floating
     buttons) is hidden and the column fills the screen, so the game stands
     alone the way the reference lobby opens it. */
  useEffect(() => {
    document.body.classList.add('aviator-immersive');
    return () => document.body.classList.remove('aviator-immersive');
  }, []);

  const patch = useCallback((i: 0 | 1, p: Partial<Slot>) => {
    setSlots((s) => {
      const next: [Slot, Slot] = [{ ...s[0] }, { ...s[1] }];
      next[i] = { ...next[i], ...p };
      return next;
    });
  }, []);

  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  const onCrash = useCallback((crashAt: number) => {
    const lost = slotsRef.current
      .filter((s) => s.staked !== null && s.cashedAt === null)
      .reduce((a, s) => a + (s.staked ?? 0), 0);
    if (lost > 0) toast(`${fmtX(crashAt)} এ উড়ে গেছে — ${money(lost)} হেরেছেন`);

    // clear the round; seats on auto queue themselves up again
    setSlots((s) => s.map((x) => ({
      ...x, staked: null, cashedAt: null, queued: x.auto,
    })) as [Slot, Slot]);
  }, [toast]);

  const { phase, round, multiplier, bettingLeft, history } = useAviatorRound(clientSeed, onCrash);

  // queued seats go live the moment the next betting window opens
  useEffect(() => {
    if (phase !== 'betting') return;
    setSlots((s) => {
      let spend = 0;
      const next = s.map((x) => {
        if (!x.queued && !x.auto) return x;
        if (x.stake < MIN_STAKE || x.stake > balance - spend) {
          return { ...x, queued: false };
        }
        spend += x.stake;
        return { ...x, staked: x.stake, cashedAt: null, queued: false };
      }) as [Slot, Slot];
      if (spend > 0) setBalance((v) => v - spend);
      return next;
    });
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const cashOut = useCallback((i: 0 | 1, at?: number) => {
    setSlots((s) => {
      const slot = s[i];
      if (slot.staked === null || slot.cashedAt !== null) return s;
      const m = at ?? multiplier;
      const won = Math.floor(slot.staked * m);
      setBalance((v) => v + won);
      toast(`${fmtX(m)} — ${money(won)} জিতেছেন`);
      const next: [Slot, Slot] = [{ ...s[0] }, { ...s[1] }];
      next[i] = { ...slot, cashedAt: m };
      return next;
    });
  }, [multiplier, toast]);

  // auto cash-out, checked per seat
  useEffect(() => {
    if (phase !== 'flying') return;
    slots.forEach((s, i) => {
      if (s.staked === null || s.cashedAt !== null) return;
      const target = Number(s.autoAt);
      if (Number.isFinite(target) && target > 1 && multiplier >= target) {
        cashOut(i as 0 | 1, target);
      }
    });
  }, [phase, multiplier, slots, cashOut]);

  const place = (i: 0 | 1) => {
    const slot = slots[i];
    const committed = slots.reduce((a, s) => a + (s.staked ?? 0), 0);
    if (slot.stake < MIN_STAKE) { toast(`সর্বনিম্ন বেট ${money(MIN_STAKE)}`); return; }
    if (slot.stake > balance) { toast('ব্যালেন্স যথেষ্ট নয়'); return; }
    if (phase === 'betting') {
      setBalance((v) => v - slot.stake);
      patch(i, { staked: slot.stake, cashedAt: null, queued: false });
    } else {
      patch(i, { queued: true });
      toast('পরের রাউন্ডে বেট বসবে');
    }
    void committed;
  };

  return (
    <>
      <PageHeader
        title={<img className="av-wordmark" src="/games/aviator/wordmark.png" alt="Aviator" />}
        action={<span className="bal-pill"><b>{money(balance)}</b><i className="av" aria-hidden>👤</i></span>}
      />

      <div className="av-skin">
      <HistoryStrip history={history} />

      <AviatorCanvas
        phase={phase}
        multiplier={multiplier}
        bettingLeft={bettingLeft}
        bettingTotal={BETTING_MS}
      />

      <div className="av-slots">
        {([0, 1] as const).map((i) => (
          <BetPanel
            key={i}
            slot={slots[i]}
            phase={phase}
            multiplier={multiplier}
            balance={balance}
            onPatch={(p) => patch(i, p)}
            onPlace={() => place(i)}
            onCancel={() => patch(i, { queued: false, auto: false })}
            onCashOut={() => cashOut(i)}
          />
        ))}
      </div>

      <LiveBets phase={phase} multiplier={multiplier} />

      <section className="sec">
        <div className="sec__hd">
          <h2 className="sec__title">লাইভ সিগন্যাল অডিট</h2>
          <div className="sec__ctrl"><Link href="/game/aviator/fairness">যাচাই</Link></div>
        </div>
        <div className="av-fair">
          <div className="av-fair__row"><span>রাউন্ড</span><b>#{round?.id ?? '—'}</b></div>
          <div className="av-fair__row">
            <span>সিগন্যাল সোর্স</span><b>Backend controlled LIVE</b>
          </div>
          <div className="av-fair__row">
            <span>টার্গেট</span><b style={{ color: 'var(--gold)', fontSize: 16 }}>{round ? fmtX(round.crashAt) : '—'}</b>
          </div>
          <div className="av-fair__row">
            <span>সার্ভার সিড হ্যাশ</span>
            <b className="mono">{round?.serverSeedHash?.slice(0, 24) ?? '—'}…</b>
          </div>
          <div className="av-fair__row">
            <span>ক্লায়েন্ট সিড</span><b className="mono">{round?.clientSeed || clientSeed || '—'}</b>
          </div>
          <div className="av-fair__row">
            <span>সার্ভার সিড</span>
            <b className="mono">
              {round?.serverSeed ? `${round.serverSeed.slice(0, 24)}…` : 'রাউন্ড শেষে প্রকাশ হবে'}
            </b>
          </div>
        </div>
      </section>
      </div>
    </>
  );
}
