import { GROWTH, fmtX, multiplierAt, type Phase } from '../../lib/aviator';
import Blast from './Blast';
import PlaneSprite from './PlaneSprite';

const W = 100, H = 62;
/** where the nose settles once it has climbed into frame */
const TIP_X = 76, TIP_Y = 12, FLOOR = 55;
const STEPS = 34;

/** Multiplier by which the aircraft has finished climbing into frame. */
const CRUISE_AT = 2.4;

/** 0 on the runway, 1 once the nose reaches cruise. */
function travelOf(multiplier: number) {
    if (multiplier <= 1) return 0;
    return Math.min(1, Math.log(multiplier) / Math.log(CRUISE_AT));
}

/**
 * Flight path. Below CRUISE_AT the nose genuinely travels out of the
 * bottom-left corner; above it the nose holds and the curve steepens
 * underneath, so a 1.2x round and a 40x round are equally readable.
 */
function path(multiplier: number, travel: number) {
    const span = Math.max(multiplier - 1, 0.0001);
    const total = (Math.log(multiplier) / GROWTH) * 1000;
    const spanX = travel * TIP_X;
    const spanY = travel * (FLOOR - TIP_Y);
    const pts: [number, number][] = [];
    for (let i = 0; i <= STEPS; i++) {
        const f = i / STEPS;
        const m = multiplierAt(total * f);
        pts.push([
            Number((f * spanX).toFixed(2)),
            Number((FLOOR - ((m - 1) / span) * spanY).toFixed(2)),
        ]);
    }
    return pts;
}

/** Wedge rays fanning out of the launch corner. */
const RAYS = Array.from({ length: 22 }, (_, i) => i * (90 / 22));

export default function AviatorCanvas({
    phase,
    multiplier,
    bettingLeft,
    bettingTotal,
    fairLabel = 'প্রুভাবলি ফেয়ার',
}: {
    phase: Phase;
    multiplier: number;
    bettingLeft: number;
    bettingTotal: number;
    fairLabel?: string;
}) {
    const betting = phase === 'betting';
    const flying = phase === 'flying';
    const crashed = phase === 'crashed';

    const travel = travelOf(multiplier);
    const pts = path(multiplier, travel);
    const [tx, ty] = pts[pts.length - 1];
    const [px, py] = pts[Math.max(0, pts.length - 3)];
    const angle = (Math.atan2(ty - py, tx - px) * 180) / Math.PI;

    // climbing away from the viewer: further along the climb, slightly smaller
    const scale = (1.05 - travel * 0.25).toFixed(3);

    const d = `M ${pts.map(([x, y]) => `${x} ${y}`).join(' L ')}`;
    // the fill drops straight down at the nose, giving the hard right edge
    const area = `${d} L ${tx} ${FLOOR} L 0 ${FLOOR} Z`;

    return (
        <div className={`av-stage av-stage--${phase}`}>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="av-stage__sky" aria-hidden>
                <defs>
                    <radialGradient id="av-bloom" cx="42%" cy="46%" r="52%">
                        <stop offset="0%" stopColor="#7b3fd6" stopOpacity=".55" />
                        <stop offset="60%" stopColor="#3a1e6b" stopOpacity=".22" />
                        <stop offset="100%" stopColor="#3a1e6b" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="av-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#e8123c" stopOpacity=".92" />
                        <stop offset="100%" stopColor="#6a0418" stopOpacity=".82" />
                    </linearGradient>
                    <filter id="av-glow" x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation=".9" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                <rect width={W} height={H} fill="#08080d" />

                {/* rays out of the launch corner — the structural backdrop */}
                <g className={`av-rays${flying ? ' is-turning' : ''}`} transform={`translate(0 ${FLOOR})`}>
                    {RAYS.map((a, i) => {
                        const r = 190;
                        const rad = (deg: number) => (deg * Math.PI) / 180;
                        const w = 2.1;
                        return (
                            <polygon
                                key={a}
                                fill={i % 2 ? '#15151d' : '#0d0d13'}
                                points={`0,0 ${(r * Math.cos(rad(-a - w))).toFixed(2)},${(r * Math.sin(rad(-a - w))).toFixed(2)} ${(r * Math.cos(rad(-a + w))).toFixed(2)},${(r * Math.sin(rad(-a + w))).toFixed(2)}`}
                            />
                        );
                    })}
                </g>

                <rect width={W} height={H} fill="url(#av-bloom)" />

                {/* ---- flight path ---- */}
                {!betting && (
                    <>
                        <path d={area} fill={crashed ? '#3a3a42' : 'url(#av-area)'} opacity={crashed ? 0.5 : 1} />
                        <path d={d} fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                              stroke={crashed ? '#7c7c88' : '#ff2b52'}
                              filter={crashed ? undefined : 'url(#av-glow)'} />
                    </>
                )}

                {/* ---- the aircraft ---- */}
                {betting && (
                    <g transform={`translate(13 ${FLOOR - 3})`}>
                        {/* the bob lives on an inner group: a CSS transform replaces
                            the SVG transform attribute outright, which would reset
                            the position to the origin */}
                        <g className="av-craft av-craft--idle">
                            <PlaneSprite mode="idle" />
                        </g>
                    </g>
                )}
                {flying && (
                    <g transform={`translate(${tx} ${ty}) rotate(${angle}) scale(${scale})`}>
                        {/* inner group carries the CSS float; React drives the outer
                            one every frame and a CSS animation there would overwrite it */}
                        <g className={`av-craft${travel >= 1 ? ' av-craft--cruise' : ''}`}>
                            <PlaneSprite mode="fly" />
                        </g>
                    </g>
                )}

                {crashed && (
                    <g transform={`translate(${tx} ${ty})`}>
                        <g className="av-wreck" transform={`rotate(${angle})`}>
                            <PlaneSprite mode="wreck" />
                        </g>
                        <Blast />
                    </g>
                )}
            </svg>

            <div className="av-stage__hud">
                {betting ? (
                    <>
                        <div className="av-hud__label">পরবর্তী রাউন্ড শুরু হচ্ছে</div>
                        <div className="av-hud__count">{(bettingLeft / 1000).toFixed(1)}s</div>
                        <div className="av-hud__bar">
                            <i style={{ width: `${(bettingLeft / bettingTotal) * 100}%` }} />
                        </div>
                    </>
                ) : (
                    <>
                        <div className={`av-hud__mult${crashed ? ' is-crashed' : ''}`}>{fmtX(multiplier)}</div>
                        {crashed && <div className="av-hud__label av-hud__label--red">উড়ে গেছে!</div>}
                    </>
                )}
            </div>

            <span className="av-stage__fair">{fairLabel}</span>
        </div>
    );
}
