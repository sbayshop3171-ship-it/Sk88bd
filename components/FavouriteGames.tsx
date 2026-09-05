'use client';

import GameSection from './GameSection';
import { useFavourites } from './useFavourites';
import { findGame } from '@/lib/catalogue';
import { t } from '@/lib/strings';

/** The rail behind the heart on every tile. Renders nothing until the visitor
    has starred something, so a first-time home page is unchanged. */
export default function FavouriteGames() {
  const { ids } = useFavourites();
  const games = ids.map(findGame).filter((g) => g !== undefined);
  if (!games.length) return null;
  return <GameSection games={games} title={t.favourites} />;
}
