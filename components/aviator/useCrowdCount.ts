'use client';

import { useEffect, useRef, useState } from 'react';
import type { Phase } from '@/lib/aviator';

export const CROWD_MIN = 1000;
export const CROWD_MAX = 2500;

/**
 * The "players on the board" figure in the canvas corner. A new target is
 * drawn for every round somewhere between CROWD_MIN and CROWD_MAX; while the
 * bets are open the number climbs towards it in small bursts, as if people
 * were still taking seats, and it holds through the flight.
 */
export function useCrowdCount(roundId: number | null | undefined, phase: Phase): number {
  const [count, setCount] = useState(0);
  const target = useRef(0);

  // fresh target per round, starting a little under it
  useEffect(() => {
    target.current = CROWD_MIN + Math.floor(Math.random() * (CROWD_MAX - CROWD_MIN + 1));
    // never below the floor, even while the seats are still filling
    setCount(Math.max(CROWD_MIN, Math.round(target.current * (0.82 + Math.random() * 0.08))));
  }, [roundId]);

  // seats filling while betting is open
  useEffect(() => {
    if (phase !== 'betting') return;
    const id = setInterval(() => {
      setCount((c) => (c >= target.current ? c : Math.min(target.current, c + 3 + Math.floor(Math.random() * 12))));
    }, 380);
    return () => clearInterval(id);
  }, [phase, roundId]);

  return count;
}
