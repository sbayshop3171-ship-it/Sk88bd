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
/** What the lightning button does to both of those. */
const TURBO = 0.4;

/** One thing to show: a board, what it paid, and where it sits in the round. */
interface Frame {
  grid: Grid;
  wins: WinWay[];
  multiplier: number;
  win: number;
  turned: [number, number][];
  free: boolean;
  /** counts down, the way a cabinet shows it */
  freeLeft: number;
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
  let played = 0;

  for (const spin of round.spins) {
    if (spin.free) played += 1;
    spin.steps.forEach((step, i) => {
      runningX += step.win;
      frames.push({
        grid: step.grid,
        wins: step.wins,
        multiplier: step.multiplier,
        win: step.win,
        turned: step.turned,
        free: spin.free,
        freeLeft: round.freeGames - played + 1,
        freeTotal: round.freeGames,
        runningX,
        opening: i === 0,
      });
    });
  }
  return frames;
}

/* A board to look at before the first spin — fixed, so the server and the
   browser render the same thing and React does not complain about it. */
const IDLE: Grid = [
  ['A', 'K', 'HEART', 'CLUB'],
  ['Q', 'DIAMOND', 'A', 'SPADE'],
  ['K', 'CLUB', 'J', 'HEART'],
  ['DIAMOND', 'HEART', 'K', 'J'],
  ['J', 'A', 'SPADE', 'Q'],
].map((reel, r) =>
  reel.map((s, row) => ({ s, gold: (r * 4 + row) % 7 === 0 } as Cell)),
);

/**
 * The cabinet: head, reels, win line and the control bar under it.
 *
 * Everything it shows comes out of the round the server already settled —
 * the reels never decide anything, they replay a decision. That is why there
 * is no spinning-reel animation: a reel that spins while the outcome is
 * already known is a picture of suspense, not suspense, and it would let the
 * screen and the wallet tell different stories if either ever drifted.
 */
export default function SlotBoard({
  round,
  spinning,
  stake,
  balance,
  busy,
  rounds,
  onSpin,
  onBet,
  onInfo,
  onDone,
}: {
  round: SlotRound | null;
  /** the request is in flight — the board holds until the result lands */
  spinning: boolean;
  stake: number;
  balance: number;
  busy: boolean;
  /** rounds played this sitting, the way a cabinet counts them */
  rounds: number;
  onSpin: () => void;
  onBet: () => void;
  onInfo: () => void;
  onDone?: () => void;
}) {
  const frames = useMemo(() => (round ? framesOf(round) : []), [round]);
  const [at, setAt] = useState(0);
  const [turbo, setTurbo] = useState(false);

  // a new round restarts the replay
  useEffect(() => { setAt(0); }, [round]);

  useEffect(() => {
    if (frames.length === 0) return;
    if (at >= frames.length - 1) { onDone?.(); return; }
    const frame = frames[at];
    const wait = (frame.opening ? OPEN_MS : STEP_MS) * (turbo ? TURBO : 1);
    const timer = setTimeout(() => setAt((n) => n + 1), wait);
    return () => clearTimeout(timer);
    // onDone is a fresh closure every render; the frame index is what drives this
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames, at, turbo]);

  const frame: Frame | null = frames[at] ?? null;
  const grid = frame?.grid ?? IDLE;
  const done = frames.length > 0 && at >= frames.length - 1;
  const ladder = frame?.free ? FREE_LADDER : BASE_LADDER;

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

  const winNow = frame ? frame.runningX * stake : 0;

  return (
    <div className="sa">
      {/* ---- the head: free games, then the ladder ---- */}
      <div className="sa__top">
        <div className="sa__free" aria-live="polite">
          {frame?.free
            ? <>FREE SPIN <b>{frame.freeLeft}</b></>
            : <span className="sa__brand">GOLDEN ACE</span>}
        </div>

        <div
          className="sa__ladder"
          role="img"
          aria-label={`Multiplier ${frame?.multiplier ?? ladder[0]} times`}
        >
          {/* between rounds the cabinet rests on the first rung, which is
              where the next spin will start paying */}
          {ladder.map((x, i) => (
            <span
              key={x}
              className={`sa__rung${(frame ? frame.multiplier === x : i === 0) ? ' on' : ''}`}
            >
              ×{x}
            </span>
          ))}
        </div>

        <div className="sa__caps" aria-hidden>
          {Array.from({ length: REELS }, (_, i) => <i key={i} />)}
        </div>
      </div>

      {/* ---- the reels ---- */}
      <div className={`sa__reels${spinning ? ' is-spinning' : ''}`}>
        {Array.from({ length: ROWS }, (_, row) =>
          Array.from({ length: REELS }, (_, reel) => {
            const key = `${reel}:${row}`;
            const cell = grid[reel][row];
            return (
              <div
                key={key}
                className={
                  'sa__cell'
                  + (lit.has(key) ? ' is-win' : '')
                  + (turning.has(key) ? ' is-turning' : '')
                  + (cell.s === 'SCATTER' ? ' is-scatter' : '')
                }
              >
                <SlotSymbolArt cell={cell} />
              </div>
            );
          }),
        )}
      </div>

      {round?.capped && done && (
        <p className="sa__capped">
          Capped at the {MAX_ROUND_X.toLocaleString('en-IN')}× round ceiling.
        </p>
      )}

      {/* ---- what it is paying ---- */}
      <div className={`sa__win${winNow > 0 ? ' on' : ''}`}>
        <span>WIN</span>
        <b>{money(winNow, 2)}</b>
      </div>

      {/* ---- the control bar ---- */}
      <div className="sa__bar">
        <button type="button" className="sa__ico" onClick={onInfo} aria-label="Paytable and rules">
          ⚙
        </button>

        <button type="button" className="sa__bet" onClick={onBet} disabled={busy}>
          <i aria-hidden>🪙</i>
          <span>Bet {money(stake)}</span>
        </button>

        <button
          type="button"
          className={`sa__spin${busy ? ' is-busy' : ''}`}
          onClick={onSpin}
          disabled={busy}
          aria-label={busy ? 'Spinning' : `Spin for ${money(stake)}`}
        >
          <svg viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="46" className="sa__spinring" />
            <circle cx="50" cy="50" r="36" className="sa__spinface" />
            <path d="M50 26a24 24 0 1 1-22 14" className="sa__spinarrow" fill="none" strokeLinecap="round" />
            <path d="M24 24l10 17-19 1Z" className="sa__spinhead" />
          </svg>
        </button>

        <div className="sa__count" title="Rounds this sitting">{rounds}</div>

        <button
          type="button"
          className={`sa__ico sa__turbo${turbo ? ' on' : ''}`}
          onClick={() => setTurbo((v) => !v)}
          aria-pressed={turbo}
          aria-label="Turbo"
        >
          ⚡
        </button>
      </div>

      <div className="sa__balance">
        <span>Balance</span> <b>{money(balance, 2)}</b>
      </div>
    </div>
  );
}

/** The table prints what the round actually pays, to the last place the
    engine keeps — a paytable rounded for looks is a paytable that lies, and
    on a 1,024-ways game the low cards genuinely are worth thousandths. The
    trailing zeros go, so 0.0520 reads 0.052 and 2.6100 reads 2.61. */
const payText = (p: number) =>
  p.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');

/** The paytable, opened from the cabinet. Every figure is per way, and the
    board pays as many ways as the card landed in — which is why one row of
    three Jacks and a board stacked with them are worth very different money
    off the same line of the table. */
export function SlotPaytable() {
  return (
    <div className="sa-pay">
      <p className="sa-pay__note">
        {WAYS.toLocaleString('en-IN')} ways · pays left to right from reel 1 ·
        figures are × your bet, <b>per way</b>
      </p>

      <table className="sa-pay__table">
        <thead>
          <tr><th>Card</th><th>×3</th><th>×4</th><th>×5</th></tr>
        </thead>
        <tbody>
          {PAY_SYMBOLS.slice().reverse().map((s) => (
            <tr key={s}>
              <td>
                <span className="sa-pay__ico"><SlotSymbolArt cell={{ s, gold: false }} /></span>
              </td>
              {PAYTABLE[s].map((p, i) => <td key={i}>{payText(p)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="sa-pay__specials">
        <figure>
          <span className="sa-pay__ico"><SlotSymbolArt cell={{ s: 'WILD', gold: false }} /></span>
          <figcaption>stands in for any card</figcaption>
        </figure>
        <figure>
          <span className="sa-pay__ico"><SlotSymbolArt cell={{ s: 'SCATTER', gold: false }} /></span>
          <figcaption>three of these pay free games</figcaption>
        </figure>
      </div>

      <ul className="sa-pay__rules">
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
