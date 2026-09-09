/* ============================================================
   Golden Ace's deck, drawn here rather than licensed.

   Every symbol is a playing card, because the whole game reads off
   one: four suit cards carrying a single pip, four court cards, and
   the two that are not cards at all — the wild a gilded card turns
   into, and the scatter that pays the free games.

   A gilded card is the same face on a gold plate. On a phone that
   difference has to survive at about 40 px, so it is carried by the
   whole card body rather than a corner flourish: white stock versus
   gold, grey edge versus brass.
   ============================================================ */

import type { Cell, PaySymbol, SlotSymbol as Sym } from '@/lib/slots';

/** Suit ink, taken off a real deck rather than the brand palette —
    a blue club and an orange diamond are what the eye expects here. */
const SUIT_INK: Record<string, string> = {
  DIAMOND: '#e8542f',
  HEART: '#d5232b',
  CLUB: '#2b5fa8',
  SPADE: '#1e2a38',
};

/** Which suit sits in a court card's corner, and what colour it is. */
const COURT_SUIT: Record<string, keyof typeof SUIT_INK> = {
  J: 'CLUB', Q: 'HEART', K: 'DIAMOND', A: 'SPADE',
};

export const SYMBOL_LABEL: Record<Sym, string> = {
  DIAMOND: 'Diamond', CLUB: 'Club', HEART: 'Heart', SPADE: 'Spade',
  J: 'Jack', Q: 'Queen', K: 'King', A: 'Ace',
  WILD: 'Wild', SCATTER: 'Scatter',
};

export default function SlotSymbolArt({ cell }: { cell: Cell }) {
  const { s, gold } = cell;

  if (s === 'WILD') return <Frame gold aria="Wild"><Joker /></Frame>;
  if (s === 'SCATTER') return <Frame scatter aria="Scatter"><Scatter /></Frame>;

  const suit = s in SUIT_INK ? (s as keyof typeof SUIT_INK) : COURT_SUIT[s];
  const court = !(s in SUIT_INK);

  return (
    <Frame gold={gold} aria={SYMBOL_LABEL[s]}>
      {court ? <Court rank={s as 'J' | 'Q' | 'K' | 'A'} gold={gold} />
             : <Pip suit={suit} />}
      <Index rank={court ? s : ''} suit={suit} gold={gold} />
    </Frame>
  );
}

/* ---------- the card itself ---------- */

function Frame({
  gold, scatter, aria, children,
}: {
  gold?: boolean;
  scatter?: boolean;
  aria: string;
  children: React.ReactNode;
}) {
  const id = gold ? 'sa-gold' : scatter ? 'sa-scat' : 'sa-white';
  return (
    <svg viewBox="0 0 100 100" className="sl-sym" role="img" aria-label={aria}>
      <defs>
        <linearGradient id="sa-white" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e6edf5" />
        </linearGradient>
        <linearGradient id="sa-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff6d0" />
          <stop offset="45%" stopColor="#ffd35c" />
          <stop offset="100%" stopColor="#dfa116" />
        </linearGradient>
        <linearGradient id="sa-scat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a1520" />
          <stop offset="100%" stopColor="#7a1023" />
        </linearGradient>
      </defs>

      <rect x="12" y="6" width="76" height="88" rx="9" fill={`url(#${id})`} />
      <rect
        x="12" y="6" width="76" height="88" rx="9" fill="none"
        stroke={gold ? '#a97400' : scatter ? '#ffc42e' : '#c3d0de'}
        strokeWidth={gold || scatter ? 3 : 2}
      />
      {/* the gilded stock catches the light along its top edge */}
      {gold && <path d="M17 12h66" stroke="#fff8dc" strokeWidth="2.5" opacity=".75" fill="none" />}
      {children}
    </svg>
  );
}

/** Rank and suit in the corner, the way a real card is read from a fan. */
function Index({ rank, suit, gold }: { rank: string; suit: string; gold?: boolean }) {
  const ink = gold ? '#5c3a00' : SUIT_INK[suit];
  return (
    <>
      {rank && (
        <text
          x="21" y="27" fontSize="18" fontWeight="900"
          fontFamily="Georgia, 'Times New Roman', serif" fill={ink}
        >
          {rank}
        </text>
      )}
      <g transform={rank ? 'translate(19 30) scale(0.13)' : 'translate(19 13) scale(0.13)'}>
        <SuitPath suit={suit} fill={ink} />
      </g>
    </>
  );
}

/** The big centred pip on a suit card. */
const Pip = ({ suit }: { suit: string }) => (
  <g transform="translate(50 56) scale(0.46)">
    <g transform="translate(-50 -50)">
      <SuitPath suit={suit} fill={SUIT_INK[suit]} />
    </g>
  </g>
);

/* Suit outlines in a 0–100 box, so one path serves the corner index and
   the centre pip at whatever scale each needs. */
function SuitPath({ suit, fill }: { suit: string; fill: string }) {
  if (suit === 'DIAMOND') return <path d="M50 4 88 50 50 96 12 50Z" fill={fill} />;
  if (suit === 'HEART') {
    return (
      <path
        d="M50 92C22 70 6 54 6 34 6 18 18 8 31 8c8 0 15 4 19 11 4-7 11-11 19-11 13 0 25 10 25 26 0 20-16 36-44 58Z"
        fill={fill}
      />
    );
  }
  if (suit === 'CLUB') {
    return (
      <>
        <circle cx="50" cy="28" r="20" fill={fill} />
        <circle cx="24" cy="58" r="20" fill={fill} />
        <circle cx="76" cy="58" r="20" fill={fill} />
        <path d="M44 60h12l8 36H36Z" fill={fill} />
      </>
    );
  }
  return (
    <>
      <path d="M50 6C30 26 8 42 8 60c0 13 10 22 22 22 8 0 14-4 18-10-2 12-6 18-12 22h28c-6-4-10-10-12-22 4 6 10 10 18 10 12 0 22-9 22-22 0-18-22-34-42-54Z" fill={fill} />
    </>
  );
}

/* ---------- the court ---------- */

/** J, Q and K carry a figure; the ace carries its suit, big, with a
    banner — which is the card the game is named for. */
function Court({ rank, gold }: { rank: 'J' | 'Q' | 'K' | 'A'; gold?: boolean }) {
  const suit = COURT_SUIT[rank];
  const ink = SUIT_INK[suit];

  if (rank === 'A') {
    return (
      <>
        <g transform="translate(50 52) scale(0.42)">
          <g transform="translate(-50 -50)"><SuitPath suit="SPADE" fill={gold ? '#5c3a00' : '#1e2a38'} /></g>
        </g>
        <rect x="26" y="66" width="48" height="17" rx="4" fill="#d9a400" />
        <rect x="26" y="66" width="48" height="17" rx="4" fill="none" stroke="#8a5a00" strokeWidth="2" />
        <text
          x="50" y="79" textAnchor="middle" fontSize="12.5" fontWeight="900"
          fontFamily="Georgia, 'Times New Roman', serif" fill="#3a2400" letterSpacing="1.5"
        >
          ACE
        </text>
      </>
    );
  }

  /* A crown, a head and shoulders, in the rank's own colour. It is not a
     portrait — at 40 px on a phone a portrait is mud — but the three read
     apart from each other, which is all the board needs, and it sits low
     enough to clear the index in the corner. */
  const crown = rank === 'K'
    ? (
      <>
        <path d="M31 47 35 27l8 9 6-12 6 12 8-9 4 20Z" fill="#e8b423" stroke="#8a5a00" strokeWidth="1.6" />
        <circle cx="35" cy="25" r="3.4" fill="#e8b423" stroke="#8a5a00" strokeWidth="1.2" />
        <circle cx="49" cy="21" r="3.4" fill="#e8b423" stroke="#8a5a00" strokeWidth="1.2" />
        <circle cx="63" cy="25" r="3.4" fill="#e8b423" stroke="#8a5a00" strokeWidth="1.2" />
      </>
    )
    : rank === 'Q'
      ? <path d="M33 47 36 30l7 8 6-11 6 11 7-8 3 17Z" fill={ink} stroke="#00000030" strokeWidth="1.2" />
      : <path d="M33 47q16-15 32 0Z" fill={ink} />;

  return (
    <>
      {crown}
      <circle cx="49" cy="59" r="12" fill="#f6dcc2" stroke={ink} strokeWidth="2" />
      <path d="M29 92q3-19 20-19t20 19Z" fill={ink} />
      <path d="M49 73v19" stroke="#f6dcc2" strokeWidth="2.5" />
    </>
  );
}

/* ---------- the two that are not cards ---------- */

/** The wild a gilded card becomes: a jester's cap, the mark the whole
    genre uses for a card that stands in for any other. */
const Joker = () => (
  <>
    <path d="M28 66 33 34l10 11 7-15 7 15 10-11 5 32Z" fill="#c62828" stroke="#7a1023" strokeWidth="2" />
    <path d="M43 45l7-15 7 15-7 21Z" fill="#f5c518" />
    <circle cx="33" cy="32" r="6" fill="#f5c518" stroke="#7a1023" strokeWidth="2" />
    <circle cx="50" cy="26" r="6" fill="#f5c518" stroke="#7a1023" strokeWidth="2" />
    <circle cx="67" cy="32" r="6" fill="#f5c518" stroke="#7a1023" strokeWidth="2" />
    <rect x="24" y="66" width="52" height="15" rx="4" fill="#7a1023" />
    <text
      x="50" y="78" textAnchor="middle" fontSize="11.5" fontWeight="900"
      fontFamily="Georgia, 'Times New Roman', serif" fill="#ffd35c" letterSpacing="1.5"
    >
      WILD
    </text>
  </>
);

const Scatter = () => (
  <>
    <path
      d="M50 16 59 40 84 42 65 58 71 82 50 68 29 82 35 58 16 42 41 40Z"
      fill="#ffc42e" stroke="#8a5a00" strokeWidth="2.5" strokeLinejoin="round"
    />
    <text
      x="50" y="90" textAnchor="middle" fontSize="10" fontWeight="900"
      fontFamily="Georgia, 'Times New Roman', serif" fill="#ffd35c" letterSpacing="1"
    >
      SCATTER
    </text>
  </>
);

/** The paytable needs a swatch per symbol without a Cell to hand. */
export const swatch = (s: PaySymbol): Cell => ({ s, gold: false });
