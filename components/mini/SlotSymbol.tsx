/* ============================================================
   Golden Ace's symbols, drawn here rather than licensed.

   Four cards, four trinkets, a wild and a scatter, all in the same
   0–100 box so the board can size them off the cell. A gilded card is
   the same drawing on a gold plate — the player has to be able to tell
   the two apart at a glance on a phone, because whether a card is
   gilded is the whole game.
   ============================================================ */

import type { Cell, SlotSymbol as Sym } from '@/lib/slots';

const CARD_INK: Record<string, string> = {
  J: '#4aa8ff',
  Q: '#c084fc',
  K: '#38d9a9',
  A: '#ff6b6b',
};

export const SYMBOL_LABEL: Record<Sym, string> = {
  J: 'Jack', Q: 'Queen', K: 'King', A: 'Ace',
  HAT: 'Top Hat', GEM: 'Gem', BELL: 'Bell', CROWN: 'Crown',
  WILD: 'Wild', SCATTER: 'Scatter',
};

export default function SlotSymbolArt({ cell }: { cell: Cell }) {
  const { s, gold } = cell;

  return (
    <svg viewBox="0 0 100 100" className="sl-sym" role="img" aria-label={SYMBOL_LABEL[s]}>
      {s === 'J' || s === 'Q' || s === 'K' || s === 'A' ? (
        <Card letter={s} gold={gold} />
      ) : s === 'HAT' ? <Hat />
        : s === 'GEM' ? <Gem />
        : s === 'BELL' ? <Bell />
        : s === 'CROWN' ? <Crown />
        : s === 'WILD' ? <Wild />
        : <Scatter />}
    </svg>
  );
}

/* ---------- the cards ---------- */

function Card({ letter, gold }: { letter: 'J' | 'Q' | 'K' | 'A'; gold: boolean }) {
  const id = `cg-${letter}${gold ? '-g' : ''}`;
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          {gold ? (
            <>
              <stop offset="0%" stopColor="#ffe89a" />
              <stop offset="55%" stopColor="#ffc42e" />
              <stop offset="100%" stopColor="#c98600" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#dfe9f5" />
            </>
          )}
        </linearGradient>
      </defs>
      <rect x="20" y="12" width="60" height="76" rx="9" fill={`url(#${id})`} />
      <rect
        x="20" y="12" width="60" height="76" rx="9"
        fill="none" stroke={gold ? '#8a5a00' : '#b9c7d6'} strokeWidth="3"
      />
      <text
        x="50" y="62"
        textAnchor="middle"
        fontSize="44"
        fontWeight="900"
        fontFamily="Georgia, 'Times New Roman', serif"
        fill={gold ? '#5c3a00' : CARD_INK[letter]}
      >
        {letter}
      </text>
      {gold && <circle cx="68" cy="26" r="5" fill="#fff8dc" opacity="0.9" />}
    </>
  );
}

/* ---------- the trinkets ---------- */

const Hat = () => (
  <>
    {/* a top hat has to read at 30px on a dark board, so the brim is the
        widest, lightest shape and the band is the only saturated colour */}
    <ellipse cx="50" cy="76" rx="40" ry="10" fill="#e8eef7" />
    <ellipse cx="50" cy="74" rx="40" ry="10" fill="#b9c7d6" />
    <path d="M31 20h38v54H31Z" fill="#3a4f6b" />
    <path d="M31 20h14v54H31Z" fill="#4d668a" />
    <ellipse cx="50" cy="20" rx="19" ry="7" fill="#5a749a" />
    <rect x="31" y="54" width="38" height="12" fill="#ffc42e" />
    <rect x="60" y="54" width="9" height="12" fill="#d98800" />
  </>
);

const Gem = () => (
  <>
    <defs>
      <linearGradient id="sl-gem" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#8ef0ff" />
        <stop offset="100%" stopColor="#1f8ecf" />
      </linearGradient>
    </defs>
    <path d="M50 14 84 40 50 88 16 40Z" fill="url(#sl-gem)" />
    <path d="M50 14 66 40 50 88 34 40Z" fill="#bff4ff" opacity="0.55" />
    <path d="M16 40h68" stroke="#0d5c8c" strokeWidth="3" fill="none" />
  </>
);

const Bell = () => (
  <>
    <path
      d="M50 16c14 0 22 11 22 26 0 14 4 20 8 26H20c4-6 8-12 8-26 0-15 8-26 22-26Z"
      fill="#ffc42e"
    />
    <path d="M50 16c-6 0-9 5-9 12h18c0-7-3-12-9-12Z" fill="#ffe89a" />
    <circle cx="50" cy="80" r="7" fill="#d98800" />
  </>
);

const Crown = () => (
  <>
    <path d="M18 72 26 30l16 16 8-22 8 22 16-16 8 42Z" fill="#ffc42e" />
    <rect x="18" y="72" width="64" height="12" rx="4" fill="#d98800" />
    <circle cx="26" cy="30" r="5" fill="#ff6b6b" />
    <circle cx="50" cy="24" r="5" fill="#8ef0ff" />
    <circle cx="74" cy="30" r="5" fill="#ff6b6b" />
  </>
);

const Wild = () => (
  <>
    <defs>
      <linearGradient id="sl-wild" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffe89a" />
        <stop offset="60%" stopColor="#ffb32e" />
        <stop offset="100%" stopColor="#b56b00" />
      </linearGradient>
    </defs>
    <rect x="12" y="14" width="76" height="72" rx="10" fill="url(#sl-wild)" />
    <rect x="12" y="14" width="76" height="72" rx="10" fill="none" stroke="#7a4a00" strokeWidth="3" />
    <text
      x="50" y="60"
      textAnchor="middle" fontSize="26" fontWeight="900"
      fontFamily="Georgia, 'Times New Roman', serif" fill="#4a2c00"
      letterSpacing="1"
    >
      WILD
    </text>
  </>
);

const Scatter = () => (
  <>
    <defs>
      <radialGradient id="sl-scat">
        <stop offset="0%" stopColor="#fff6c9" />
        <stop offset="100%" stopColor="#ff5a5a" />
      </radialGradient>
    </defs>
    <path
      d="M50 8 60 36 90 38 66 56 74 86 50 68 26 86 34 56 10 38 40 36Z"
      fill="url(#sl-scat)"
      stroke="#8a1f1f"
      strokeWidth="3"
      strokeLinejoin="round"
    />
  </>
);
