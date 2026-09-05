import { notFound } from 'next/navigation';
import GameGate from '@/components/GameGate';
import GamePlayer from '@/components/GamePlayer';
import { CATALOGUE, findGame } from '@/lib/catalogue';
import { resolveLaunch } from '@/lib/launch';

/* The fullscreen player, the way the reference lobby does it: its own route,
   no site chrome, the game filling the screen behind a view-only veil. */

export function generateStaticParams() {
  const ids = new Set<string>();
  for (const games of Object.values(CATALOGUE)) games.forEach((g) => ids.add(g.id));
  return [...ids].map((id) => ({ id }));
}

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = findGame(id);
  if (!game) notFound();

  /* Resolved on the server: with an aggregator wired up this is a minted,
     one-shot URL, so it must never be baked into a cached page. */
  const launch = await resolveLaunch(game, 'demo');

  return (
    <GameGate>
      <GamePlayer
        name={game.name}
        provider={game.provider}
        url={launch.ok ? launch.url : undefined}
        thumb={game.thumb}
        reason={launch.ok ? undefined : launch.reason}
      />
    </GameGate>
  );
}

/* A minted launch URL is per-visit, so the page is rendered per request. */
export const dynamic = 'force-dynamic';
