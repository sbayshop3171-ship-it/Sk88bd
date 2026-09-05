'use client';

import { bandFor, fmtX } from '@/lib/aviator';
import type { HistoryEntry } from './useAviatorRound';

export default function HistoryStrip({ history }: { history: HistoryEntry[] }) {
  return (
    <div className="av-history scroll-x">
      {history.length === 0 && <span className="av-chip av-chip--empty">রাউন্ড শুরু হচ্ছে…</span>}
      {history.map((h) => (
        <span key={h.id} className={`av-chip av-chip--${bandFor(h.crashAt)}`}>{fmtX(h.crashAt)}</span>
      ))}
    </div>
  );
}
