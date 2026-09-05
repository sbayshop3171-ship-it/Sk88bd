import { useEffect, useState } from 'react';
import { CATEGORY_LABEL } from '../lib/strings';
import { CATEGORY_GLYPH, TAB_ORDER } from '../lib/catalogue';
import type { CategoryKey } from '../types';

/** Sticky rail that scroll-spies the home sections and jumps between them. */
export default function CategoryTabs() {
    const [active, setActive] = useState<CategoryKey>(TAB_ORDER[0]);

    useEffect(() => {
        const sections = TAB_ORDER
            .map((k) => document.getElementById(`sec-${k}`))
            .filter((el): el is HTMLElement => el !== null);
        if (!sections.length) return;

        // rootMargin pulls the trigger line just below the sticky header + rail
        const io = new IntersectionObserver(
            (entries) => {
                const visible = entries.filter((e) => e.isIntersecting);
                if (!visible.length) return;
                const top = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b));
                setActive(top.target.id.replace('sec-', '') as CategoryKey);
            },
            { rootMargin: '-120px 0px -60% 0px', threshold: 0 },
        );
        sections.forEach((s) => io.observe(s));
        return () => io.disconnect();
    }, []);

    const jump = (key: CategoryKey) => {
        const el = document.getElementById(`sec-${key}`);
        if (!el) return;
        setActive(key);
        window.scrollTo({ top: el.offsetTop - 110, behavior: 'smooth' });
    };

    return (
        <div className="cats scroll-x">
            {TAB_ORDER.map((key) => (
                <button
                    key={key}
                    type="button"
                    className={key === active ? 'on' : ''}
                    onClick={() => jump(key)}
                >
                    <span className="e" aria-hidden>{CATEGORY_GLYPH[key]}</span>
                    {CATEGORY_LABEL[key]}
                </button>
            ))}
        </div>
    );
}
