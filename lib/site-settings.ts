/** Operator-tunable site settings: cashier limits and support handles.

    These used to be constants in lib/payments.ts and lib/brand.ts. The
    defaults below are those same values, so a fresh install behaves exactly
    as before; the admin panel writes overrides into .data/ (see
    site-settings-store.ts) and both the site and the admin screens read the
    merged result. Pure — no node imports — so client components can use it. */

import { BRAND } from './brand';
import { DEPOSIT_CHANNELS } from './payments';

export type ChannelLimit = {
  /** taka */
  min: number;
  max: number;
  /** a switched-off channel is hidden from the deposit screen */
  active: boolean;
};

export type SiteSettings = {
  /** per deposit channel, keyed by lib/payments channel id */
  deposit: Record<string, ChannelLimit>;
  withdraw: {
    min: number;
    max: number;
  };
  support: {
    whatsapp: string;
    telegram: string;
    facebook: string;
  };
  /** the running line under the header; empty hides it */
  notice: string;
  updatedAt: string | null;
};

export const SITE_SETTINGS_DEFAULTS: SiteSettings = {
  deposit: Object.fromEntries(
    DEPOSIT_CHANNELS.map((c) => [c.id, { min: c.min, max: c.max, active: true }]),
  ),
  withdraw: { min: 500, max: 50_000 },
  support: {
    whatsapp: BRAND.social.whatsapp,
    telegram: BRAND.social.telegram,
    facebook: BRAND.social.facebook,
  },
  notice: '',
  updatedAt: null,
};

export type SettingsMutationReason = 'invalid-limit' | 'invalid-url' | 'unknown-channel';

export type SettingsMutationResult =
  | { ok: true; settings: SiteSettings }
  | { ok: false; reason: SettingsMutationReason; field?: string };

/** Only web links, so a typo can't turn a support button into javascript:. */
export const isSupportUrl = (value: string) =>
  value === '' || /^https?:\/\/[^\s]+$/i.test(value);
