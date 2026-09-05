import Link from 'next/link';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { PROMOTIONS } from '@/lib/promotions';

export default function PromotionsPage() {
  return (
    <>
      <Header />
      <div className="hero">
        <h1>প্রোমোশন</h1>
        <p>চলমান সব বোনাস ও অফার এক জায়গায়</p>
      </div>

      <div style={{ margin: 12 }}>
        {PROMOTIONS.map((p) => (
          <article className="promo" key={p.id}>
            <div className={`promo__art ${p.art}`} aria-hidden>{p.glyph}</div>
            <div className="promo__b">
              <h3>{p.title}</h3>
              <p>{p.body}</p>
              <Link className="btn btn--gold" href="/register">এখনই নিন</Link>
            </div>
          </article>
        ))}
      </div>

      <Footer />
    </>
  );
}
