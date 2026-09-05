'use client';

import { useState } from 'react';
import { GameCard } from '@/components/GameSection';
import PageHeader from '@/components/PageHeader';
import { CATALOGUE, HOME_SECTIONS, type CategoryKey } from '@/lib/catalogue';
import { CATEGORY_LABEL } from '@/lib/strings';

const GLYPH: Record<CategoryKey, string> = {
  hot: '🔥', sports: '🏏', live: '🎲', slot: '🎰',
  poker: '🃏', fish: '🐟', lottery: '🎟️', jackpot: '🏆',
};

export default function CasinoLobbyPage() {
  const [active, setActive] = useState<CategoryKey>('hot');
  const games = CATALOGUE[active];

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
          {games.map((g) => <GameCard key={g.id} game={g} />)}
        </div>
      </section>
    </>
  );
}
