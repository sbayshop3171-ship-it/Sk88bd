'use client';

import { useEffect, useState } from 'react';
import { byId, type GameOverride, type OverrideMap } from '@/lib/game-control';

/** Module-level cache: the lobby renders several GameSections at once and
    they should share one request, not fire one each. */
let cache: OverrideMap | null = null;
let inflight: Promise<OverrideMap> | null = null;

function load(): Promise<OverrideMap> {
  if (cache) return Promise.resolve(cache);
  inflight ??= fetch('/api/games/overrides', { cache: 'no-store' })
    .then((res) => (res.ok ? res.json() : null))
    .then((data: { ok: true; overrides: GameOverride[] } | null) => {
      cache = data?.ok ? byId(data.overrides) : {};
      return cache;
    })
    .catch(() => {
      cache = {};
      return cache;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

/**
 * Admin game overrides, empty until they arrive. Starting empty means the
 * first paint is the shipped catalogue — the same HTML the static build
 * produced — and hidden games drop out a moment later.
 */
export function useGameOverrides(): OverrideMap {
  const [overrides, setOverrides] = useState<OverrideMap>(cache ?? {});

  useEffect(() => {
    let live = true;
    void load().then((map) => { if (live) setOverrides(map); });
    return () => { live = false; };
  }, []);

  return overrides;
}
