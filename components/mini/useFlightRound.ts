'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMiniGame } from '@/components/mini/useMiniGame';
import { toPaisa, toTaka } from '@/lib/auth';
import {
  MINI_ERROR,
  flightMultiplierAt,
  type FairnessInfo,
  type FlightRoundView,
  type FlightSettled,
  type MiniReason,
} from '@/lib/mini-games';

export type FlightPhase = 'idle' | 'flying' | 'settled';

/** how often the screen asks whether the round is still in the air */
const POLL_MS = 500;

/**
 * One player, one round, for both flying games: the stake leaves the wallet
 * on take-off and the multiplier climbs on the server's clock. The browser is
 * never told where the round busts — it finds out the same way the player
 * does, by asking and being told the round is over.
 *
 * Crash and JetX look nothing alike, so the rules live here and each board
 * only draws them. A skin can then be rebuilt without touching the money.
 */
export function useFlightRound(game: 'crash' | 'jetx') {
  const g = useMiniGame(game);

  const [phase, setPhase] = useState<FlightPhase>('idle');
  const [multiplier, setMultiplier] = useState(1);
  const [settled, setSettled] = useState<FlightSettled | null>(null);
  const [fairness, setFairness] = useState<FairnessInfo | null>(null);
  const [autoOn, setAutoOn] = useState(false);
  const [autoAt, setAutoAt] = useState(2);

  /** server clock − ours, so the curve is drawn off the same start the
      payout is measured from */
  const skew = useRef(0);
  const startedAt = useRef(0);
  const phaseRef = useRef<FlightPhase>('idle');
  phaseRef.current = phase;
  const cashingRef = useRef(false);

  const now = useCallback(() => Date.now() + skew.current, []);

  const adopt = useCallback((round: FlightRoundView) => {
    skew.current = round.serverNow - Date.now();
    startedAt.current = round.startedAt;
    setFairness(round.fairness);
    setSettled(null);
    setMultiplier(1);
    setPhase('flying');
  }, []);

  /* ---------- settle ---------- */

  const cashOut = useCallback(async () => {
    if (cashingRef.current) return;
    cashingRef.current = true;
    g.setBusy(true);
    try {
      const data = await g.call({ action: 'cashout' });
      if (!data.ok) {
        // the round was already gone — drop back to idle rather than hang
        g.setErr(MINI_ERROR[(data as { reason: MiniReason }).reason] ?? MINI_ERROR['db-error']);
        setPhase('idle');
        return;
      }
      const s = data.settled!;
      setSettled(s);
      setFairness(s.fairness);
      setMultiplier(s.won ? s.multiplier : s.crashAt);
      g.setSettledBalance(toTaka(s.balance));
      g.remember(s.multiplier, s.won);
      setPhase('settled');
    } catch {
      g.setErr(MINI_ERROR['db-error']);
      setPhase('idle');
    } finally {
      cashingRef.current = false;
      g.setBusy(false);
    }
  }, [g]);

  /* ---------- the climb ---------- */

  useEffect(() => {
    if (phase !== 'flying') return;
    let raf = 0;
    const tick = () => {
      const m = flightMultiplierAt(game, now() - startedAt.current);
      setMultiplier(m);
      if (autoOn && m >= autoAt) { void cashOut(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, game, now, autoOn, autoAt, cashOut]);

  /* The server is the only one that knows where the round dies, so the
     screen asks. When it answers "nothing in the air", the round has busted
     and settling reveals the seed and the crash point. */
  useEffect(() => {
    if (phase !== 'flying') return;
    const id = setInterval(async () => {
      if (cashingRef.current) return;
      try {
        const res = await fetch(`/api/mini-games?game=${game}`, { cache: 'no-store' });
        const data = (await res.json()) as { ok: boolean; round: FlightRoundView | null };
        if (data.ok && !data.round && phaseRef.current === 'flying') void cashOut();
      } catch { /* a dropped poll just means we ask again */ }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [phase, game, cashOut]);

  /* Reload mid-flight and the round is still there — pick it back up. */
  useEffect(() => {
    let live = true;
    fetch(`/api/mini-games?game=${game}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { ok: boolean; round: FlightRoundView | null }) => {
        if (live && data.ok && data.round) adopt(data.round);
      })
      .catch(() => undefined);
    return () => { live = false; };
  }, [game, adopt]);

  /* ---------- take off ---------- */

  const takeOff = useCallback(async () => {
    if (g.busy) return;
    if (!g.requireFunds()) return;
    if (g.stake > g.balance) { g.setErr(MINI_ERROR['insufficient-balance']); return; }
    g.setBusy(true);
    g.setErr('');
    try {
      const data = await g.call({ action: 'takeoff', stake: toPaisa(g.stake) });
      if (!data.ok) {
        g.setErr(MINI_ERROR[(data as { reason: MiniReason }).reason] ?? MINI_ERROR['db-error']);
        return;
      }
      adopt(data.round!);
    } catch {
      g.setErr(MINI_ERROR['db-error']);
    } finally {
      g.setBusy(false);
    }
  }, [g, adopt]);

  /** true once a round has ended without a cash-out */
  const busted = phase === 'settled' && settled ? !settled.won : false;

  return {
    g, phase, multiplier, settled, fairness, busted,
    autoOn, setAutoOn, autoAt, setAutoAt,
    takeOff, cashOut,
  };
}
