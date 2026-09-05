'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import AviatorCanvas from '@/components/aviator/AviatorCanvas';
import BetPanel, { MIN_STAKE, emptySlot, type Slot } from '@/components/aviator/BetPanel';
import HistoryStrip from '@/components/aviator/HistoryStrip';
import LiveBets from '@/components/aviator/LiveBets';
import { useAviatorRound } from '@/components/aviator/useAviatorRound';
import { useAuth } from '@/components/AuthProvider';
import GameGate from '@/components/GameGate';
import PageHeader from '@/components/PageHeader';
import { useUI } from '@/components/UIProvider';
import { BETTING_MS, fmtX, randomHex } from '@/lib/aviator';
import { BET_ERROR, type BetReason } from '@/lib/aviator-bets';
import { toPaisa, toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';

const SEED_KEY = 'sk88bd:client-seed';

export default function AviatorPage() {
  const { toast } = useUI();
  const { wallet, refresh } = useAuth();

  /* The seat balance IS the player's wallet — there is no separate game
     credit. Bets are placed and settled by /api/aviator/play, which moves the
     money and then this refetches, so the number on screen is always what the
     ledger says. */
  const balance = toTaka(wallet?.balance ?? 0);
  const [busySlot, setBusySlot] = useState<number | null>(null);
  const [clientSeed, setClientSeed] = useState('');
  /** two independent seats, exactly like the reference game */
  const [slots, setSlots] = useState<[Slot, Slot]>([emptySlot(100), emptySlot(500)]);

  // storage and crypto only exist on the client
  useEffect(() => {
    try {
      let seed = localStorage.getItem(SEED_KEY);
      if (!seed) { seed = randomHex(8); localStorage.setItem(SEED_KEY, seed); }
      setClientSeed(seed);
    } catch {
      setClientSeed(randomHex(8));
    }
  }, []);

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

  /* Every bet and cash-out goes through the server: it owns the wallet and it
     alone decides what multiplier was actually reached. The screen just asks,
     then refetches the balance from the answer. */
  const send = useCallback(async (
    action: 'bet' | 'cashout',
    i: 0 | 1,
    stake?: number,
  ) => {
    setBusySlot(i);
    try {
      const res = await fetch('/api/aviator/play', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, slot: i, stake: stake === undefined ? undefined : toPaisa(stake) }),
      });
      const data = (await res.json()) as
        | { ok: true; cashedAt?: number; payout?: number }
        | { ok: false; reason: BetReason };

      await refresh();
      if (!data.ok) {
        toast(BET_ERROR[data.reason] ?? 'সমস্যা হয়েছে');
        return null;
      }
      return data;
    } catch {
      toast('সার্ভারে পৌঁছানো গেল না');
      return null;
    } finally {
      setBusySlot(null);
    }
  }, [refresh, toast]);

  // queued seats go live the moment the next betting window opens
  useEffect(() => {
    if (phase !== 'betting') return;

    slotsRef.current.forEach((slot, i) => {
      if (!slot.queued && !slot.auto) return;
      if (slot.staked !== null) return;
      if (slot.stake < MIN_STAKE || slot.stake > balance) {
        patch(i as 0 | 1, { queued: false });
        return;
      }
      void send('bet', i as 0 | 1, slot.stake).then((res) => {
        patch(i as 0 | 1, res
          ? { staked: slot.stake, cashedAt: null, queued: false }
          : { queued: false });
      });
    });
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const cashOut = useCallback(async (i: 0 | 1) => {
    const slot = slotsRef.current[i];
    if (slot.staked === null || slot.cashedAt !== null) return;


    // Claim the seat straight away so a fast second tap — or the auto
    // cash-out firing on the next frame — cannot send two requests.
    patch(i, { cashedAt: 0 });

    const res = await send('cashout', i);
    if (!res) {
      patch(i, { cashedAt: null });
      return;
    }

    const m = res.cashedAt ?? 0;
    patch(i, { cashedAt: m });
    if (m > 0) toast(`${fmtX(m)} — ${money(toTaka(res.payout ?? 0))} জিতেছেন`);
  }, [patch, send, toast]);

  // auto cash-out, checked per seat
  useEffect(() => {
    if (phase !== 'flying') return;
    slots.forEach((s, i) => {
      if (s.staked === null || s.cashedAt !== null) return;
      const target = Number(s.autoAt);
      if (Number.isFinite(target) && target > 1 && multiplier >= target) {
        void cashOut(i as 0 | 1);
      }
    });
  }, [phase, multiplier, slots, cashOut]);

  const place = async (i: 0 | 1) => {
    if (busySlot !== null) return;   // a request is already in flight
    const slot = slots[i];
    if (slot.stake < MIN_STAKE) { toast(`সর্বনিম্ন বেট ${money(MIN_STAKE)}`); return; }
    if (slot.stake > balance) { toast('ব্যালেন্স যথেষ্ট নয়'); return; }

    if (phase !== 'betting') {
      patch(i, { queued: true });
      toast('পরের রাউন্ডে বেট বসবে');
      return;
    }

    const res = await send('bet', i, slot.stake);
    if (res) patch(i, { staked: slot.stake, cashedAt: null, queued: false });
  };

  return (
    <GameGate>
      <PageHeader
        title={<img className="av-wordmark" src="/games/aviator/wordmark.png" alt="Aviator" />}
        action={
          <Link href="/deposit" className="bal-pill" title="ডিপোজিট করুন">
            <b>{money(balance)}</b><i className="av" aria-hidden>＋</i>
          </Link>
        }
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
    </GameGate>
  );
}
