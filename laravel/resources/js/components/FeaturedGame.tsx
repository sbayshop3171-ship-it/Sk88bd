import { Link } from '@inertiajs/react';
import GameArt from './GameArt';
import type { Game } from '../types';

/** The home page leads with whichever game has a real engine behind it. */
export default function FeaturedGame({ game }: { game: Game | null }) {
    if (!game) return null;

    return (
        <section className="sec">
            <div className="sec__hd">
                <h2 className="sec__title">এখনই খেলুন</h2>
                <div className="sec__ctrl"><span>লাইভ</span></div>
            </div>

            <Link className="featured" href={`/game/${game.slug}`}>
                <div className="featured__art">
                    <GameArt slug={game.slug} thumb={game.thumb_url} name={game.name} provider={game.provider} />
                </div>
                <div className="featured__b">
                    <span className="featured__badge">লাইভ</span>
                    <h3>{game.name}</h3>
                    <p>প্রতি রাউন্ডে মাল্টিপ্লায়ার বাড়ে — ক্র‍্যাশ করার আগে ক্যাশ আউট করুন।</p>
                    <span className="btn btn--gold">খেলুন</span>
                </div>
            </Link>
        </section>
    );
}
