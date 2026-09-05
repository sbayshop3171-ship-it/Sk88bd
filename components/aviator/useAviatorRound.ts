'use client';

import { useEffect, useRef, useState } from 'react';
import {
  BETTING_MS,
  CRASHED_MS,
  createRound,
  multiplierAt,
  timeToReach,
  type Phase,
  type Round,
} from '@/lib/aviator';

const BACKEND_POLL_MS = 2_000;

export interface HistoryEntry {
  id: number;
  crashAt: number;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}

export interface RoundState {
  phase: Phase;
  /** while betting/flying the seed is withheld; revealed on the bust */
  round: Round | null;
  multiplier: number;
  bettingLeft: number;
  history: HistoryEntry[];
}

type BackendRound = {
  id?: number;
  round_id?: number;
  targetX?: number;
  target_x?: number;
  signalRevealAt?: string;
  signal_reveal_at?: string;
  bettingAt?: string;
  betting_at?: string;
  flyAt?: string;
  fly_at?: string;
  crashAtTime?: string;
  crash_at?: string;
  status?: string;
  serverSeedHash?: string;
  server_seed_hash?: string;
  serverSeed?: string;
  clientSeed?: string;
  nonce?: number;
};

type BackendPayload = {
  ok: boolean;
  serverTime: string;
  round: BackendRound | null;
  history: {
    id?: number;
    round_id?: number;
    crashAt?: number;
    target_x?: number;
    serverSeed?: string;
    clientSeed?: string;
    nonce?: number;
  }[];
};

/**
 * Drives backend-controlled waiting -> betting -> flying -> crashed.
 *
 * The local browser no longer decides the crash point. It reads the scheduled
 * demo round from `/api/aviator/current`, then only animates toward that target.
 */
export function useAviatorRound(clientSeed: string, onCrash?: (crashAt: number) => void) {
  const [state, setState] = useState<RoundState>({
    phase: 'waiting',
    round: null,
    multiplier: 1,
    bettingLeft: 0,
    history: [],
  });

  const raf = useRef<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const crashCb = useRef(onCrash);
  crashCb.current = onCrash;
  const seedRef = useRef(clientSeed);
  seedRef.current = clientSeed;

  useEffect(() => {
    let cancelled = false;
    let localMode = false;
    let backend: BackendPayload | null = null;
    let serverOffset = 0;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let localId = 1;
    let notifiedCrashId = 0;

    const wait = (ms: number, fn: () => void) => {
      timers.current.push(setTimeout(() => { if (!cancelled) fn(); }, ms));
    };

    const startLocalFallback = () => {
      if (localMode || cancelled) return;
      localMode = true;
      if (pollTimer) clearInterval(pollTimer);
      void startLocalRound();
    };

    const startLocalRound = async () => {
      const full = await createRound(localId++, seedRef.current);
      if (cancelled) return;

      const { serverSeed, ...committed } = full;
      const openedAt = performance.now();

      setState((s) => ({
        ...s,
        phase: 'betting',
        round: committed,
        multiplier: 1,
        bettingLeft: BETTING_MS,
      }));

      const tickCountdown = () => {
        if (cancelled || !localMode) return;
        const left = Math.max(0, BETTING_MS - (performance.now() - openedAt));
        setState((s) => (s.phase === 'betting' ? { ...s, bettingLeft: left } : s));
        if (left > 0) raf.current = requestAnimationFrame(tickCountdown);
      };
      raf.current = requestAnimationFrame(tickCountdown);

      wait(BETTING_MS, () => {
        const tookOff = performance.now();
        setState((s) => ({ ...s, phase: 'flying', multiplier: 1 }));

        const fly = () => {
          if (cancelled || !localMode) return;
          const m = multiplierAt(performance.now() - tookOff);

          if (m >= full.crashAt) {
            setState((s) => ({
              ...s,
              phase: 'crashed',
              multiplier: full.crashAt,
              round: { ...committed, serverSeed },
              history: [
                { id: full.id, crashAt: full.crashAt, serverSeed, clientSeed: full.clientSeed, nonce: full.nonce },
                ...s.history,
              ].slice(0, 24),
            }));
            crashCb.current?.(full.crashAt);
            wait(CRASHED_MS, () => { void startLocalRound(); });
            return;
          }

          setState((s) => (s.phase === 'flying' ? { ...s, multiplier: m } : s));
          raf.current = requestAnimationFrame(fly);
        };
        raf.current = requestAnimationFrame(fly);
      });
    };

    const refreshBackend = async () => {
      if (localMode) return;
      try {
        const res = await fetch('/api/aviator/current', { cache: 'no-store' });
        if (!res.ok) throw new Error(`round api ${res.status}`);
        const payload = (await res.json()) as BackendPayload;
        if (!payload.ok || !payload.round) throw new Error('round api empty');
        backend = payload;
        serverOffset = Date.parse(payload.serverTime) - Date.now();
      } catch {
        startLocalFallback();
      }
    };

    const tickBackend = () => {
      if (cancelled || localMode) return;
      if (backend?.round) {
        const next = stateFromBackend(backend, Date.now() + serverOffset);
        setState(next);
        if (next.phase === 'crashed' && next.round && next.round.id !== notifiedCrashId) {
          notifiedCrashId = next.round.id;
          crashCb.current?.(next.round.crashAt);
        }
      }
      raf.current = requestAnimationFrame(tickBackend);
    };

    void refreshBackend();
    pollTimer = setInterval(() => { void refreshBackend(); }, BACKEND_POLL_MS);
    raf.current = requestAnimationFrame(tickBackend);

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      if (raf.current) cancelAnimationFrame(raf.current);
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  return state;
}

function stateFromBackend(payload: BackendPayload, now: number): RoundState {
  const source = payload.round!;
  const id = Number(source.id ?? source.round_id ?? 0);
  const target = clampMultiplier(source.targetX ?? source.target_x);
  const bettingAt = readTime(source.bettingAt ?? source.betting_at, now);
  const flyAt = readTime(source.flyAt ?? source.fly_at, now + BETTING_MS);
  const crashAt = readTime(source.crashAtTime ?? source.crash_at, flyAt + timeToReach(target));
  const serverSeedHash = String(source.serverSeedHash ?? source.server_seed_hash ?? '');
  const nonce = Number(source.nonce ?? id);
  const backendClientSeed = String(source.clientSeed ?? 'prime-vai-devx-LIVE');

  let phase: Phase = 'waiting';
  let multiplier = 1;
  let bettingLeft = Math.max(0, bettingAt - now);

  if (now >= bettingAt && now < flyAt) {
    phase = 'betting';
    bettingLeft = Math.max(0, flyAt - now);
  } else if (now >= flyAt && now < crashAt) {
    phase = 'flying';
    multiplier = Math.min(target, multiplierAt(now - flyAt));
    bettingLeft = 0;
  } else if (now >= crashAt) {
    phase = 'crashed';
    multiplier = target;
    bettingLeft = 0;
  }

  const round: Round = {
    id,
    nonce,
    serverSeedHash,
    clientSeed: backendClientSeed,
    crashAt: target,
    durationMs: timeToReach(target),
    serverSeed: phase === 'crashed' ? source.serverSeed : undefined,
  };

  return {
    phase,
    round,
    multiplier,
    bettingLeft,
    history: payload.history.map((item) => ({
      id: Number(item.id ?? item.round_id ?? 0),
      crashAt: clampMultiplier(item.crashAt ?? item.target_x),
      serverSeed: String(item.serverSeed ?? ''),
      clientSeed: String(item.clientSeed ?? backendClientSeed),
      nonce: Number(item.nonce ?? item.id ?? item.round_id ?? 0),
    })).filter((item) => item.id > 0).slice(0, 24),
  };
}

function readTime(value: unknown, fallback: number) {
  const time = Date.parse(String(value ?? ''));
  return Number.isFinite(time) ? time : fallback;
}

function clampMultiplier(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 1;
  return Math.max(1, num);
}
