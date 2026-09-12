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
/* Every poll measures the server clock afresh, and that measurement carries
   the round trip with it — so the raw figure moves by tens of milliseconds
   from one poll to the next. Assigning it outright stepped the whole flight
   sideways twice a second, which is what read as the plane shaking. The
   offset is now a target the live one eases toward, a fraction of the gap per
   frame; a difference too large to be jitter is a real clock correction and
   is taken at once. */
const OFFSET_SNAP_MS = 1_500;
const OFFSET_EASE = 0.02;

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
 * The local browser neither decides nor knows the crash point. It reads the
 * round's timing from `/api/aviator/current`, flies with no ceiling, and learns
 * the bust from the server when it happens.
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
    /** the payload's history, mapped once per poll rather than every frame —
        a fresh array each frame redrew the strip sixty times a second */
    let history: HistoryEntry[] = [];
    let shown: RoundState | null = null;
    let serverOffset = 0;
    let offsetTarget = 0;
    let offsetReady = false;
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

    const accept = (payload: BackendPayload) => {
      // a slow ordinary poll sent before the bust must not land after the
      // bust answer and put the plane back in the air
      if (backend && Date.parse(payload.serverTime) < Date.parse(backend.serverTime)) return;
      backend = payload;
      const nextHistory = historyFrom(payload);
      if (!sameHistory(history, nextHistory)) history = nextHistory;
      offsetTarget = Date.parse(payload.serverTime) - Date.now();
      if (!offsetReady) {
        serverOffset = offsetTarget;
        offsetReady = true;
      }
    };

    const refreshBackend = async () => {
      if (localMode) return;
      try {
        const res = await fetch('/api/aviator/current', { cache: 'no-store' });
        if (!res.ok) throw new Error(`round api ${res.status}`);
        const payload = (await res.json()) as BackendPayload;
        if (!payload.ok || !payload.round) throw new Error('round api empty');
        accept(payload);
      } catch {
        startLocalFallback();
      }
    };

    /* The crash point is not sent while the plane flies, so one request per
       flight is held open by the server and answered the moment it busts.
       If it fails, the two-second poll still brings the bust. */
    let awaitingId = 0;
    const awaitBust = async (id: number) => {
      if (awaitingId === id || localMode) return;
      awaitingId = id;
      try {
        while (!cancelled) {
          const res = await fetch(`/api/aviator/current?wait=${id}`, { cache: 'no-store' });
          if (!res.ok) return;
          const payload = (await res.json()) as BackendPayload;
          if (!payload.ok || !payload.round) return;
          accept(payload);
          const r = payload.round;
          if (Number(r.id ?? r.round_id) !== id || r.status !== 'flying') return;
        }
      } catch {
        // the ordinary poll carries on
      }
    };

    const tickBackend = () => {
      if (cancelled || localMode) return;
      if (Math.abs(offsetTarget - serverOffset) > OFFSET_SNAP_MS) {
        serverOffset = offsetTarget;
      } else {
        serverOffset += (offsetTarget - serverOffset) * OFFSET_EASE;
      }
      if (backend?.round) {
        const next = stateFromBackend(backend, Date.now() + serverOffset, history);
        // between flights nothing on the board moves but the countdown, and
        // after the bust nothing at all — skip the frames that change nothing
        if (!shown || changed(shown, next)) {
          shown = next;
          setState(next);
        }
        if (next.phase === 'flying' && next.round && !next.round.crashAt) {
          void awaitBust(next.round.id);
        }
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

/** Whether the board would draw anything different. The countdown is
    compared in 20ms steps, finer than any bar can show. */
function changed(a: RoundState, b: RoundState) {
  return a.phase !== b.phase
    || a.round?.id !== b.round?.id
    || a.round?.serverSeed !== b.round?.serverSeed
    || a.multiplier !== b.multiplier
    || Math.round(a.bettingLeft / 20) !== Math.round(b.bettingLeft / 20)
    || a.history !== b.history;
}

function historyFrom(payload: BackendPayload): HistoryEntry[] {
  const fallbackSeed = String(payload.round?.clientSeed ?? 'prime-vai-devx-LIVE');
  return payload.history.map((item) => ({
    id: Number(item.id ?? item.round_id ?? 0),
    crashAt: clampMultiplier(item.crashAt ?? item.target_x),
    serverSeed: String(item.serverSeed ?? ''),
    clientSeed: String(item.clientSeed ?? fallbackSeed),
    nonce: Number(item.nonce ?? item.id ?? item.round_id ?? 0),
  })).filter((item) => item.id > 0).slice(0, 24);
}

function sameHistory(a: HistoryEntry[], b: HistoryEntry[]) {
  return a.length === b.length && a.every((h, i) => h.id === b[i].id && h.crashAt === b[i].crashAt);
}

function stateFromBackend(payload: BackendPayload, now: number, history: HistoryEntry[]): RoundState {
  const source = payload.round!;
  const id = Number(source.id ?? source.round_id ?? 0);
  // the server sends the crash point only once the round has busted
  const known = source.targetX ?? source.target_x;
  const target = known === undefined ? null : clampMultiplier(known);
  const bettingAt = readTime(source.bettingAt ?? source.betting_at, now);
  const flyAt = readTime(source.flyAt ?? source.fly_at, now + BETTING_MS);
  const crashAt = target === null
    ? Infinity
    : readTime(source.crashAtTime ?? source.crash_at, flyAt + timeToReach(target));
  const serverSeedHash = String(source.serverSeedHash ?? source.server_seed_hash ?? '');
  const nonce = Number(source.nonce ?? id);
  const backendClientSeed = String(source.clientSeed ?? 'prime-vai-devx-LIVE');

  let phase: Phase = 'waiting';
  let multiplier = 1;
  let bettingLeft = Math.max(0, bettingAt - now);

  if (target !== null && (source.status === 'crashed' || now >= crashAt)) {
    // the server's word that it busted beats a local clock running behind
    phase = 'crashed';
    multiplier = target;
    bettingLeft = 0;
  } else if (now >= bettingAt && now < flyAt) {
    phase = 'betting';
    bettingLeft = Math.max(0, flyAt - now);
  } else if (now >= flyAt) {
    phase = 'flying';
    multiplier = target === null ? multiplierAt(now - flyAt) : Math.min(target, multiplierAt(now - flyAt));
    bettingLeft = 0;
  }

  const round: Round = {
    id,
    nonce,
    serverSeedHash,
    clientSeed: backendClientSeed,
    crashAt: target ?? 0,
    durationMs: target === null ? 0 : timeToReach(target),
    serverSeed: phase === 'crashed' ? source.serverSeed : undefined,
  };

  return {
    phase,
    round,
    multiplier,
    bettingLeft,
    history,
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
