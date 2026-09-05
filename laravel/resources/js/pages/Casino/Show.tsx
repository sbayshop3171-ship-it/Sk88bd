import { Head, Link } from '@inertiajs/react';
import GameArt from '../../components/GameArt';
import GameCard from '../../components/GameCard';
import GameFrame from '../../components/GameFrame';
import PageHeader from '../../components/PageHeader';
import type { Game } from '../../types';

export default function Show({ game, related }: { game: Game; related: Game[] }) {
    return (
        <>
            <Head title={game.name} />
            <PageHeader title={game.name} />

            {game.demo_url ? (
                <GameFrame url={game.demo_url} name={game.name} />
            ) : (
                <>
                    <div className="game-hero">
                        <GameArt slug={game.slug} thumb={game.thumb_url} name={game.name} provider={game.provider} />
                        <div className="game-hero__meta">
                            <p>{game.provider}</p>
                        </div>
                    </div>

                    <div className="note" style={{ margin: 12 }}>
                        গেম প্রোভাইডার এখনো যুক্ত হয়নি। অ্যাগ্রিগেটর লাইসেন্স পাওয়ার পর এখানে
                        আসল গেম লোড হবে।
                    </div>

                    <div className="wallet-bar">
                        <Link href="/deposit" className="btn btn--gold" style={{ padding: 12 }}>ডিপোজিট</Link>
                        <Link href="/casino" className="btn btn--ghost" style={{ padding: 12 }}>অন্য গেম</Link>
                    </div>
                </>
            )}

            {related.length > 0 && (
                <section className="sec">
                    <div className="sec__hd"><h2 className="sec__title">একই ক্যাটাগরির গেম</h2></div>
                    <div className="grid">
                        {related.map((g) => <GameCard key={g.id} game={g} />)}
                    </div>
                </section>
            )}
        </>
    );
}
