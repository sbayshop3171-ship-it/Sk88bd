'use client';

import Link from 'next/link';
import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useLightSheet } from '@/components/useLightSheet';
import { PROMOTIONS } from '@/lib/promotions';

/* ============================================================
   Mission.

   The reference tracks milestones a player is part way through:
   bet this much, collect that bonus, seven of them to a set. We
   have no mission engine — nothing counts a player towards a
   target and nothing pays one out — so what is listed here is
   what we actually run, which is the promotions.

   The tabs are the reference's and they are honest: everything
   we offer is running, so Finished is empty and says why. When
   there is an engine, progress goes on these same cards.
   ============================================================ */

export default function PromotionsPage() {
  useLightSheet();
  const [tab, setTab] = useState<'live' | 'done'>('live');

  return (
    <>
      <PageHeader title="Mission" />

      <div className="ms__tabs">
        <button type="button" className={tab === 'live' ? 'on' : ''} onClick={() => setTab('live')}>In Progress</button>
        <button type="button" className={tab === 'done' ? 'on' : ''} onClick={() => setTab('done')}>Finished</button>
      </div>

      {tab === 'live' ? (
        <div className="ms">
          {PROMOTIONS.map((p) => (
            <article className="ms__card" key={p.id}>
              <span className={`ms__art ${p.art}`} aria-hidden>{p.glyph}</span>
              <div className="ms__b">
                <h3>{p.title}{p.badge && <i>{p.badge}</i>}</h3>
                <p>{p.body}</p>
                <Link className="ms__go" href="/deposit">অংশ নিন</Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="ml__empty">
          No data
          <small>শেষ হওয়া মিশন এখানে জমা হবে। এখন সব কটি অফারই চালু আছে।</small>
        </p>
      )}
    </>
  );
}
