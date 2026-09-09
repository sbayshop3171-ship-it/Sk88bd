/* ============================================================
   Golden Ace — the house's own five-reel slot.

   Mechanically it is the cascading-wilds shape players arriving from other
   books already know: 5 reels by 4 rows paying 1,024 ways, card symbols
   that can land gilded, and a win that clears the board and pays again at a
   higher multiplier. The signature move is the gilded card — a golden J, Q,
   K or A caught in a win does not fall away with the rest of the
   combination, it turns into a wild and stays for the next drop, which is
   what lets one spin roll into a long chain.

   Nothing here is copied from anybody's game: the symbols, the reel
   weights, the paytable and the ladder are ours, and the paytable is
   *derived* — PAY_SCALE below is the number that pulls the simulated return
   onto RTP, exactly the way Plinko's tables are scaled rather than typed in.
   Re-run scripts/simulate-slots.mjs after touching any weight or pay.

   Pure module — no node imports, no I/O — so the screen, the API route and
   the simulator all read one set of rules.
   ============================================================ */

export const REELS = 5;
export const ROWS = 4;

/** 4 rows on each of 5 reels, any position, left to right. */
export const WAYS = ROWS ** REELS;

/** The four suits, which is what most of the deck is. */
export type SuitSymbol = 'DIAMOND' | 'CLUB' | 'HEART' | 'SPADE';
/** The court, plus the ace — rarer, and worth the wait. */
export type CourtSymbol = 'J' | 'Q' | 'K' | 'A';
export type PaySymbol = SuitSymbol | CourtSymbol;
export type SlotSymbol = PaySymbol | 'WILD' | 'SCATTER';

export const SUIT_SYMBOLS: SuitSymbol[] = ['DIAMOND', 'CLUB', 'HEART', 'SPADE'];
export const COURT_SYMBOLS: CourtSymbol[] = ['J', 'Q', 'K', 'A'];

/** Low to high — the order the paytable is read in. */
export const PAY_SYMBOLS: PaySymbol[] = [
  'DIAMOND', 'CLUB', 'HEART', 'SPADE', 'J', 'Q', 'K', 'A',
];

/** Only a card can be gilded — the wild and the scatter are not cards. */
const isCard = (s: SlotSymbol): s is PaySymbol =>
  s !== 'WILD' && s !== 'SCATTER';

/**
 * Gilding is confined to the three middle reels.
 *
 * That is the rule the genre settled on and it is not decoration: a wild
 * born on reel 1 would extend every run it touches from its own end, and one
 * on reel 5 would close runs that had already died, so both ends pay far
 * more than the middle does. Keeping it to reels 2–4 is what makes a gilded
 * card a lift rather than a windfall — and it moves the return by points, so
 * PAY_SCALE belongs to this rule as much as to the paytable.
 */
const GILD_REELS = [1, 2, 3];

/** One position on the board. `gold` only ever rides on a card. */
export interface Cell {
  s: SlotSymbol;
  gold: boolean;
}

/** [reel][row], row 0 at the top — the order symbols fall in. */
export type Grid = Cell[][];

/** A float in [0, 1). The round supplies a seeded one; the simulator hands
    in a fast one. Same settle code either way. */
export type Rng = () => number;

/* ============================================================
   The reels
   ============================================================ */

/**
 * How often each symbol is drawn. Wilds are deliberately absent: the only
 * way one reaches the board is a gilded card surviving a win, so the golden
 * chance below is the single dial that controls how alive the game feels.
 *
 * Reels 1 and 5 carry the scatter more often than the middle three, which
 * is what makes a near-miss on the last reel a thing that happens rather
 * than a thing players imagine.
 */
const REEL_WEIGHTS: Record<SlotSymbol, number>[] = [
  { DIAMOND: 16, CLUB: 15, HEART: 14, SPADE: 13, J: 11, Q: 9, K: 7, A: 5, WILD: 0, SCATTER: 3 },
  { DIAMOND: 16, CLUB: 15, HEART: 14, SPADE: 13, J: 11, Q: 9, K: 7, A: 5, WILD: 0, SCATTER: 1 },
  { DIAMOND: 16, CLUB: 15, HEART: 14, SPADE: 13, J: 11, Q: 9, K: 7, A: 5, WILD: 0, SCATTER: 2 },
  { DIAMOND: 16, CLUB: 15, HEART: 14, SPADE: 13, J: 11, Q: 9, K: 7, A: 5, WILD: 0, SCATTER: 1 },
  { DIAMOND: 16, CLUB: 15, HEART: 14, SPADE: 13, J: 11, Q: 9, K: 7, A: 5, WILD: 0, SCATTER: 3 },
];
/** Chance that any card lands gilded. This is the game's temperature:
    raise it and chains run longer, the variance drops and the return climbs
    — which is why PAY_SCALE has to be re-derived whenever it moves. */
const GOLD_CHANCE = 0.075;

const REEL_TOTALS = REEL_WEIGHTS.map((w) =>
  Object.values(w).reduce((sum, n) => sum + n, 0),
);

/** One symbol off one reel. */
function drawCell(rng: Rng, reel: number): Cell {
  let roll = rng() * REEL_TOTALS[reel];
  const weights = REEL_WEIGHTS[reel];
  for (const symbol of Object.keys(weights) as SlotSymbol[]) {
    roll -= weights[symbol];
    if (roll < 0) {
      const gold = GILD_REELS.includes(reel) && isCard(symbol) && rng() < GOLD_CHANCE;
      return { s: symbol, gold };
    }
  }
  return { s: 'J', gold: false };
}

const drawGrid = (rng: Rng): Grid =>
  Array.from({ length: REELS }, (_, reel) =>
    Array.from({ length: ROWS }, () => drawCell(rng, reel)),
  );

/* ============================================================
   The paytable
   ============================================================ */

/** Per way, as a multiple of the bet, before PAY_SCALE. The shape is hand
    written — steep enough at the top that a five-of-a-kind Crown is worth
    chasing — and the scale below is what makes it honest. */
const BASE_PAYS: Record<PaySymbol, [number, number, number]> = {
  //          3-of-a-kind, 4, 5
  DIAMOND: [0.008, 0.032, 0.10],
  CLUB:    [0.010, 0.040, 0.13],
  HEART:   [0.013, 0.050, 0.16],
  SPADE:   [0.016, 0.065, 0.21],
  J:       [0.033, 0.130, 0.46],
  Q:       [0.050, 0.210, 0.81],
  K:       [0.081, 0.360, 1.63],
  A:       [0.160, 0.730, 4.07],
};

/**
 * The number that makes the return true.
 *
 * Derived by scripts/simulate-slots.mjs, not chosen: every pay is multiplied
 * by this until the measured return sits on RTP. At this value 12,000,000
 * rounds returned 96.889% — hit rate 53.2%, free games on 1.7% of rounds.
 *
 * The tail is fat enough that a 200,000-round run swings over a point either
 * way, so anything under a few million rounds is not a measurement. Change a
 * weight, the gold chance, GILD_REELS, the ladder or the free-game rules and
 * this number is wrong until the simulator is run again — it prints the one
 * to paste back in. Confining gilding to the middle three reels alone took
 * the return from 92.8% to 59.6%, which is the size of the thing being
 * measured here.
 */
export const PAY_SCALE = 1.003;

export const PAYTABLE: Record<PaySymbol, [number, number, number]> = Object.fromEntries(
  PAY_SYMBOLS.map((s) => [
    s,
    BASE_PAYS[s].map((p) => Math.round(p * PAY_SCALE * 10_000) / 10_000) as [number, number, number],
  ]),
) as Record<PaySymbol, [number, number, number]>;

/* ============================================================
   The ladder, the free games, the ceiling
   ============================================================ */

/** Cascade multipliers. The last entry holds for every further drop, so a
    long chain keeps paying at the top of the ladder rather than falling off
    the end of the array. */
export const BASE_LADDER = [1, 2, 3, 5];
export const FREE_LADDER = [2, 4, 6, 10];

export const SCATTERS_TO_TRIGGER = 3;
export const FREE_GAMES_AWARDED = 10;
export const FREE_GAMES_RETRIGGER = 5;

/**
 * Free games retrigger without a limit — three more scatters during them
 * always add another five, however deep the run already is.
 *
 * FREE_GAMES_CEILING is not that limit. It is a bound on what a single
 * request may cost the server: the chance of reaching it is somewhere past
 * one in a hundred million, and a round that did would otherwise be free to
 * run for as long as the dice kept saying yes. If it ever bites, the round
 * still pays everything it won up to that point.
 */
export const FREE_GAMES_CEILING = 300;

/** A chain has to stop somewhere. Twelve is far past where all but a
    handful of rounds end, and it bounds the work one request can cost. */
export const MAX_CASCADES = 12;

/** No round pays more than this multiple of the stake, whatever the board
    does. Shown on the screen — a ceiling nobody is told about is a trap. */
export const MAX_ROUND_X = 1500;

const ladderAt = (steps: number, free: boolean) => {
  const ladder = free ? FREE_LADDER : BASE_LADDER;
  return ladder[Math.min(steps, ladder.length - 1)];
};

/* ============================================================
   Reading the board
   ============================================================ */

export interface WinWay {
  symbol: PaySymbol;
  /** how many reels ran, 3 to 5 */
  run: number;
  /** how many distinct ways paid */
  ways: number;
  /** × bet, before the cascade multiplier */
  pay: number;
  /** every cell that took part, as [reel, row] */
  cells: [number, number][];
}

/**
 * 1,024 ways: for each paying symbol, count the matches on reel 1, then
 * reel 2, and so on until a reel has none. Three or more reels in a row
 * pays, and the number of ways is the product of the per-reel counts — so
 * four Kings stacked on reel 1 is worth four times a single King.
 *
 * A wild stands in for any paying symbol, which is what makes a gilded card
 * left over from the previous drop worth so much on this one.
 */
export function readWins(grid: Grid): WinWay[] {
  const wins: WinWay[] = [];

  for (const symbol of PAY_SYMBOLS) {
    const perReel: number[][] = [];

    for (let reel = 0; reel < REELS; reel += 1) {
      const rows: number[] = [];
      for (let row = 0; row < ROWS; row += 1) {
        const cell = grid[reel][row];
        if (cell.s === symbol || cell.s === 'WILD') rows.push(row);
      }
      if (rows.length === 0) break;
      perReel.push(rows);
    }

    const run = perReel.length;
    if (run < 3) continue;

    const ways = perReel.reduce((product, rows) => product * rows.length, 1);
    const pay = PAYTABLE[symbol][run - 3] * ways;
    if (pay <= 0) continue;

    const cells: [number, number][] = [];
    perReel.forEach((rows, reel) => rows.forEach((row) => cells.push([reel, row])));

    wins.push({ symbol, run, ways, pay, cells });
  }

  return wins;
}

export const countScatters = (grid: Grid): number =>
  grid.reduce(
    (total, reel) => total + reel.filter((cell) => cell.s === 'SCATTER').length,
    0,
  );

/* ============================================================
   One drop of the board
   ============================================================ */

export interface CascadeStep {
  /** the board as the player sees it at this point in the chain */
  grid: Grid;
  wins: WinWay[];
  /** the ladder value this step paid at */
  multiplier: number;
  /** × bet, after the multiplier */
  win: number;
  /** gilded cards that turned wild and stayed */
  turned: [number, number][];
  /** cells that paid and fell away */
  cleared: [number, number][];
  scatters: number;
}

export interface SpinResult {
  steps: CascadeStep[];
  free: boolean;
  /** × bet across the whole chain */
  win: number;
  /** scatters seen at any point — 3 or more awards free games */
  scatters: number;
}

/**
 * One spin and every cascade it sets off.
 *
 * The order inside a step matters and is the whole game: read the wins, pay
 * them, *then* split the winning cells into the gilded ones — which become
 * wilds and stay put — and the rest, which are cleared and refilled from
 * above. A gilded card therefore pays twice over: once as part of the
 * combination that caught it, and again as a wild in every drop after.
 */
export function spin(rng: Rng, free: boolean): SpinResult {
  let grid = drawGrid(rng);
  const steps: CascadeStep[] = [];
  let win = 0;
  let scatters = countScatters(grid);

  for (let depth = 0; depth < MAX_CASCADES; depth += 1) {
    const wins = readWins(grid);
    const onBoard = countScatters(grid);
    if (onBoard > scatters) scatters = onBoard;

    if (wins.length === 0) {
      steps.push({
        grid: cloneGrid(grid),
        wins: [],
        multiplier: ladderAt(depth, free),
        win: 0,
        turned: [],
        cleared: [],
        scatters: onBoard,
      });
      break;
    }

    const multiplier = ladderAt(depth, free);
    const stepWin = wins.reduce((sum, w) => sum + w.pay, 0) * multiplier;
    win += stepWin;

    /* One cell can belong to two winning symbols at once (a wild does, by
       definition), so the participating cells are collected into a set
       before anything is touched. */
    const hit = new Set<string>();
    for (const w of wins) for (const [reel, row] of w.cells) hit.add(`${reel}:${row}`);

    const turned: [number, number][] = [];
    const cleared: [number, number][] = [];
    for (const key of hit) {
      const [reel, row] = key.split(':').map(Number) as [number, number];
      if (grid[reel][row].gold) turned.push([reel, row]);
      else cleared.push([reel, row]);
    }

    steps.push({
      grid: cloneGrid(grid),
      wins,
      multiplier,
      win: stepWin,
      turned,
      cleared,
      scatters: onBoard,
    });

    grid = cloneGrid(grid);
    for (const [reel, row] of turned) grid[reel][row] = { s: 'WILD', gold: false };
    grid = collapse(grid, cleared, rng);
  }

  return { steps, free, win, scatters };
}

/** Winning cells fall out, everything above them drops, and fresh symbols
    fill the gaps at the top. */
function collapse(grid: Grid, cleared: [number, number][], rng: Rng): Grid {
  const gone = new Set(cleared.map(([reel, row]) => `${reel}:${row}`));
  return grid.map((reel, r) => {
    const kept = reel.filter((_, row) => !gone.has(`${r}:${row}`));
    const missing = ROWS - kept.length;
    const fresh = Array.from({ length: missing }, () => drawCell(rng, r));
    return [...fresh, ...kept];
  });
}

const cloneGrid = (grid: Grid): Grid => grid.map((reel) => reel.map((cell) => ({ ...cell })));

/* ============================================================
   A whole round: the paid spin, then whatever it won
   ============================================================ */

export interface SlotRound {
  spins: SpinResult[];
  /** free games awarded, including retriggers */
  freeGames: number;
  /** × bet, after the ceiling */
  win: number;
  /** × bet, before the ceiling — so the screen can say when it capped */
  rawWin: number;
  capped: boolean;
}

export function playRound(rng: Rng): SlotRound {
  const spins: SpinResult[] = [];

  const opening = spin(rng, false);
  spins.push(opening);

  let freeGames = opening.scatters >= SCATTERS_TO_TRIGGER ? FREE_GAMES_AWARDED : 0;
  let awarded = freeGames;
  let played = 0;

  while (played < awarded) {
    const free = spin(rng, true);
    spins.push(free);
    played += 1;

    if (free.scatters >= SCATTERS_TO_TRIGGER && awarded < FREE_GAMES_CEILING) {
      const extra = Math.min(FREE_GAMES_RETRIGGER, FREE_GAMES_CEILING - awarded);
      awarded += extra;
      freeGames += extra;
    }
  }

  const rawWin = spins.reduce((sum, s) => sum + s.win, 0);
  const win = Math.min(rawWin, MAX_ROUND_X);

  return { spins, freeGames, win, rawWin, capped: win < rawWin };
}

/* ============================================================
   The seeded draw
   ============================================================ */

/**
 * sfc32, seeded from the round hash.
 *
 * A slot needs hundreds of numbers per round, and the commit–reveal that
 * makes this fair binds the *seed*, not each individual draw: the whole
 * round is a pure function of (serverSeed, clientSeed, nonce), so anybody
 * holding the revealed seed can replay it symbol for symbol. Hashing once
 * per draw would buy nothing here and cost a few hundred digests a spin.
 */
export function rngFromHash(hashHex: string): Rng {
  let a = parseInt(hashHex.slice(0, 8), 16) >>> 0;
  let b = parseInt(hashHex.slice(8, 16), 16) >>> 0;
  let c = parseInt(hashHex.slice(16, 24), 16) >>> 0;
  let d = parseInt(hashHex.slice(24, 32), 16) >>> 0;

  const next = () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) >>> 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) >>> 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) >>> 0;
    t = (t + d) >>> 0;
    c = (c + t) >>> 0;
    return (t >>> 0) / 4294967296;
  };

  // sfc32 wants a few rounds before its output settles
  for (let i = 0; i < 12; i += 1) next();
  return next;
}

/** The round the API settles and the screen animates. */
export const slotRoundFromHash = (hashHex: string): SlotRound =>
  playRound(rngFromHash(hashHex));
