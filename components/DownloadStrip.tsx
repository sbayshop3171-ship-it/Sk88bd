'use client';

import { useState } from 'react';
import { BRAND } from '@/lib/brand';
import { t } from '@/lib/strings';

/** Dismissable app-download strip pinned above the header. */
export default function DownloadStrip() {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  return (
    <div className="appbar">
      <div className="appbar__logo" aria-hidden>
        <b>{BRAND.light}</b><span>{BRAND.accent}</span>
      </div>
      <div className="appbar__txt">
        <div className="appbar__title">{t.downloadBonus} &gt;&gt;&gt;</div>
        <div className="appbar__stars" aria-hidden>★★★★★</div>
      </div>
      <button className="btn-download" type="button">{t.download}</button>
      <button
        className="appbar__close"
        type="button"
        aria-label={t.close}
        onClick={() => setHidden(true)}
      >
        ×
      </button>
    </div>
  );
}
