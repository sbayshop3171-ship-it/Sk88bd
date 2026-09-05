import { Head } from '@inertiajs/react';
import { useState } from 'react';
import GameCard from '../../components/GameCard';
import PageHeader from '../../components/PageHeader';
import { CATEGORY_GLYPH, HOME_SECTIONS } from '../../lib/catalogue';
import { CATEGORY_LABEL } from '../../lib/strings';
import type { CategoryKey, Game } from '../../types';

/** `?category=` lets the home page's "সব" links land on the right tab. */
function initialCategory(): CategoryKey {
    const wanted = new URLSearchParams(window.location.search).get('category');
    return HOME_SECTIONS.includes(wanted as CategoryKey) ? (wanted as CategoryKey) : 'hot';
}

export default function Lobby({ sections }: { sections: Record<CategoryKey, Game[]> }) {
    const [active, setActive] = useState<CategoryKey>(initialCategory);
    const games = sections[active] ?? [];

    return (
        <>
            <Head title="গেম লবি" />
            <PageHeader title="গেম লবি" />

            <div className="cats scroll-x" style={{ top: 'var(--hdr-h)' }}>
                {HOME_SECTIONS.map((key) => (
                    <button key={key} type="button" className={key === active ? 'on' : ''} onClick={() => setActive(key)}>
                        <span className="e" aria-hidden>{CATEGORY_GLYPH[key]}</span>
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
