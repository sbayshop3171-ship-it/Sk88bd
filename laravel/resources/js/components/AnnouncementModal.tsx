import { useEffect, useState } from 'react';
import { BRAND } from '../lib/brand';
import { t } from '../lib/strings';
import type { Banner } from '../types';

const SEEN_KEY = `${BRAND.name.toLowerCase()}:announcement-seen`;

export default function AnnouncementModal({ slides }: { slides: Banner[] }) {
    const [open, setOpen] = useState(false);
    const [i, setI] = useState(0);

    // Show once per browser session. sessionStorage can throw in privacy
    // modes, so a failed read just means the popup shows.
    useEffect(() => {
        let seen = false;
        try { seen = sessionStorage.getItem(SEEN_KEY) === '1'; } catch { /* ignore */ }
        if (!seen) setOpen(true);
    }, []);

    const close = () => {
        setOpen(false);
        try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ }
    };

    if (!open || slides.length === 0) return null;
    const s = slides[i];

    return (
        <>
            <div className="scrim on" onClick={close} />
            <div className="ann" role="dialog" aria-modal="true" aria-label={t.announcement}>
                <button className="ann__x" type="button" aria-label={t.close} onClick={close}>×</button>
                <div className="ann__title">{t.announcement}</div>
                <div className={`ann__card ${s.art ?? 'a1'}`}>
                    <h3>{s.title}</h3>
                    <div className="amt">{s.amount}</div>
                    <p>{s.subtitle}</p>
                    <span className="site">SITE LINK: {BRAND.domain.toUpperCase()}</span>
                </div>
                <div className="ann__nav">
                    <button type="button" disabled={i === 0} onClick={() => setI(i - 1)}>‹ {t.previous}</button>
                    <button type="button" disabled={i === slides.length - 1} onClick={() => setI(i + 1)}>{t.next} ›</button>
                </div>
            </div>
        </>
    );
}
