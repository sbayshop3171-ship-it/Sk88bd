'use client';

import { useMemo, useState } from 'react';
import { GameCard } from '@/components/GameSection';
import PageHeader from '@/components/PageHeader';
import { useFavourites } from '@/components/useFavourites';
import { useGameOverrides } from '@/components/useGameOverrides';
import { CATALOGUE, HOME_SECTIONS, playableFirst, type CategoryKey } from '@/lib/catalogue';
import { applyOverrides } from '@/lib/game-control';
import { CATEGORY_LABEL } from '@/lib/strings';

const GLYPH: Record<CategoryKey, string> = {
  hot: '🔥', sports: '🏏', live: '🎲', slot: '🎰',
  poker: '🃏', fish: '🐟', lottery: '🎟️', jackpot: '🏆',
};

export default function CasinoLobbyPage() {
  const [active, setActive] = useState<CategoryKey>('hot');
  const overrides = useGameOverrides();
  // Same order as the home rails: what opens first, "coming soon" last.
  const games = useMemo(
    () => applyOverrides(playableFirst(CATALOGUE[active]), overrides),
    [active, overrides],
  );
  const { isFavourite, toggle } = useFavourites();

  return (
    <>
      <PageHeader title="গেম লবি" />

      <div className="cats scroll-x" style={{ top: 'var(--hdr-h)' }}>
        {HOME_SECTIONS.map((key) => (
          <button key={key} type="button" className={key === active ? 'on' : ''} onClick={() => setActive(key)}>
            <span className="e" aria-hidden>{GLYPH[key]}</span>
            {CATEGORY_LABEL[key]}
          </button>
        ))}
      </div>

      <section className="sec">
        <div className="sec__hd">
          <h2 className="sec__title">{CATEGORY_LABEL[active]}</h2>
          <div className="sec__ctrl"><span>{games.length} গেম</span></div>
        </div>
        <div className="grid">
          {games.map((g) => (
            <GameCard
              key={g.id}
              game={g}
              faved={isFavourite(g.id)}
              onToggleFavourite={toggle}
            />
          ))}
        </div>
      </section>
    </>
  );
}
