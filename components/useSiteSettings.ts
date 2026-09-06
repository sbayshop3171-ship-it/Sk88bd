'use client';

import { useEffect, useState } from 'react';
import { SITE_SETTINGS_DEFAULTS, type SiteSettings } from '@/lib/site-settings';

/** Module-level cache: the deposit screen, the FABs and the footer all want
    the same record, so they share one request. */
let cache: SiteSettings | null = null;
let inflight: Promise<SiteSettings> | null = null;

function load(): Promise<SiteSettings> {
  if (cache) return Promise.resolve(cache);
  inflight ??= fetch('/api/site-settings', { cache: 'no-store' })
    .then((res) => (res.ok ? res.json() : null))
    .then((data: { ok: true; settings: SiteSettings } | null) => {
      cache = data?.ok ? data.settings : SITE_SETTINGS_DEFAULTS;
      return cache;
    })
    .catch(() => {
      cache = SITE_SETTINGS_DEFAULTS;
      return cache;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

/**
 * The admin's site settings, defaults until they arrive. Starting with the
 * shipped defaults keeps the first paint identical to the static build; the
 * saved limits and links replace them a moment later.
 */
export function useSiteSettings(): SiteSettings {
  const [settings, setSettings] = useState<SiteSettings>(cache ?? SITE_SETTINGS_DEFAULTS);

  useEffect(() => {
    let live = true;
    void load().then((s) => { if (live) setSettings(s); });
    return () => { live = false; };
  }, []);

  return settings;
}
