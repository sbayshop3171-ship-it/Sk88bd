'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BonusKind } from '@/lib/bonus-config';

export type MissionView = {
  id: string;
  title: string;
  measure: 'bet' | 'deposit';
  target: number;
  progress: number;
  reward: number;
  period: 'daily' | 'weekly' | 'once';
  done: boolean;
  claimed: boolean;
};

export type BonusState = {
  missions: MissionView[];
  wheel: {
    active: boolean;
    segments: number[];
    available: boolean;
    spun: boolean;
    needsDeposit: boolean;
  };
  signIn: { active: boolean; day: number; amount: number; claimed: boolean; needsDeposit: boolean };
  rescue: { active: boolean; amount: number; claimed: boolean };
  rebate: { active: boolean; day: string; staked: number; amount: number; claimed: boolean };
  promo: { active: boolean };
};

type ClaimReply =
  | { ok: true; kind: BonusKind; amount: number; balance: number; slot?: number }
  | { ok: false; reason: string; message?: string };

/** What each offer would pay this player right now, and the one call that
    takes it. The server decides both — this only asks and re-asks, so a
    claim can never be worked out twice with two different answers. */
export function useBonus() {
  const [state, setState] = useState<BonusState | null>(null);
  const [busy, setBusy] = useState<BonusKind | null>(null);

  const load = useCallback(() => {
    fetch('/api/bonus/claim', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { ok: true; state: BonusState } | { ok: false }) => {
        if (d.ok) setState(d.state);
      })
      .catch(() => { /* the tiles fall back to their disabled state */ });
  }, []);

  useEffect(load, [load]);

  const claim = useCallback(async (kind: BonusKind, code?: string): Promise<ClaimReply> => {
    setBusy(kind);
    try {
      const res = await fetch('/api/bonus/claim', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, code }),
      });
      const data = (await res.json()) as ClaimReply;
      if (data.ok) load();
      return data;
    } catch {
      return { ok: false, reason: 'network', message: 'Could not reach the server — try again' };
    } finally {
      setBusy(null);
    }
  }, [load]);

  return { state, busy, claim, reload: load };
}
