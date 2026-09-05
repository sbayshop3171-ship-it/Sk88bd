import { Link } from '@inertiajs/react';
import { useRef, useState } from 'react';

/**
 * Provider game in demo ("fun mode").
 *
 * The URL is the provider's own play-money launch page, set per game from
 * /admin/games. It runs on the provider's credits, so no session token is
 * minted and no wallet is ever touched — which is also why this is the only
 * launch mode the site can offer before an aggregator licence lands.
 *
 * `sandbox` deliberately withholds `allow-top-navigation`: a framed page must
 * never be able to steer the player's browser away from the site.
 */
export default function GameFrame({ url, name }: { url: string; name: string }) {
    const boxRef = useRef<HTMLDivElement>(null);
    const [full, setFull] = useState(false);

    const toggleFullscreen = async () => {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
                setFull(false);
            } else {
                await boxRef.current?.requestFullscreen();
                setFull(true);
            }
        } catch {
            // some mobile browsers refuse fullscreen outside a video element
            setFull(Boolean(document.fullscreenElement));
        }
    };

    return (
        <section className="gframe">
            <div className="gframe__bar">
                <span className="gframe__badge">ডেমো</span>
                <span className="gframe__note">খেলার টাকা — রিয়েল টাকা কাটা হবে না</span>
                <button type="button" className="gframe__full" onClick={toggleFullscreen}>
                    {full ? 'ছোট করুন' : 'ফুল স্ক্রিন'}
                </button>
            </div>

            <div className="gframe__box" ref={boxRef}>
                <iframe
                    src={url}
                    title={`${name} — ডেমো`}
                    allow="autoplay; fullscreen; encrypted-media; clipboard-write"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                />
            </div>

            {/* a provider that refuses to be framed shows a blank box and gives
                the page no way to detect it, so the escape hatch is always up */}
            <div className="gframe__foot">
                <span>লোড হচ্ছে না?</span>
                <a href={url} target="_blank" rel="noopener noreferrer">নতুন ট্যাবে খুলুন</a>
            </div>

            <div className="note">
                এটি প্রোভাইডারের ডেমো ভার্সন — এখানে জেতা টাকা আপনার ব্যালেন্সে যোগ হবে না।
                রিয়েল টাকায় খেলতে <Link href="/deposit">ডিপোজিট</Link> করুন; গেম অ্যাগ্রিগেটর
                যুক্ত হলে এখানেই রিয়েল মোড চালু হবে।
            </div>
        </section>
    );
}
