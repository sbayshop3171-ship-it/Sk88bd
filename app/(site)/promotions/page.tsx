'use client';

import Link from 'next/link';
import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useBonus } from '@/components/useBonus';
import { useLightSheet } from '@/components/useLightSheet';
import { useUI } from '@/components/UIProvider';
import { toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';
import { PROMOTIONS } from '@/lib/promotions';

/* ============================================================
   Mission.

   A mission is a target and what reaching it pays, and the whole
   screen is the distance between them: how far along, how much
   further, and the button that appears when there is no further
   to go. Both numbers are the operator's, at /admin/bonus.

   Progress is counted from the ledger over the mission's own
   window — a day, a week, or the whole account — so it is the
   same figure Betting Record and Account Record show, and it
   cannot drift from them.

   With no missions set, the screen still has something true to
   show: the promotions we run. It is the offers either way.
   ============================================================ */

const PERIOD_LABEL: Record<string, string> = {
  daily: 'Today',
  weekly: 'This week',
  once: 'One-time',
};

export default function MissionPage() {
  useLightSheet();
  const { state, busy, claim } = useBonus();
  const { toast } = useUI();
  const [tab, setTab] = useState<'live' | 'done'>('live');

  const all = state?.missions ?? [];
  const live = all.filter((m) => !m.claimed);
  const done = all.filter((m) => m.claimed);
  const shown = tab === 'live' ? live : done;

  return (
    <>
      <PageHeader title="Mission" />

      <div className="ms__tabs">
        <button type="button" className={tab === 'live' ? 'on' : ''} onClick={() => setTab('live')}>
          In Progress{live.length > 0 && ` (${live.length})`}
        </button>
        <button type="button" className={tab === 'done' ? 'on' : ''} onClick={() => setTab('done')}>
          Finished{done.length > 0 && ` (${done.length})`}
        </button>
      </div>

      {all.length > 0 ? (
        shown.length === 0 ? (
          <p className="ml__empty">
            No data
            <small>{tab === 'live' ? 'All missions done — new ones are on the way.' : 'No missions finished yet.'}</small>
          </p>
        ) : (
          <div className="ms">
            {shown.map((m) => {
              const pct = m.target > 0 ? Math.min(100, Math.round((m.progress / m.target) * 100)) : 0;
              return (
                <article className="ms__card" key={m.id}>
                  <span className="ms__art a3" aria-hidden>{m.measure === 'deposit' ? '💰' : '🎯'}</span>
                  <div className="ms__b">
                    <h3>{m.title}<i>{PERIOD_LABEL[m.period]}</i></h3>
                    <p>
                      {m.measure === 'deposit' ? 'Deposit' : 'Bet'}{' '}
                      {money(toTaka(Math.min(m.progress, m.target)))} / {money(toTaka(m.target))}
                      {' · '}Bonus <b className="ms__rw">{money(toTaka(m.reward))}</b>
                    </p>
                    <div className="ms__bar"><i style={{ width: `${pct}%` }} /></div>
                    {m.claimed ? (
                      <span className="ms__got">Claimed</span>
                    ) : m.done ? (
                      <button
                        type="button"
                        className="ms__go"
                        disabled={busy !== null}
                        onClick={async () => {
                          const reply = await claim('mission', m.id);
                          toast(reply.ok
                            ? `${money(toTaka(reply.amount))} added`
                            : reply.message ?? 'Could not claim — try again');
                        }}
                      >
                        Claim {money(toTaka(m.reward))}
                      </button>
                    ) : (
                      <span className="ms__left">
                        {money(toTaka(m.target - m.progress))} to go
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : (
        <div className="ms">
          {PROMOTIONS.map((p) => (
            <article className="ms__card" key={p.id}>
              <span className={`ms__art ${p.art}`} aria-hidden>{p.glyph}</span>
              <div className="ms__b">
                <h3>{p.title}{p.badge && <i>{p.badge}</i>}</h3>
                <p>{p.body}</p>
                <Link className="ms__go" href="/deposit">Join</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
