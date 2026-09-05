import Link from 'next/link';
import { notFound } from 'next/navigation';
import GameArt from '@/components/GameArt';
import GamePreview from '@/components/GamePreview';
import PageHeader from '@/components/PageHeader';
import { CATALOGUE, demoUrl, findGame } from '@/lib/catalogue';

export function generateStaticParams() {
  const ids = new Set<string>();
  for (const games of Object.values(CATALOGUE)) games.forEach((g) => ids.add(g.id));
  return [...ids].map((id) => ({ id }));
}

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = findGame(id);
  if (!game) notFound();

  /* A game with a demo URL shows the real thing behind a blocking overlay;
     everything else keeps the placeholder until an aggregator is licensed. */
  const demo = demoUrl(game.id);

  return (
    <>
      <PageHeader title={game.name} />

      {demo ? (
        <GamePreview url={demo} name={game.name} />
      ) : (
        <>
          <div className="game-hero">
            <span className="game-hero__soon">শীঘ্রই আসছে</span>
            <GameArt id={game.id} thumb={game.thumb} name={game.name} provider={game.provider} />
            <div className="game-hero__meta">
              <p>{game.provider}</p>
            </div>
          </div>

          <div className="note" style={{ margin: 12 }}>
            এই গেমটি শীঘ্রই যুক্ত হচ্ছে। ততক্ষণে অন্য গেম দেখতে পারেন।
          </div>
        </>
      )}

      <div className="wallet-bar">
        <Link href="/deposit" className="btn btn--gold" style={{ padding: 12 }}>ডিপোজিট</Link>
        <Link href="/casino" className="btn btn--ghost" style={{ padding: 12 }}>অন্য গেম</Link>
      </div>
    </>
  );
}
