import { Link } from '@inertiajs/react';
import { useRef } from 'react';
import { CATEGORY_LABEL, t } from '../lib/strings';
import GameCard from './GameCard';
import { LeftIcon, RightIcon } from './Icons';
import type { CategoryKey, Game } from '../types';

export default function GameSection({ category, games }: { category: CategoryKey; games: Game[] }) {
    const railRef = useRef<HTMLDivElement>(null);

    if (games.length === 0) return null;

    const nudge = (dir: 1 | -1) => {
        const el = railRef.current;
        if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
    };

    return (
        <section className="sec" id={`sec-${category}`}>
            <div className="sec__hd">
                <h2 className="sec__title">{CATEGORY_LABEL[category]}</h2>
                <div className="sec__ctrl">
                    <Link href={`/casino?category=${category}`}>{t.all}</Link>
                    <button type="button" aria-label={t.previous} onClick={() => nudge(-1)}><LeftIcon /></button>
                    <button type="button" aria-label={t.next} onClick={() => nudge(1)}><RightIcon /></button>
                </div>
            </div>
            <div className="scroll-x" ref={railRef}>
                <div className="rail">
                    {games.map((g) => <GameCard key={g.id} game={g} />)}
                </div>
            </div>
        </section>
    );
}
