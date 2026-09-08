'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { CATALOGUE, PLAYABLE_IDS, playableFirst, type CategoryKey, type Game } from '@/lib/catalogue';
import { applyOverrides } from '@/lib/game-control';
import { CATEGORY_LABEL, t } from '@/lib/strings';
import GameArt from './GameArt';
import { FlameIcon, HeartIcon, LeftIcon, RightIcon } from './Icons';
import { useFavourites } from './useFavourites';
import { useGameOverrides } from './useGameOverrides';

const TAG_LABEL = { hot: 'HOT', new: 'NEW', top: 'TOP' } as const;


export function GameCard({
  game,
  faved,
  onToggleFavourite,
}: {
  game: Game;
  faved: boolean;
  onToggleFavourite: (id: string) => void;
}) {
  /* Tapping the art opens the game and nothing else — its own engine if it has
     one, otherwise the fullscreen player. There is no interstitial and no
     deposit prompt on the way: the player always has something to show, a
     clip or a provider frame or the game's own art, and the deposit button
     lives in its bar. */
  const own = PLAYABLE_IDS.includes(game.id);
  const href = own ? `/game/${game.id}` : `/play/${game.id}`;

  /* The press animation has to outlive the press — a finger lifts long before
     the squash-and-pop finishes, and :active would cut it off mid-way. The
     class is set on pointerdown and cleared when the card's own keyframes end
     (children animate too, hence the currentTarget check). */
  const [tapped, setTapped] = useState(false);

  return (
    <div className="game-cell">
      <Link
        className={`game${tapped ? ' game--tap' : ''}`}
        href={href}
        onPointerDown={() => setTapped(true)}
        onAnimationEnd={(e) => { if (e.target === e.currentTarget) setTapped(false); }}
      >
        <GameArt id={game.id} thumb={game.thumb} name={game.name} provider={game.provider} />
        {game.tag && (
          <i className={`tag tag--${game.tag}`}>
            {game.tag === 'hot' && <FlameIcon />}
            {TAG_LABEL[game.tag!]}
          </i>
        )}
        {/* The generated tiles already letter the game name across the bottom;
            only the supplied artwork needs the provider mark added. */}
        {game.thumb && <span className="game__mark">{game.provider}</span>}
        <span className="game__shine" aria-hidden />
      </Link>

      <button
        type="button"
        className={`game__fav${faved ? ' is-on' : ''}`}
        aria-pressed={faved}
        aria-label={`${game.name} — ${t.favourite}`}
        onClick={() => onToggleFavourite(game.id)}
      >
        <HeartIcon filled={faved} />
      </button>
    </div>
  );
}

/** Rails page a screenful at a time rather than scrolling game by game: six
    tiles, 3 x 2, snapped so a swipe always lands on a whole page. */
const PER_PAGE = 6;

function paginate<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages;
}

export default function GameSection({
  category,
  games,
  title,
}: {
  category?: CategoryKey;
  games?: Game[];
  title?: string;
}) {
  /* Every rail leads with the games that actually open — its own engine, a
     provider demo or a clip — and the "coming soon" tiles fall to the end,
     so the first page of a rail is never all placeholders. */
  const raw = games ?? (category ? CATALOGUE[category] : []);
  const source = useMemo(() => playableFirst(raw), [raw]);
  // What the admin hid, re-badged or pinned at /admin/games. Empty on the
  // first paint, so this renders the static build's own HTML and settles a
  // moment later.
  const overrides = useGameOverrides();
  const list = useMemo(() => applyOverrides(source, overrides), [source, overrides]);
  const pages = useMemo(() => paginate(list, PER_PAGE), [list]);
  const heading = title ?? (category ? CATEGORY_LABEL[category] : '');
  const railRef = useRef<HTMLDivElement>(null);
  const { isFavourite, toggle } = useFavourites();

  if (!list.length) return null;

  const nudge = (dir: 1 | -1) => {
    const el = railRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <section className="sec" id={category ? `sec-${category}` : undefined}>
      <div className="sec__hd">
        <h2 className="sec__title">{heading}</h2>
        <div className="sec__ctrl">
          {category && <Link href={`/casino?category=${category}`}>{t.all}</Link>}
          <button type="button" aria-label={t.previous} onClick={() => nudge(-1)}><LeftIcon /></button>
          <button type="button" aria-label={t.next} onClick={() => nudge(1)}><RightIcon /></button>
        </div>
      </div>
      <div className="rail" ref={railRef}>
        {pages.map((page, i) => (
          <div className="rail__page" key={i}>
            {page.map((g) => (
              <GameCard
                key={g.id}
                game={g}
                faved={isFavourite(g.id)}
                onToggleFavourite={toggle}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
