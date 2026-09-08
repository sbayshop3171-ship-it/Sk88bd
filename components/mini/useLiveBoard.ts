'use client';

import { useEffect, useRef, useState } from 'react';

/* ============================================================
   The board around the player.

   JetX deals one round per player — there is no shared round to
   read other people's seats from — so the table beside it is an
   ambient board rather than a ledger: masked seats that take a
   bet, ride, and leave, at the rate a busy board moves. It is
   the same device the Aviator screen already uses (see
   components/aviator/LiveBets.tsx), kept here so the house's own
   games do not depend on the aggregator's screen.

   Nothing here touches money. The player's own row is passed in
   by the board and comes from the settled round, not from this.
   ============================================================ */

export const CROWD_MIN = 1000;
export const CROWD_MAX = 2600;

/** rows held on screen; the head count above them is the whole crowd */
const ROWS = 44;
/** how often a few seats move */
const TICK_MS = 750;
/** kept for the winners strip */
const RECENT = 16;

export interface Seat {
  id: number;
  /** masked, the way every board on the site shows other players */
  user: string;
  /** taka */
  stake: number;
  /** where this seat leaves */
  target: number;
  out: boolean;
}

export interface RecentWin {
  id: number;
  user: string;
  multiplier: number;
  /** taka */
  win: number;
}

const STAKES = [
  20, 50, 50, 100, 100, 100, 150, 200, 250, 300, 500, 500,
  600, 800, 1000, 1000, 1200, 1500, 2000, 2500, 3000, 5000,
];

const maskedUser = () => `*******${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

/** Weighted towards early exits, the way a real board leans — most seats
    leave under 2x and the long rides are rare. */
const drawTarget = () => Math.round((1.05 + Math.pow(Math.random(), 2.4) * 12) * 100) / 100;

let nextId = 1;
const freshSeat = (): Seat => ({
  id: nextId++,
  user: maskedUser(),
  stake: STAKES[Math.floor(Math.random() * STAKES.length)],
  target: drawTarget(),
  out: false,
});

/**
 * A board that keeps moving whether or not the player is in the air: seats
 * cash out a few at a time, their places are taken by new bets, and the
 * bigger exits collect in a recent-winners strip.
 *
 * Everything is drawn after mount — the server renders an empty table, so
 * there is nothing for hydration to disagree about.
 */
export function useLiveBoard() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [recent, setRecent] = useState<RecentWin[]>([]);
  const [players, setPlayers] = useState(0);

  /** where the head count is drifting towards */
  const crowdTarget = useRef(0);

  /* The board is kept in a ref and mirrored into state: a tick both rewrites
     the seats and pushes the winners it produced, and doing that second part
     inside a setState updater would run it twice under StrictMode — which is
     exactly how the same win ended up in the strip twice. */
  const boardRef = useRef<Seat[]>([]);

  useEffect(() => {
    boardRef.current = Array.from({ length: ROWS }, freshSeat);
    setSeats(boardRef.current);
    crowdTarget.current = CROWD_MIN + Math.floor(Math.random() * (CROWD_MAX - CROWD_MIN + 1));
    setPlayers(Math.round(crowdTarget.current * (0.92 + Math.random() * 0.06)));

    const id = setInterval(() => {
      const won: RecentWin[] = [];
      const next = boardRef.current.map((s) => {
        // a seat that has already left makes room for a new bet
        if (s.out) return Math.random() < 0.45 ? freshSeat() : s;
        if (Math.random() < 0.12) {
          if (s.target >= 1.9) {
            won.push({ id: s.id, user: s.user, multiplier: s.target, win: Math.round(s.stake * s.target) });
          }
          return { ...s, out: true };
        }
        return s;
      });
      boardRef.current = next;
      setSeats(next);
      if (won.length) setRecent((r) => [...won, ...r].slice(0, RECENT));

      // the crowd breathes: a new target now and then, walked towards
      if (Math.random() < 0.06) {
        crowdTarget.current = CROWD_MIN + Math.floor(Math.random() * (CROWD_MAX - CROWD_MIN + 1));
      }
      setPlayers((c) => {
        const step = 1 + Math.floor(Math.random() * 9);
        return Math.max(CROWD_MIN, c < crowdTarget.current ? c + step : c - step);
      });
    }, TICK_MS);

    return () => clearInterval(id);
  }, []);

  return { seats, recent, players };
}
