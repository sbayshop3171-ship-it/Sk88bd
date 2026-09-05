/* ============================================================
   Generated game tile art.

   Two modes:
   • `thumb` set  → render that image (licensed provider art, or artwork the
     client's designer supplies). Drop files into public/games/ and set
     `thumb_url` on the game from /admin/games.
   • no `thumb`   → build a layered SVG from the game slug, so every tile is
     distinct, deterministic and ours.

   Provider artwork is never bundled here — it has to come from the provider's
   own CDN under licence.
   ============================================================ */

import GameIcon, { motifFor } from './GameIcon';

/** FNV-1a — small, stable, and identical everywhere. */
function hash(s: string) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

const MOTIFS = ['rays', 'arcs', 'hex', 'diamonds'] as const;

/** [x, y, r, opacity] — fixed table, offset per game by its hash. */
const SPARKS: [number, number, number, number][] = [
    [12, 16, 1.5, .85], [30, 9, 1, .6], [72, 14, 1.8, .8], [88, 26, 1.1, .55],
    [20, 40, 1, .5], [84, 52, 1.4, .6], [8, 62, 1.2, .45], [60, 20, 1, .7],
    [45, 12, 1.6, .5], [94, 40, 1, .45],
];

const r3 = (n: number) => Number(n.toFixed(3));
const pt = (cx: number, cy: number, radius: number, deg: number) =>
    `${r3(cx + radius * Math.cos((deg * Math.PI) / 180))},${r3(cy + radius * Math.sin((deg * Math.PI) / 180))}`;

export default function GameArt({
    slug,
    thumb,
    name,
    provider,
}: {
    slug: string;
    thumb?: string | null;
    name: string;
    provider: string;
}) {
    if (thumb) {
        return (
            <div className="game__art game__art--img">
                {/* contain, not cover: this artwork carries the game's name inside
                    the image, and a cover-crop silently shaves the lettering off
                    whenever the source ratio is not exactly the tile ratio */}
                <img src={thumb} alt={name} loading="lazy" decoding="async" />
            </div>
        );
    }

    const h = hash(slug);
    const hue = h % 360;
    const hue2 = (hue + 40 + (h >> 8) % 60) % 360;
    const motif = MOTIFS[(h >> 16) % MOTIFS.length];
    const uid = `g${h.toString(36)}`;

    const c0 = `hsl(${hue} 68% 46%)`;
    const c1 = `hsl(${hue} 76% 28%)`;
    const c2 = `hsl(${hue2} 86% 11%)`;
    const glow = `hsl(${hue} 96% 70%)`;

    return (
        <div className="game__art">
            <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden>
                <defs>
                    <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={c0} />
                        <stop offset="52%" stopColor={c1} />
                        <stop offset="100%" stopColor={c2} />
                    </linearGradient>
                    <radialGradient id={`${uid}-glow`} cx="50%" cy="34%" r="62%">
                        <stop offset="0%" stopColor={glow} stopOpacity=".72" />
                        <stop offset="100%" stopColor={glow} stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id={`${uid}-sweep`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#fff" stopOpacity=".26" />
                        <stop offset="46%" stopColor="#fff" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id={`${uid}-floor`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#000" stopOpacity="0" />
                        <stop offset="100%" stopColor="#000" stopOpacity=".62" />
                    </linearGradient>
                    <radialGradient id={`${uid}-vig`} cx="50%" cy="46%" r="72%">
                        <stop offset="55%" stopColor="#000" stopOpacity="0" />
                        <stop offset="100%" stopColor="#000" stopOpacity=".55" />
                    </radialGradient>
                </defs>

                <rect width="100" height="100" fill={`url(#${uid}-bg)`} />

                {motif === 'rays' && (
                    <g opacity=".26">
                        {Array.from({ length: 12 }, (_, i) => (
                            <polygon key={i} fill={i % 2 ? '#fff' : glow}
                                points={`50,38 ${pt(50, 38, 90, i * 30 - 8)} ${pt(50, 38, 90, i * 30 + 8)}`} />
                        ))}
                    </g>
                )}
                {motif === 'arcs' && (
                    <g fill="none" stroke="#fff" opacity=".22">
                        {[16, 28, 40, 52, 64].map((r, i) => (
                            <circle key={r} cx="50" cy="40" r={r} strokeWidth={i % 2 ? 1.4 : 2.6} />
                        ))}
                    </g>
                )}
                {motif === 'hex' && (
                    <g opacity=".2" fill="none" stroke="#fff" strokeWidth="1.4">
                        {Array.from({ length: 18 }, (_, i) => {
                            const cx = 12 + (i % 5) * 20, cy = 12 + Math.floor(i / 5) * 24 + (i % 2) * 12;
                            const pts = Array.from({ length: 6 }, (_, k) => pt(cx, cy, 9, k * 60 - 30)).join(' ');
                            return <polygon key={i} points={pts} />;
                        })}
                    </g>
                )}
                {motif === 'diamonds' && (
                    <g opacity=".2" fill="#fff">
                        {Array.from({ length: 15 }, (_, i) => {
                            const cx = 10 + (i % 5) * 20, cy = 14 + Math.floor(i / 5) * 26;
                            return <polygon key={i} points={`${cx},${cy - 7} ${cx + 6},${cy} ${cx},${cy + 7} ${cx - 6},${cy}`} />;
                        })}
                    </g>
                )}

                <rect width="100" height="100" fill={`url(#${uid}-glow)`} />
                <rect width="100" height="100" fill={`url(#${uid}-sweep)`} />

                {/* sparkles — deterministic positions */}
                <g fill="#fff">
                    {SPARKS.map(([sx, sy, sr, so], i) => (
                        <circle key={i} cx={(sx + h % 17) % 100} cy={(sy + (h >> 4) % 13) % 92}
                                r={sr} opacity={so} />
                    ))}
                </g>

                {/* light pool behind the subject, then its contact shadow */}
                <ellipse cx="50" cy="46" rx="34" ry="30" fill={glow} opacity=".18" />
                <ellipse cx="50" cy="78" rx="27" ry="6" fill="#000" opacity=".42" />

                <rect y="52" width="100" height="48" fill={`url(#${uid}-floor)`} />
                <rect width="100" height="100" fill={`url(#${uid}-vig)`} />
                <rect x="1.2" y="1.2" width="97.6" height="97.6" rx="5" fill="none"
                      stroke={glow} strokeOpacity=".5" strokeWidth="1.6" />
                <rect x="2.8" y="2.8" width="94.4" height="94.4" rx="4" fill="none"
                      stroke="#fff" strokeOpacity=".22" strokeWidth=".8" />
            </svg>
            <GameIcon motif={motifFor(name, provider)} />
            <span className="game__wordmark">{name}</span>
        </div>
    );
}
