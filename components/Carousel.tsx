'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/** Promo banners. Gradient + glyph art, so no image assets are needed yet —
    swap `slides` for records from Supabase once the admin panel can upload. */
const SLIDES = [
  { cls: 's1', kicker: 'সাইন আপ বোনাস', title: '১৮৳ ফ্রি বোনাস', amt: '৳১৮', emoji: '🎁', cta: 'এখনই নিন', href: '/register' },
  { cls: 's2', kicker: 'প্রতিবার ডিপোজিট', title: '৫% ডিপোজিট বোনাস', amt: '৫%', emoji: '💰', cta: 'ডিপোজিট করুন', href: '/deposit' },
  { cls: 's3', kicker: 'মাসিক ক্যাশব্যাক', title: '১% রিবেট ক্যাশব্যাক', amt: '১%', emoji: '🏏', cta: 'বিস্তারিত', href: '/promotions' },
  { cls: 's4', kicker: 'রেফার প্রোগ্রাম', title: 'বন্ধু আনুন, কমিশন নিন', amt: '৪০%', emoji: '👥', cta: 'রেফার করুন', href: '/refer' },
];

export default function Carousel() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const startX = useRef<number | null>(null);
  const n = SLIDES.length;

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setI((k) => (k + 1) % n), 4500);
    return () => clearInterval(id);
  }, [paused, n]);

  const go = (k: number) => setI(((k % n) + n) % n);

  return (
    <div
      className="carousel"
      onTouchStart={(e) => { startX.current = e.touches[0].clientX; setPaused(true); }}
      onTouchEnd={(e) => {
        if (startX.current !== null) {
          const dx = e.changedTouches[0].clientX - startX.current;
          if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
        }
        startX.current = null;
        setPaused(false);
      }}
    >
      <div className="carousel__track" style={{ transform: `translateX(-${i * 100}%)` }}>
        {SLIDES.map((s) => (
          <div className={`slide ${s.cls}`} key={s.title}>
            <span className="slide__emoji" aria-hidden>{s.emoji}</span>
            <div className="slide__kicker">{s.kicker}</div>
            <div className="slide__title">{s.title}</div>
            <div className="slide__amt">{s.amt}</div>
            <Link className="slide__cta" href={s.href}>{s.cta}</Link>
          </div>
        ))}
      </div>
      <div className="dots">
        {SLIDES.map((s, j) => <i key={s.title} className={j === i ? 'on' : ''} />)}
      </div>
    </div>
  );
}
