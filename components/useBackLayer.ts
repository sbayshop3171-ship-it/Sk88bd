'use client';

import { useEffect, useRef } from 'react';

/* ============================================================
   The phone's Back button, for screens that live in state.

   A drawer, a sheet or a step of the deposit flow is not a page: opening
   one added nothing to the browser history, so Back went straight past it
   and left the page — and on the home page, left the site. This gives such
   a screen a history entry of its own while it is open, so Back closes it
   and nothing more.

   Two rules the browser sets:
   - The entry is pushed only right after the player tapped something.
     Chrome treats entries a page adds on its own as a back-button trap: it
     skips them and marks the page behind them skippable, after which Back
     leaves the site for certain. So the popups that open by themselves
     (the announcement, the free spin) are deliberately not wired to this.
   - The entry carries Next's own history state, so going back to it is a
     same-page restore for the router, not a reload.
   ============================================================ */

type LayerState = { __layer?: string } | null;

/** entries whose screen was closed by a link navigating away */
const dead = new Set<string>();
let watching = false;

/** Back landing on a dead entry steps over it: that screen is already gone. */
function watchForDeadEntries() {
  if (watching) return;
  watching = true;
  window.addEventListener('popstate', (e) => {
    const id = (e.state as LayerState)?.__layer;
    if (id && dead.has(id)) {
      dead.delete(id);
      window.history.back();
    }
  });
}

/**
 * While `open` is true the screen owns one history entry, and Back calls
 * `onBack`. Closing it from the screen itself (×, the header arrow) takes
 * the entry back off.
 *
 * Returns `leave()`: call it just before closing the screen *because a link
 * is navigating away*. Taking the entry off then would race the new page
 * still loading; it is left instead, and Back steps over it later.
 */
export function useBackLayer(open: boolean, onBack: () => void): () => void {
  const back = useRef(onBack);
  back.current = onBack;
  const leaving = useRef(false);

  useEffect(() => {
    if (!open) return;
    const activation = (navigator as Navigator & { userActivation?: { isActive: boolean } })
      .userActivation;
    if (activation && !activation.isActive) return;

    leaving.current = false;
    const id = Math.random().toString(36).slice(2);
    let pushed = false;
    let popped = false;
    const onPop = (e: PopStateEvent) => {
      // landing back on our own entry means a screen opened on top of this
      // one was closed — this one stays open
      if ((e.state as LayerState)?.__layer === id) return;
      popped = true;
      back.current();
    };

    // A tick later, so React's development double-mount can take it back
    // before it lands instead of leaving a stray entry behind.
    const timer = window.setTimeout(() => {
      watchForDeadEntries();
      const base = (window.history.state ?? {}) as Record<string, unknown>;
      window.history.pushState({ ...base, __layer: id }, '', window.location.href);
      pushed = true;
      window.addEventListener('popstate', onPop);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      if (!pushed) return;
      window.removeEventListener('popstate', onPop);
      if (popped) return;
      if (leaving.current || (window.history.state as LayerState)?.__layer !== id) {
        dead.add(id);
        return;
      }
      window.history.back();
    };
  }, [open]);

  return () => {
    leaving.current = true;
  };
}
