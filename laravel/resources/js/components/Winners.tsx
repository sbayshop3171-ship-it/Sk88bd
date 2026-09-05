import { Link } from '@inertiajs/react';
import { money } from '../lib/brand';
import { t } from '../lib/strings';

/** Recent big wins. Sample rows, duplicated once so the CSS marquee can loop
    seamlessly — real rows need enough settled bets to be worth showing. */
const ROWS = [
    { game: 'Aviator', user: '*******618', amount: 101_545, av: '✈️' },
    { game: '9 Coins Grand Gold', user: '*******502', amount: 100_800, av: '🪙' },
    { game: 'Super Ace Scratch', user: '*******147', amount: 100_000, av: '🂡' },
    { game: 'Aviator', user: '*******339', amount: 96_300, av: '✈️' },
    { game: 'Crazy Time', user: '*******699', amount: 80_040, av: '🎡' },
    { game: 'Mega Wheel', user: '*******350', amount: 45_450, av: '🛞' },
    { game: 'Crazy Time', user: '*******183', amount: 40_020, av: '🎡' },
    { game: 'Sweet Bonanza', user: '*******274', amount: 32_600, av: '🍬' },
];

export default function Winners() {
    const list = [...ROWS, ...ROWS];

    return (
        <section className="winners">
            <div className="sec__hd">
                <h2 className="sec__title">{t.latestWinners}</h2>
            </div>
            <div className="winners__box">
                <ul className="winners__list">
                    {list.map((r, i) => (
                        <li key={`${r.game}-${r.user}-${i}`}>
                            <i className="winners__rank">{(i % ROWS.length) + 1}</i>
                            <i className="winners__av" aria-hidden>{r.av}</i>
                            <span className="winners__b">
                                <span className="winners__game">{r.game}</span>
                                <span className="winners__nm">{r.user}</span>
                            </span>
                            <span className="winners__amt">{money(r.amount)}</span>
                            <Link className="winners__play" href="/casino">{t.play}</Link>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
