'use client';

import { useEffect, useMemo, useState } from 'react';
import SlotSymbolArt from './SlotSymbol';
import { money } from '@/lib/brand';
import {
  BASE_LADDER,
  FREE_LADDER,
  MAX_ROUND_X,
  PAYTABLE,
  PAY_SYMBOLS,
  REELS,
  ROWS,
  WAYS,
  type Cell,
  type Grid,
  type SlotRound,
  type WinWay,
} from '@/lib/slots';

/** How long one drop of the board is held before the next. Long enough to
    read a win, short enough that a ten-step chain does not outstay it. */
const STEP_MS = 720;
/** The first board of a spin gets a moment longer — that is the one the
    player is actually waiting on. */
const OPEN_MS = 900;

/** One thing to show: a board, what it paid, and where it sits in the round. */
interface Frame {
  grid: Grid;
  wins: WinWay[];
  multiplier: number;
  win: number;
  turned: [number, number][];
  free: boolean;
  /** 1-based, only meaningful while `free` */
  freeIndex: number;
  freeTotal: number;
  /** running total across the whole round, × bet */
  runningX: number;
  /** first board of its spin */
  opening: boolean;
}

/** The server settles the whole round in one call; this unrolls it into the
    boards to show, in order, so the screen is a replay and never a redraw. */
function framesOf(round: SlotRound): Frame[] {
  const frames: Frame[] = [];
  let runningX = 0;
  let freeIndex = 0;

  for (const spin of round.spins) {
    if (spin.free) freeIndex += 1;
    spin.steps.forEach((step, i) => {
      runningX += step.win;
      frames.push({
        grid: step.grid,
        wins: step.wins,
        multiplier: step.multiplier,
        win: step.win,
        turned: step.turned,
        free: spin.free,
        freeIndex,
        freeTotal: round.freeGames,
        runningX,
        opening: i === 0,
      });
    });
  }
  return frames;
}

/* A board to look at before the first spin — fixed, so the server and the
   browser render the same thing and React does not complain. */
const IDLE: Grid = [
  ['A', 'K', 'GEM', 'J'],
  ['CROWN', 'Q', 'A', 'BELL'],
  ['K', 'HAT', 'J', 'A'],
  ['Q', 'GEM', 'K', 'HAT'],
  ['J', 'A', 'BELL', 'Q'],
].map((reel, r) =>
  reel.map((s, row) => ({ s, gold: (r + row) % 5 === 0 } as Cell)),
);

export default function SlotBoard({
  round,
  spinning,
  stake,
  onDone,
}: {
  round: SlotRound | null;
  /** the request is in flight — the reels blur until the result lands */
  spinning: boolean;
  stake: number;
  onDone?: () => void;
}) {
  const frames = useMemo(() => (round ? framesOf(round) : []), [round]);
  const [at, setAt] = useState(0);

  // a new round restarts the replay
  useEffect(() => { setAt(0); }, [round]);

  useEffect(() => {
    if (frames.length === 0) return;
    if (at >= frames.length - 1) { onDone?.(); return; }
    const frame = frames[at];
    const wait = frame.opening ? OPEN_MS : STEP_MS;
    const timer = setTimeout(() => setAt((n) => n + 1), wait);
    return () => clearTimeout(timer);
    // onDone is a fresh closure every render; the frame index is what drives this
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames, at]);

  const frame: Frame | null = frames[at] ?? null;
  const grid = frame?.grid ?? IDLE;
  const live = frame !== null;

  /* Every cell in a winning way, so the board can light them. A wild that
     serves two symbols is in the set once. */
  const lit = useMemo(() => {
    const set = new Set<string>();
    for (const w of frame?.wins ?? []) for (const [r, row] of w.cells) set.add(`${r}:${row}`);
    return set;
  }, [frame]);

  const turning = useMemo(
    () => new Set((frame?.turned ?? []).map(([r, row]) => `${r}:${row}`)),
    [frame],
  );

  const done = frames.length > 0 && at >= frames.length - 1;

  return (
    <div className="sl">
      {frame?.free && (
        <div className="sl__free">
          FREE GAMES <b>{frame.freeIndex}</b> / {frame.freeTotal}
        </div>
      )}

      <div className={`sl__grid${spinning ? ' is-spinning' : ''}`}>
        {Array.from({ length: ROWS }, (_, row) =>
          Array.from({ length: REELS }, (_, reel) => {
            const key = `${reel}:${row}`;
            const cell = grid[reel][row];
            return (
              <div
                key={key}
                className={
                  'sl__cell'
                  + (lit.has(key) ? ' is-win' : '')
                  + (turning.has(key) ? ' is-turning' : '')
                  + (cell.gold ? ' is-gold' : '')
                  + (cell.s === 'SCATTER' ? ' is-scatter' : '')
                }
              >
                <SlotSymbolArt cell={cell} />
              </div>
            );
          }),
        )}
      </div>

      <div className="sl__meter">
        <div className="sl__mult">
          <small>Multiplier</small>
          <b>{frame ? `${frame.multiplier}×` : '—'}</b>
        </div>
        <div className={`sl__win${live && frame!.runningX > 0 ? ' on' : ''}`}>
          <small>{done ? 'Round win' : 'Winning'}</small>
          <b>{live ? money(frame!.runningX * stake, 2) : money(0, 2)}</b>
        </div>
      </div>

      {round?.capped && done && (
        <p className="sl__capped">
          Capped at the {MAX_ROUND_X.toLocaleString('en-IN')}× round ceiling.
        </p>
      )}
    </div>
  );
}

/** Three decimals for the pennies at the bottom of the table, two for
    everything else, and no trailing zeros either way — a column reading
    0.050 next to 0.10 looks like a typo rather than a price. */
const payText = (p: number) =>
  p.toFixed(3).replace(/0+$/, '').replace(/\.$/, '').replace(/^(\d+\.\d)$/, '$1');

/** The paytable, opened from the board. Every figure is per way, and the
    board pays as many ways as the symbol landed in — which is why one row of
    three Jacks and a board stacked with them are worth very different money
    off the same line of the table. */
export function SlotPaytable() {
  return (
    <div className="sl-pay">
      <p className="sl-pay__note">
        {WAYS.toLocaleString('en-IN')} ways · pays left to right from reel 1 ·
        figures are × your bet, <b>per way</b>
      </p>

      <table className="sl-pay__table">
        <thead>
          <tr><th>Symbol</th><th>×3</th><th>×4</th><th>×5</th></tr>
        </thead>
        <tbody>
          {PAY_SYMBOLS.slice().reverse().map((s) => (
            <tr key={s}>
              <td>
                <span className="sl-pay__ico"><SlotSymbolArt cell={{ s, gold: false }} /></span>
                {s}
              </td>
              {PAYTABLE[s].map((p, i) => <td key={i}>{payText(p)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="sl-pay__rules">
        <li>
          <b>Gilded cards</b> caught in a win turn into wilds and stay on the
          board for the next drop instead of falling away.
        </li>
        <li>
          <b>Every win drops the board again.</b> The multiplier climbs{' '}
          {BASE_LADDER.join(' → ')}× as the chain runs, and{' '}
          {FREE_LADDER.join(' → ')}× in free games.
        </li>
        <li>
          <b>Three scatters</b> anywhere award 10 free games. Three more during
          them add 5, up to 30.
        </li>
        <li>A round pays at most {MAX_ROUND_X.toLocaleString('en-IN')}× your bet.</li>
      </ul>
    </div>
  );
}
