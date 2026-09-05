/* ============================================================
   Original game illustrations.

   One bold motif per game theme, drawn in a 0–100 box so it sits
   centred on the GameArt background. All artwork here is ours —
   provider logos and game art are licensed assets and must come
   from the provider CDN instead (see public/games/README.md).
   ============================================================ */

const GOLD = '#ffc42e';
const GOLD_D = '#d98800';
const WHITE = '#ffffff';
const SILVER = '#d7e7e4';
const INK = '#10201e';
const RED = '#ff4d4f';

/** Trig differs in the last float digit between Node and the browser, which
    trips React's hydration diff. Rounding makes both sides emit one string. */
const r3 = (n: number) => Number(n.toFixed(3));
const pt = (cx: number, cy: number, radius: number, deg: number) =>
  `${r3(cx + radius * Math.cos((deg * Math.PI) / 180))} ${r3(cy + radius * Math.sin((deg * Math.PI) / 180))}`;

export type Motif =
  | 'plane' | 'wheel' | 'bolt' | 'cards' | 'candy' | 'dragon'
  | 'spade' | 'bomb' | 'roulette' | 'cricket' | 'football' | 'tennis'
  | 'gem' | 'fish' | 'crown' | 'reels' | 'dice' | 'bingo'
  | 'gamepad' | 'horse' | 'bank'
  | 'crosshair' | 'sword' | 'mobile' | 'shark' | 'toad' | 'train'
  | 'cowboy' | 'blackjack' | 'urn' | 'fan' | 'chip' | 'seven';

/** Keyword → motif. First match wins, so order matters. */
const RULES: [RegExp, Motif][] = [
  [/aviator/i, 'plane'],
  [/counter strike|valorant/i, 'crosshair'],
  [/dota|league of legends/i, 'sword'],
  [/mobile legends|pubg/i, 'mobile'],
  [/ocean king|fish hunter|boom legend/i, 'shark'],
  [/golden toad/i, 'toad'],
  [/money train/i, 'train'],
  [/wild west/i, 'cowboy'],
  [/blackjack/i, 'blackjack'],
  [/matka/i, 'urn'],
  [/rummy|call break|32 cards/i, 'fan'],
  [/baccarat|holdem|poker pro/i, 'chip'],
  [/7 up|super ace/i, 'seven'],
  [/starburst/i, 'gem'],
  [/wheel|crazy time|lucky draw/i, 'wheel'],
  [/olympus|lightning roulette/i, 'bolt'],
  [/roulette/i, 'roulette'],
  [/teen patti|rummy|call break|matka|32 cards|super ace|holdem|poker|baccarat|7 up/i, 'cards'],
  [/bonanza|sugar|candy|fruit/i, 'candy'],
  [/dragon/i, 'dragon'],
  [/andar bahar/i, 'spade'],
  [/mines|bombing/i, 'bomb'],
  [/cricket/i, 'cricket'],
  [/football/i, 'football'],
  [/tennis|basketball|kabaddi/i, 'tennis'],
  [/gems|starburst|fortune/i, 'gem'],
  [/fish|ocean|boom legend|toad|bass/i, 'fish'],
  [/royal|king|monopoly/i, 'crown'],
  [/bingo|keno|lotto|number|color game/i, 'bingo'],
  [/sic bo|dice/i, 'dice'],
  [/strike|dota|legends|valorant|pubg|esport/i, 'gamepad'],
  [/horse/i, 'horse'],
  [/bank|exchange/i, 'bank'],
];

export function motifFor(name: string, provider: string): Motif {
  for (const [re, m] of RULES) if (re.test(name) || re.test(provider)) return m;
  return 'reels';
}

/* ---------- the drawings ---------- */

const ART: Record<Motif, React.ReactNode> = {
  plane: (
    <g>
      <path d="M50 14 57 44 88 52 88 60 57 56 55 76 66 84 66 89 50 85 34 89 34 84 45 76 43 56 12 60 12 52 43 44Z"
            fill={SILVER} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M50 14 57 44 88 52 88 56 50 50Z" fill={WHITE} />
      <circle cx="50" cy="34" r="4.5" fill={GOLD} stroke={INK} strokeWidth="2" />
    </g>
  ),
  wheel: (
    <g>
      <circle cx="50" cy="50" r="34" fill={GOLD} stroke={INK} strokeWidth="3" />
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} fill={i % 2 ? '#8e2de2' : '#ff4d4f'} opacity={i % 3 ? 1 : .82}
              d={`M50 50 L${pt(50, 50, 34, i * 30 - 90)} A34 34 0 0 1 ${pt(50, 50, 34, (i + 1) * 30 - 90)} Z`} />
      ))}
      <circle cx="50" cy="50" r="34" fill="none" stroke={GOLD} strokeWidth="5" />
      <circle cx="50" cy="50" r="8" fill={GOLD} stroke={INK} strokeWidth="2.4" />
      <path d="M50 6 44 18h12Z" fill={WHITE} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    </g>
  ),
  bolt: (
    <g>
      <path d="M58 8 26 56h18L40 92 76 40H56Z" fill={GOLD} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M58 8 26 56h9L58 22Z" fill="#fff3c4" />
    </g>
  ),
  roulette: (
    <g>
      <circle cx="50" cy="50" r="36" fill={INK} stroke={GOLD} strokeWidth="3.5" />
      {Array.from({ length: 16 }, (_, i) => (
        <path key={i} fill={i % 2 ? RED : '#1b3330'}
              d={`M50 50 L${pt(50, 50, 36, i * 22.5 - 90)} A36 36 0 0 1 ${pt(50, 50, 36, (i + 1) * 22.5 - 90)} Z`} />
      ))}
      <circle cx="50" cy="50" r="19" fill={GOLD} stroke={INK} strokeWidth="2.5" />
      <circle cx="50" cy="50" r="8" fill={INK} />
      <circle cx="50" cy="24" r="4.5" fill={WHITE} stroke={INK} strokeWidth="1.8" />
    </g>
  ),
  cards: (
    <g>
      <g transform="rotate(-18 50 56)">
        <rect x="20" y="24" width="38" height="54" rx="6" fill={SILVER} stroke={INK} strokeWidth="2.6" />
        <path d="M39 38c6 8 12 10 12 16a6 6 0 0 1-12 2 6 6 0 0 1-12-2c0-6 6-8 12-16Z" fill={RED} />
      </g>
      <g transform="rotate(14 50 56)">
        <rect x="42" y="20" width="38" height="54" rx="6" fill={WHITE} stroke={INK} strokeWidth="2.6" />
        <path d="M61 32c7 9 13 12 13 18a7 7 0 0 1-11 5l2 9H57l2-9a7 7 0 0 1-11-5c0-6 6-9 13-18Z" fill={INK} />
      </g>
    </g>
  ),
  spade: (
    <g>
      <path d="M50 12c14 18 28 25 28 39a15 15 0 0 1-24 11l4 22H42l4-22a15 15 0 0 1-24-11c0-14 14-21 28-39Z"
            fill={INK} stroke={GOLD} strokeWidth="3" strokeLinejoin="round" />
      <path d="M50 20c-8 11-16 17-19 24 4-3 11-9 19-24Z" fill="#3d5a56" />
    </g>
  ),
  candy: (
    <g>
      <circle cx="50" cy="50" r="24" fill="#ff5fa2" stroke={INK} strokeWidth="3" />
      <path d="M50 26a24 24 0 0 1 0 48 12 24 0 0 0 0-48Z" fill="#ffd0e4" />
      <path d="M26 50a24 24 0 0 1 24-24 12 24 0 0 0 0 48 24 24 0 0 1-24-24Z" fill="#ff8ec0" opacity=".7" />
      <path d="M26 34 8 24l6 14-6 14 18-10Z" fill={GOLD} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M74 34l18-10-6 14 6 14-18-10Z" fill={GOLD} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
    </g>
  ),
  dragon: (
    <g>
      <path d="M18 62c0-18 14-30 32-30 12 0 20 5 24 12l14-8-6 14 10 6-14 4c-2 14-14 22-28 22-18 0-32-8-32-20Z"
            fill="#20c26b" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M30 50c8-6 18-8 28-6" stroke="#0e7a45" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="66" cy="50" r="4" fill={GOLD} stroke={INK} strokeWidth="1.8" />
      <path d="M22 74c8 6 18 8 28 6" stroke="#0e7a45" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M78 60l14 6-14 4Z" fill={RED} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    </g>
  ),
  bomb: (
    <g>
      <circle cx="46" cy="58" r="27" fill={INK} stroke="#4b625e" strokeWidth="3" />
      <ellipse cx="37" cy="49" rx="7" ry="5" fill="#5d7d78" opacity=".8" transform="rotate(-30 37 49)" />
      <rect x="56" y="22" width="12" height="12" rx="3" fill="#5d7d78" stroke={INK} strokeWidth="2.4" transform="rotate(30 62 28)" />
      <path d="M66 24c8-6 14-2 12 6" stroke={GOLD} strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M82 22l4-8 3 8 8 3-8 3-3 8-4-8-8-3Z" fill={GOLD} />
    </g>
  ),
  cricket: (
    <g>
      <rect x="52" y="12" width="16" height="46" rx="5" fill="#c98a3d" stroke={INK} strokeWidth="2.6" transform="rotate(20 60 35)" />
      <rect x="55" y="52" width="9" height="26" rx="4" fill="#8b5a24" stroke={INK} strokeWidth="2.6" transform="rotate(20 60 65)" />
      <circle cx="28" cy="66" r="16" fill={RED} stroke={INK} strokeWidth="2.8" />
      <path d="M18 58c6 5 10 11 12 18M38 58c-6 5-10 11-12 18" stroke={WHITE} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </g>
  ),
  football: (
    <g>
      <circle cx="50" cy="50" r="32" fill={WHITE} stroke={INK} strokeWidth="3" />
      <path d="M50 28 66 40 60 60H40l-6-20Z" fill={INK} />
      <path d="M50 18v10M22 42l12 4M78 42l-12 4M34 74l8-10M66 74l-8-10" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
    </g>
  ),
  tennis: (
    <g>
      <circle cx="50" cy="50" r="30" fill="#d8f14a" stroke={INK} strokeWidth="3" />
      <path d="M26 30c12 10 12 30 0 40M74 30c-12 10-12 30 0 40" stroke={WHITE} strokeWidth="3.4" fill="none" strokeLinecap="round" />
    </g>
  ),
  gem: (
    <g>
      <path d="M50 14 84 40 50 88 16 40Z" fill="#3ad2ff" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M50 14 84 40H16Z" fill="#8ae9ff" />
      <path d="M50 14 66 40 50 88 34 40Z" fill="#c9f5ff" opacity=".75" />
      <path d="M16 40h68L50 88Z" fill="#1aa9d8" opacity=".45" />
    </g>
  ),
  fish: (
    <g>
      <path d="M14 52c14-18 40-22 54-10l14-12-4 18 10 8-12 6 2 16-16-10c-16 8-38 2-48-16Z"
            fill="#2fa8ff" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="34" cy="48" r="4.5" fill={WHITE} stroke={INK} strokeWidth="2" />
      <path d="M46 60c8 4 16 4 22 0" stroke="#1268b0" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  ),
  crown: (
    <g>
      <path d="M14 72 20 28l18 16L50 18l12 26 18-16 6 44Z" fill={GOLD} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <rect x="14" y="72" width="72" height="12" rx="4" fill={GOLD_D} stroke={INK} strokeWidth="3" />
      <circle cx="50" cy="56" r="5" fill={RED} stroke={INK} strokeWidth="2" />
      <circle cx="26" cy="60" r="4" fill="#3ad2ff" stroke={INK} strokeWidth="2" />
      <circle cx="74" cy="60" r="4" fill="#3ad2ff" stroke={INK} strokeWidth="2" />
    </g>
  ),
  reels: (
    <g>
      <rect x="10" y="24" width="80" height="52" rx="8" fill={INK} stroke={GOLD} strokeWidth="3" />
      <rect x="18" y="32" width="20" height="36" rx="4" fill={SILVER} />
      <rect x="40" y="32" width="20" height="36" rx="4" fill={WHITE} />
      <rect x="62" y="32" width="20" height="36" rx="4" fill={SILVER} />
      <circle cx="28" cy="50" r="7" fill={RED} />
      <path d="M50 42l3.4 7 7.6.8-5.6 5 1.6 7.4L50 58.6 42.9 62.2l1.6-7.4-5.6-5 7.6-.8Z" fill={GOLD} />
      <circle cx="72" cy="50" r="7" fill="#2fa8ff" />
    </g>
  ),
  dice: (
    <g>
      <rect x="12" y="34" width="44" height="44" rx="9" fill={WHITE} stroke={INK} strokeWidth="3" />
      <circle cx="24" cy="46" r="4" fill={INK} /><circle cx="44" cy="46" r="4" fill={INK} />
      <circle cx="34" cy="56" r="4" fill={INK} />
      <circle cx="24" cy="66" r="4" fill={INK} /><circle cx="44" cy="66" r="4" fill={INK} />
      <rect x="50" y="16" width="38" height="38" rx="8" fill={GOLD} stroke={INK} strokeWidth="3" transform="rotate(14 69 35)" />
      <circle cx="69" cy="35" r="4.5" fill={INK} />
      <circle cx="58" cy="26" r="4" fill={INK} /><circle cx="80" cy="44" r="4" fill={INK} />
    </g>
  ),
  bingo: (
    <g>
      <circle cx="34" cy="60" r="21" fill={RED} stroke={INK} strokeWidth="3" />
      <circle cx="34" cy="60" r="11" fill={WHITE} />
      <circle cx="68" cy="38" r="18" fill="#2fa8ff" stroke={INK} strokeWidth="3" />
      <circle cx="68" cy="38" r="9" fill={WHITE} />
      <circle cx="72" cy="72" r="14" fill={GOLD} stroke={INK} strokeWidth="3" />
      <circle cx="72" cy="72" r="7" fill={WHITE} />
    </g>
  ),
  gamepad: (
    <g>
      <path d="M24 34h52c11 0 18 10 18 22s-6 14-13 14c-6 0-9-4-13-8H32c-4 4-7 8-13 8C12 70 6 68 6 56s7-22 18-22Z"
            fill={INK} stroke={GOLD} strokeWidth="3" strokeLinejoin="round" />
      <rect x="20" y="48" width="18" height="5" rx="2.5" fill={WHITE} />
      <rect x="26.5" y="41.5" width="5" height="18" rx="2.5" fill={WHITE} />
      <circle cx="68" cy="46" r="5" fill={GOLD} /><circle cx="79" cy="56" r="5" fill={RED} />
      <circle cx="68" cy="62" r="4.5" fill="#2fa8ff" />
    </g>
  ),
  horse: (
    <g>
      <path d="M50 12c18 0 32 14 32 34 0 22-14 34-14 44H32c0-10-14-22-14-44 0-20 14-34 32-34Z"
            fill="none" stroke={GOLD} strokeWidth="11" strokeLinecap="round" />
      <circle cx="26" cy="80" r="4.5" fill={SILVER} stroke={INK} strokeWidth="2" />
      <circle cx="74" cy="80" r="4.5" fill={SILVER} stroke={INK} strokeWidth="2" />
      <circle cx="21" cy="56" r="4" fill={SILVER} stroke={INK} strokeWidth="2" />
      <circle cx="79" cy="56" r="4" fill={SILVER} stroke={INK} strokeWidth="2" />
    </g>
  ),
  crosshair: (
    <g>
      <circle cx="50" cy="50" r="32" fill="none" stroke={GOLD} strokeWidth="5" />
      <circle cx="50" cy="50" r="14" fill="none" stroke={WHITE} strokeWidth="3.4" />
      <circle cx="50" cy="50" r="4" fill={RED} />
      <path d="M50 6v20M50 74v20M6 50h20M74 50h20" stroke={WHITE} strokeWidth="5" strokeLinecap="round" />
    </g>
  ),
  sword: (
    <g>
      <path d="M74 12 86 24 46 64l-8-4-4-8Z" fill={SILVER} stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />
      <path d="M74 12 86 24 66 44 54 32Z" fill={WHITE} />
      <path d="M34 60 24 72l14 14 12-10Z" fill={GOLD} stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />
      <path d="M20 68 12 88l20-8Z" fill={GOLD_D} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
    </g>
  ),
  mobile: (
    <g>
      <rect x="30" y="10" width="40" height="80" rx="8" fill={INK} stroke={GOLD} strokeWidth="3.4" />
      <rect x="36" y="20" width="28" height="54" rx="3" fill="#2fa8ff" />
      <path d="M50 30l4.6 9.4 10.4 1.5-7.5 7.3 1.8 10.3L50 53.6 40.7 58.5l1.8-10.3-7.5-7.3 10.4-1.5Z" fill={GOLD} />
      <circle cx="50" cy="82" r="4" fill={SILVER} />
    </g>
  ),
  shark: (
    <g>
      <path d="M8 62c16-22 44-26 58-14l10-26 6 28 14 6-16 8 2 18-18-12c-16 8-42 4-56-8Z"
            fill="#5b7f96" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M8 62c16-22 44-26 58-14-14 6-38 12-58 14Z" fill="#8fb3c6" />
      <circle cx="30" cy="54" r="4" fill={WHITE} stroke={INK} strokeWidth="2" />
      <path d="M24 66l6 6 6-6 6 6 6-6" stroke={WHITE} strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </g>
  ),
  toad: (
    <g>
      <ellipse cx="50" cy="60" rx="34" ry="26" fill="#3fbf5a" stroke={INK} strokeWidth="3" />
      <circle cx="34" cy="34" r="12" fill="#3fbf5a" stroke={INK} strokeWidth="3" />
      <circle cx="66" cy="34" r="12" fill="#3fbf5a" stroke={INK} strokeWidth="3" />
      <circle cx="34" cy="34" r="5" fill={GOLD} stroke={INK} strokeWidth="2" />
      <circle cx="66" cy="34" r="5" fill={GOLD} stroke={INK} strokeWidth="2" />
      <path d="M32 62c8 8 28 8 36 0" stroke={INK} strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <circle cx="50" cy="78" r="8" fill={GOLD} stroke={INK} strokeWidth="2.4" />
    </g>
  ),
  train: (
    <g>
      <rect x="14" y="34" width="52" height="34" rx="6" fill={RED} stroke={INK} strokeWidth="3" />
      <rect x="66" y="46" width="22" height="22" rx="4" fill={GOLD} stroke={INK} strokeWidth="3" />
      <rect x="24" y="42" width="16" height="14" rx="3" fill="#9fd8ff" stroke={INK} strokeWidth="2.4" />
      <rect x="46" y="42" width="14" height="14" rx="3" fill="#9fd8ff" stroke={INK} strokeWidth="2.4" />
      <rect x="20" y="18" width="12" height="16" rx="3" fill={INK} />
      <circle cx="30" cy="76" r="9" fill={INK} stroke={SILVER} strokeWidth="3" />
      <circle cx="58" cy="76" r="9" fill={INK} stroke={SILVER} strokeWidth="3" />
      <circle cx="80" cy="76" r="7" fill={INK} stroke={SILVER} strokeWidth="3" />
    </g>
  ),
  cowboy: (
    <g>
      <path d="M28 54c0-18 8-30 22-30s22 12 22 30Z" fill="#8b5a24" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <ellipse cx="50" cy="58" rx="42" ry="12" fill="#a86c2c" stroke={INK} strokeWidth="3" />
      <rect x="26" y="46" width="48" height="9" rx="3" fill={GOLD} stroke={INK} strokeWidth="2.4" />
      <circle cx="50" cy="50.5" r="4" fill={INK} />
      <path d="M22 76l6 12 8-8 8 10 6-14" stroke={GOLD} strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  blackjack: (
    <g>
      <rect x="14" y="26" width="40" height="54" rx="6" fill={WHITE} stroke={INK} strokeWidth="2.8" transform="rotate(-10 34 53)" />
      <rect x="46" y="22" width="40" height="54" rx="6" fill={SILVER} stroke={INK} strokeWidth="2.8" transform="rotate(8 66 49)" />
      <text x="50" y="60" textAnchor="middle" fontSize="30" fontWeight="900" fill={GOLD} stroke={INK} strokeWidth="1.6">21</text>
    </g>
  ),
  urn: (
    <g>
      <path d="M28 34h44l-6 46a10 10 0 0 1-10 8H44a10 10 0 0 1-10-8Z" fill="#b8452f" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <rect x="22" y="24" width="56" height="12" rx="5" fill={GOLD} stroke={INK} strokeWidth="2.8" />
      <path d="M36 50h28M34 62h32" stroke={GOLD} strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="50" cy="14" r="6" fill={GOLD} stroke={INK} strokeWidth="2.4" />
    </g>
  ),
  fan: (
    <g>
      {[-30, -10, 10, 30].map((rot, i) => (
        <rect key={rot} x="38" y="24" width="26" height="40" rx="4"
              fill={i % 2 ? WHITE : SILVER} stroke={INK} strokeWidth="2.4"
              transform={`rotate(${rot} 50 74)`} />
      ))}
      <circle cx="50" cy="74" r="6" fill={GOLD} stroke={INK} strokeWidth="2.4" />
    </g>
  ),
  chip: (
    <g>
      <circle cx="50" cy="52" r="32" fill={RED} stroke={INK} strokeWidth="3" />
      {[0, 45, 90, 135].map((a) => (
        <rect key={a} x="46" y="16" width="8" height="14" fill={WHITE} transform={`rotate(${a} 50 52)`} />
      ))}
      {[0, 45, 90, 135].map((a) => (
        <rect key={`b${a}`} x="46" y="74" width="8" height="14" fill={WHITE} transform={`rotate(${a} 50 52)`} />
      ))}
      <circle cx="50" cy="52" r="19" fill={WHITE} stroke={INK} strokeWidth="2.4" />
      <circle cx="50" cy="52" r="12" fill={GOLD} stroke={INK} strokeWidth="2.4" />
    </g>
  ),
  seven: (
    <g>
      <path d="M26 20h48L46 88H28l26-52H26Z" fill={GOLD} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M26 20h48l-6 12H26Z" fill="#fff3c4" />
      <path d="M76 60l3.4 7 7.6.8-5.6 5 1.6 7.4-7-3.8-7 3.8 1.6-7.4-5.6-5 7.6-.8Z" fill={WHITE} />
    </g>
  ),
  bank: (
    <g>
      <path d="M50 14 90 34H10Z" fill={GOLD} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <rect x="10" y="34" width="80" height="8" rx="3" fill={GOLD_D} stroke={INK} strokeWidth="2.6" />
      {[22, 40, 58, 76].map((x) => (
        <rect key={x} x={x - 5} y="42" width="10" height="32" rx="2" fill={SILVER} stroke={INK} strokeWidth="2.4" />
      ))}
      <rect x="8" y="74" width="84" height="10" rx="3" fill={GOLD} stroke={INK} strokeWidth="2.8" />
    </g>
  ),
};

export default function GameIcon({ motif }: { motif: Motif }) {
  return (
    <svg className="game__icon" viewBox="0 0 100 100" aria-hidden>
      <defs>
        {/*
          Flat vector shapes look cheap next to moulded artwork. This bevels
          the whole motif in one pass — a lit edge top-left, a shadowed edge
          bottom-right, then a soft drop shadow underneath — which is what
          gives the tiles their weight.
        */}
        <filter id="ic-relief" x="-25%" y="-25%" width="150%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.4" result="blur" />
          <feSpecularLighting
            in="blur" surfaceScale="3.2" specularConstant="0.85"
            specularExponent="22" lightingColor="#ffffff" result="spec"
          >
            <feDistantLight azimuth="228" elevation="58" />
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="specClip" />
          <feComposite
            in="SourceGraphic" in2="specClip"
            operator="arithmetic" k1="0" k2="1" k3="0.7" k4="0" result="lit"
          />
          <feDropShadow dx="0" dy="2.2" stdDeviation="2" floodColor="#000" floodOpacity=".55" />
        </filter>
      </defs>
      <g filter="url(#ic-relief)">{ART[motif]}</g>
    </svg>
  );
}
