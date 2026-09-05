import Link from 'next/link';
import GameArt from './GameArt';
import { CATALOGUE } from '@/lib/catalogue';

/** Aviator is the only game wired to a real engine, so the home page leads
    with it. Everything else in the grid is catalogue-only for now. */
const FEATURED_ID = 'aviator';
const HREF = `/game/${FEATURED_ID}`;

export default function FeaturedGame() {
  const game = CATALOGUE.hot.find((g) => g.id === FEATURED_ID);
  if (!game) return null;

  return (
    <section className="sec">
      <div className="sec__hd">
        <h2 className="sec__title">এখনই খেলুন</h2>
        <div className="sec__ctrl"><span>লাইভ</span></div>
      </div>

      <Link className="featured" href={HREF}>
        <div className="featured__art">
          <GameArt id={game.id} thumb={game.thumb} name={game.name} provider={game.provider} />
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
