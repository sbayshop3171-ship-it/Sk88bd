'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { BRAND } from '@/lib/brand';

const SEED = 48_213_756.42;
/** how often the pot ticks up */
const TICK_MS = 4000;

/** The jackpot strip: the plane on the left, the wordmark on the right, and
    the running total below on odometer reels that roll as it climbs.

    The value server-renders at the seed so hydration matches, then drifts
    upward on the client only. */
export default function Jackpot() {
  const [value, setValue] = useState(SEED);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setValue((v) => v + Math.random() * 900);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  const text =
    BRAND.currency +
    value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="jp">
      <Image className="jp__plane" src="/games/aviator/plane.png" alt="" aria-hidden width={120} height={74} />
      <span className="jp__word">Jackpot</span>

      <div className="jp__reels" role="img" aria-label={`Jackpot ${text}`}>
        {[...text].map((ch, i) =>
          /\d/.test(ch) ? (
            <span className="jp__digit" key={i} aria-hidden>
              {/* a 0-9 column shifted to the digit we want; the shift is
                  animated, so a change rolls like a counter wheel */}
              <span className="jp__col" style={{ transform: `translateY(${-Number(ch) * 10}%)` }}>
                {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                  <b key={d}>{d}</b>
                ))}
              </span>
            </span>
          ) : (
            <span className="jp__sep" key={i} aria-hidden>{ch}</span>
          ),
        )}
      </div>
    </div>
  );
}
