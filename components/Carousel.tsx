'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { activeSorted, DEFAULT_BANNERS, type Banner, type BannerInput } from '@/lib/site-content';

/** Promo banners. Gradient + glyph art, so no image assets are needed.

    The slides ship as DEFAULT_BANNERS so the first paint is instant and the
    page stays static; whatever the admin has saved at /admin/banners then
    arrives from /api/site-content and replaces them. */
export default function Carousel() {
  const [slides, setSlides] = useState<(BannerInput | Banner)[]>(DEFAULT_BANNERS);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const startX = useRef<number | null>(null);
  const n = slides.length;

  useEffect(() => {
    let live = true;
    fetch('/api/site-content', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { ok: true; banners: Banner[] } | null) => {
        if (!live || !data?.ok || data.banners.length === 0) return;
        setSlides(activeSorted(data.banners));
        setI(0);
      })
      .catch(() => { /* keep the shipped slides */ });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (paused || n < 2) return;
    const id = setInterval(() => setI((k) => (k + 1) % n), 4500);
    return () => clearInterval(id);
  }, [paused, n]);

  if (n === 0) return null;
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
        {slides.map((s, j) => (
          <div className={`slide ${s.art}`} key={`${s.title}-${j}`}>
            <span className="slide__emoji" aria-hidden>{s.emoji}</span>
            <div className="slide__kicker">{s.kicker}</div>
            <div className="slide__title">{s.title}</div>
            <div className="slide__amt">{s.amount}</div>
            <Link className="slide__cta" href={s.href}>{s.cta}</Link>
          </div>
        ))}
      </div>
      <div className="dots">
        {slides.map((s, j) => <i key={`${s.title}-${j}`} className={j === i ? 'on' : ''} />)}
      </div>
    </div>
  );
}
