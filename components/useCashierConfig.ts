'use client';

import { useEffect, useState } from 'react';
import { CASHIER_DEFAULTS, type CashierConfig } from '@/lib/cashier-config';

let cache: CashierConfig | null = null;
let inflight: Promise<CashierConfig> | null = null;

function load(): Promise<CashierConfig> {
  if (cache) return Promise.resolve(cache);
  inflight ??= fetch('/api/cashier-config', { cache: 'no-store' })
    .then((res) => (res.ok ? res.json() : null))
    .then((data: { ok: true; config: CashierConfig } | null) => {
      cache = data?.ok ? data.config : CASHIER_DEFAULTS;
      return cache;
    })
    .catch(() => {
      cache = CASHIER_DEFAULTS;
      return cache;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

/** The admin's cashier design; the shipped defaults until it arrives, and
    `ready` flips once the real record is in so screens can hold their
    method list until then rather than flashing the defaults. */
export function useCashierConfig(): { config: CashierConfig; ready: boolean } {
  const [config, setConfig] = useState<CashierConfig>(cache ?? CASHIER_DEFAULTS);
  const [ready, setReady] = useState(Boolean(cache));

  useEffect(() => {
    let live = true;
    void load().then((c) => { if (live) { setConfig(c); setReady(true); } });
    return () => { live = false; };
  }, []);

  return { config, ready };
}
