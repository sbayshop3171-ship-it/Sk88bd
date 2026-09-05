'use client';

import { useEffect, useState } from 'react';
import { BRAND } from '@/lib/brand';
import { t } from '@/lib/strings';

const SEED = 48_213_756.42;

/** Ticking jackpot counter. Server-renders the seed so hydration matches,
    then drifts upward on the client only. */
export default function Jackpot() {
  const [value, setValue] = useState(SEED);

  useEffect(() => {
    const id = setInterval(() => setValue((v) => v + Math.random() * 260), 900);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="jackpot">
      <div className="jackpot__label">{t.jackpotLabel}</div>
      <div className="jackpot__val">
        {BRAND.currency}
        {value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className="jackpot__note">{t.jackpotNote}</div>
    </div>
  );
}
