import { Head, Link } from '@inertiajs/react';
import Footer from '../components/Footer';
import Header from '../components/Header';
import type { Promo } from '../types';

export default function Promotions({ promotions }: { promotions: Promo[] }) {
    return (
        <>
            <Head title="প্রোমোশন" />
            <Header />
            <div className="hero">
                <h1>প্রোমোশন</h1>
                <p>চলমান সব বোনাস ও অফার এক জায়গায়</p>
            </div>

            <div style={{ margin: 12 }}>
                {promotions.map((p) => (
                    <article className="promo" key={p.id}>
                        <div className={`promo__art ${p.art ?? 'a1'}`} aria-hidden>{p.glyph}</div>
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
