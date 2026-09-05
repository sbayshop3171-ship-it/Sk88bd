import { Link } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { Banner } from '../types';

/** Promo banners, edited from /admin/banners. Gradient + glyph art until the
    operator uploads real images. */
export default function Carousel({ slides }: { slides: Banner[] }) {
    const [i, setI] = useState(0);
    const [paused, setPaused] = useState(false);
    const startX = useRef<number | null>(null);
    const n = slides.length;

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
                {slides.map((s) => (
                    <div className={`slide ${s.art ?? 'a1'}`} key={s.id}>
                        {s.emoji && <span className="slide__emoji" aria-hidden>{s.emoji}</span>}
                        <div className="slide__kicker">{s.kicker}</div>
                        <div className="slide__title">{s.title}</div>
                        <div className="slide__amt">{s.amount}</div>
                        {s.href && <Link className="slide__cta" href={s.href}>{s.cta}</Link>}
                    </div>
                ))}
            </div>
            <div className="dots">
                {slides.map((s, j) => <i key={s.id} className={j === i ? 'on' : ''} />)}
            </div>
        </div>
    );
}
