'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { GameCard } from '@/components/GameSection';
import PageHeader from '@/components/PageHeader';
import { useFavourites } from '@/components/useFavourites';
import { trialGames } from '@/lib/catalogue';
import { t } from '@/lib/strings';

/* ============================================================
   Free trial.

   Every game on this page opens for real, with play money, on the
   studio's own open demo host — no account, no deposit, no token
   (lib/demo-library.ts). Tapping a tile goes to the same
   fullscreen player the rest of the lobby uses.

   There are ~650 of them, so the grid grows a screenful at a time
   rather than putting six hundred <Image>s on the page at once.
   ============================================================ */

const PAGE = 36;

/** Fold the accents and punctuation a search box should not care about. */
const norm = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '');

export default function FreeTrialPage() {
  const all = useMemo(() => trialGames(), []);
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);
  const { isFavourite, toggle } = useFavourites();

  /* Typing stays smooth on a phone: the keystroke paints immediately and the
     650-game filter runs against the settled value. */
  const settled = useDeferredValue(query);
  const games = useMemo(() => {
    const q = norm(settled);
    if (!q) return all;
    return all.filter((g) => norm(g.name).includes(q));
  }, [all, settled]);

  useEffect(() => { setShown(PAGE); }, [settled]);

  /* Grow when the sentinel below the grid comes into view — the same
     "keep scrolling" feel as the lobby, with no button to hunt for. */
  const more = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = more.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setShown((n) => n + PAGE); },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [games.length]);

  const visible = games.slice(0, shown);

  return (
    <>
      <PageHeader title={t.freeTrial} />

      <section className="sec">
        <p className="trial__note">{t.trialNote}</p>

        <div className="trial__search">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.trialSearch}
            aria-label={t.trialSearch}
            enterKeyHint="search"
          />
        </div>

        <div className="sec__hd">
          <h2 className="sec__title">{t.freeTrial}</h2>
          <div className="sec__ctrl"><span>{games.length} games</span></div>
        </div>

        {visible.length ? (
          <div className="grid">
            {visible.map((g) => (
              <GameCard
                key={g.id}
                game={g}
                faved={isFavourite(g.id)}
                onToggleFavourite={toggle}
              />
            ))}
          </div>
        ) : (
          <p className="trial__empty">{t.trialEmpty}</p>
        )}

        {/* Only mounted while there is more to load, so the observer cannot
            keep firing once the whole library is on screen. */}
        {shown < games.length && <div ref={more} className="trial__more" aria-hidden />}
      </section>
    </>
  );
}
