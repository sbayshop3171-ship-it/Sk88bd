/* ============================================================
   Zeus Gate — the browser half.

   Nothing here decides anything. App\Support\SlotEngine plays the whole round
   on the server — the drop, every tumble, every free spin — and hands back the
   script below; this file only turns that script into frames a component can
   animate, and names the symbols.

   Fairness model (committed seed pair):
     1. The player holds the SHA-256 hash of a server seed before their first
        spin, alongside the client seed that is mixed into every draw.
     2. Each spin uses SHA-256(serverSeed:clientSeed:nonce) and counts the
        nonce up by one.
     3. Retiring the pair publishes the server seed, so every nonce played
        against it can be replayed and checked at once.
   ============================================================ */

export interface Win {
    symbol: string;
    count: number;
    pay: number;
}

export interface Step {
    wins: Win[];
    /** [row, col] of every cell the win cleared */
    cells: [number, number][];
    /** the board after the survivors fell and the column was topped up */
    grid: string[][];
}

export interface Sequence {
    /** the board as it first landed */
    grid: string[][];
    steps: Step[];
    scatters: number;
    /** orb values summed off the final board */
    orbs: number;
    /** what the win was actually multiplied by (never below 1) */
    multiplier: number;
    /** the paytable total before the multiplier */
    paid_units: number;
    win_units: number;
    retrigger?: boolean;
    spin?: number;
    of?: number;
}

export interface Round {
    /** null when the free spins were bought outright */
    base: Sequence | null;
    free: Sequence[];
    free_spins: number;
    win_units: number;
    capped: boolean;
}

export interface SpinResponse {
    demo: boolean;
    round: Round;
    round_id?: number;
    nonce?: number;
    stake: number;
    cost?: number;
    payout: number;
    balance?: number;
}

export interface Commitment {
    server_seed_hash: string;
    client_seed: string;
    nonce: number;
}

export interface HistoryEntry {
    id: number;
    nonce: number;
    stake: number;
    cost: number;
    bought: boolean;
    win_units: number;
    payout: number;
    free_spins: number;
}

export const SCATTER = 'zap';
export const ORB = 'orb';

/** Every symbol's face. Orbs draw their own value instead. */
export const GLYPH: Record<string, string> = {
    crown: '👑',
    glass: '⏳',
    ring: '💍',
    cup: '🏆',
    gem: '💎',
    purple: '🟣',
    green: '🟢',
    blue: '🔵',
    [SCATTER]: '⚡',
};

export const SYMBOL_NAME: Record<string, string> = {
    crown: 'মুকুট',
    glass: 'ঘড়ি',
    ring: 'আংটি',
    cup: 'কাপ',
    gem: 'হীরা',
    purple: 'বেগুনি',
    green: 'সবুজ',
    blue: 'নীল',
    [SCATTER]: 'বজ্র',
};

/** A cell is a symbol key, or `orb:<value>` for a multiplier orb. */
export const orbValue = (cell: string): number | null =>
    cell.startsWith(`${ORB}:`) ? Number(cell.slice(ORB.length + 1)) : null;

export const isSpecial = (cell: string) => cell === SCATTER || cell.startsWith(`${ORB}:`);

/* ---------- the frames a round is played back as ---------- */

export type Frame =
    | { kind: 'drop'; grid: string[][]; free: number; of: number; multiplier: number }
    | { kind: 'win'; grid: string[][]; cells: [number, number][]; wins: Win[]; units: number }
    | { kind: 'fall'; grid: string[][] }
    | { kind: 'orbs'; grid: string[][]; multiplier: number; units: number }
    | { kind: 'bonus-in'; spins: number }
    | { kind: 'bonus-out'; units: number }
    | { kind: 'done'; units: number };

/** How long each frame holds, in ms. Turbo divides these. */
export const HOLD: Record<Frame['kind'], number> = {
    drop: 420,
    win: 760,
    fall: 340,
    orbs: 900,
    'bonus-in': 1600,
    'bonus-out': 1900,
    done: 0,
};

/**
 * Flatten a resolved round into the frames that play it back.
 *
 * The running total is carried through so a frame can show what the board is
 * worth at that moment rather than only what the round ended on.
 */
export function toFrames(round: Round): Frame[] {
    const frames: Frame[] = [];
    let units = 0;

    const sequence = (s: Sequence, free: number, of: number) => {
        frames.push({ kind: 'drop', grid: s.grid, free, of, multiplier: s.multiplier });

        let board = s.grid;

        // A tumble's own pay is not banked here: the orbs multiply the whole
        // sequence, so the sequence only settles once, on its `orbs` frame.
        for (const step of s.steps) {
            frames.push({ kind: 'win', grid: board, cells: step.cells, wins: step.wins, units });
            frames.push({ kind: 'fall', grid: step.grid });
            board = step.grid;
        }

        if (s.win_units > 0) {
            units += s.win_units;
            frames.push({ kind: 'orbs', grid: board, multiplier: s.multiplier, units });
        }
    };

    if (round.base) {
        sequence(round.base, 0, 0);
    }

    if (round.free.length > 0) {
        frames.push({ kind: 'bonus-in', spins: round.free_spins });
        round.free.forEach((s) => sequence(s, s.spin ?? 0, s.of ?? round.free_spins));
        frames.push({ kind: 'bonus-out', units });
    }

    frames.push({ kind: 'done', units: round.win_units });

    return frames;
}

export const fmtX = (n: number) => `${n % 1 === 0 ? n : n.toFixed(2)}x`;
