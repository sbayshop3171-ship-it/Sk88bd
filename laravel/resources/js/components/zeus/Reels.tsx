import { GLYPH, ORB, SCATTER, orbValue } from '../../lib/zeus';

/**
 * The six-by-five board.
 *
 * Cells are keyed by position rather than by contents so React reuses the same
 * node when a column refills — that is what lets the CSS drop animation read
 * as symbols falling into a slot instead of a whole row being replaced.
 */
export default function Reels({
    grid,
    winning,
    dropping,
}: {
    grid: string[][];
    /** "row-col" of every cell the current win is clearing */
    winning: Set<string>;
    dropping: boolean;
}) {
    return (
        <div className={`zg-reels${dropping ? ' is-dropping' : ''}`}>
            {grid.map((row, r) =>
                row.map((cell, c) => {
                    const orb = orbValue(cell);
                    const hot = winning.has(`${r}-${c}`);
                    const kind = orb !== null ? ORB : cell;

                    return (
                        <div
                            key={`${r}-${c}`}
                            className={`zg-cell zg-cell--${kind}${hot ? ' is-win' : ''}`}
                            style={{ animationDelay: `${c * 28 + r * 14}ms` }}
                        >
                            {orb !== null ? (
                                <span className="zg-orb">
                                    <i aria-hidden>⚡</i>
                                    <b>{orb}x</b>
                                </span>
                            ) : (
                                <span className="zg-face" aria-hidden>{GLYPH[cell] ?? '❔'}</span>
                            )}
                            {cell === SCATTER && <span className="zg-cell__ring" aria-hidden />}
                        </div>
                    );
                }),
            )}
        </div>
    );
}
