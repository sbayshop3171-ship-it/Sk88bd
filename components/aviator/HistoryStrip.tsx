'use client';

import { memo, useState } from 'react';
import { bandFor, fmtX } from '@/lib/aviator';
import type { HistoryEntry } from './useAviatorRound';

/** The last busts in a row, newest first, with the board's "…" pill on the
    right that folds the whole list open under the strip. */
export default memo(function HistoryStrip({ history }: { history: HistoryEntry[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`av-history-wrap${open ? ' is-open' : ''}`}>
      <div className="av-history scroll-x">
        {history.length === 0 && <span className="av-chip av-chip--empty">ROUND STARTING…</span>}
        {history.map((h) => (
          <span key={h.id} className={`av-chip av-chip--${bandFor(h.crashAt)}`}>{fmtX(h.crashAt)}</span>
        ))}
      </div>
      <button
        type="button" className="av-history__more" aria-label="Round history"
        aria-expanded={open} onClick={() => setOpen((o) => !o)}
      >
        <i /><i /><i />
      </button>
    </div>
  );
});
