'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthProvider';
import Empty from './Empty';
import { CopyIcon } from './Icons';
import { useUI } from './UIProvider';
import { useLightSheet } from './useLightSheet';
import { toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';
import { KIND_LABEL } from '@/lib/payment-accounts';

/* ============================================================
   Deposit Record / Withdrawal Record.

   The reference shows one card per request: the channel and when
   it was raised, a block of the request's own detail, and a row
   of four figures underneath — what was asked for, what arrived,
   what the bonus was, and where it stands.

   Half of those fields we have and half we do not, and the ones
   we do not are shown as "—" rather than dropped: a player
   comparing this against the book they came from should find the
   same lines in the same order, and an empty line is an honest
   answer to "was there a handling fee".
   ============================================================ */

type Row = {
  id: number;
  channel_id: string;
  amount: number;
  state: 'pending' | 'approved' | 'rejected' | 'cancelled';
  admin_note: string | null;
  created_at: string;
  /** deposits, migration 005 */
  bonus_amount?: number | null;
  /** withdrawals, migration 006 */
  charge_amount?: number | null;
};

const STATE_LABEL: Record<Row['state'], string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

type Preset = 'today' | 'yesterday' | '7d';

const dayOf = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

const shift = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dayOf(d);
};

const BASE = 'id, channel_id, amount, state, admin_note, created_at';

export default function CashierHistory({
  table,
  emptyText,
  glyph,
}: {
  table: 'deposits' | 'withdrawals';
  emptyText: string;
  glyph: string;
}) {
  useLightSheet();
  const { ready, backendReady, session, supabase } = useAuth();
  const { toast } = useUI();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [preset, setPreset] = useState<Preset>('today');
  const [state, setState] = useState<'all' | Row['state']>('all');
  const [channel, setChannel] = useState('all');

  useEffect(() => {
    if (!supabase || !session) return;
    let live = true;

    /* The extra column arrives with a migration that may not be applied on
       this deployment yet, so the richer read is tried first and the plain
       one answers for it if the column is not there. */
    const extra = table === 'deposits' ? 'bonus_amount' : 'charge_amount';
    const run = (cols: string) =>
      supabase.from(table).select(cols)
        .order('created_at', { ascending: false })
        .limit(50);

    void run(`${BASE}, ${extra}`).then(({ data, error }) => {
      if (!live) return;
      if (!error) { setRows((data as unknown as Row[]) ?? []); return; }
      void run(BASE).then(({ data: plain }) => {
        if (live) setRows((plain as unknown as Row[]) ?? []);
      });
    });

    return () => { live = false; };
  }, [supabase, session, table]);

  const span = useMemo((): [string, string] => {
    if (preset === 'today') return [dayOf(new Date()), dayOf(new Date())];
    if (preset === 'yesterday') return [shift(-1), shift(-1)];
    return [shift(-6), dayOf(new Date())];
  }, [preset]);

  const channels = useMemo(() => {
    const seen = new Set<string>();
    for (const r of rows ?? []) seen.add(r.channel_id);
    return [...seen];
  }, [rows]);

  const shown = useMemo(() => (rows ?? []).filter((r) => {
    const day = r.created_at.slice(0, 10);
    if (day < span[0] || day > span[1]) return false;
    if (state !== 'all' && r.state !== state) return false;
    if (channel !== 'all' && r.channel_id !== channel) return false;
    return true;
  }), [rows, span, state, channel]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast('কপি হয়েছে');
    } catch {
      toast('কপি করা গেল না');
    }
  };

  const dash = (v: number | null | undefined) =>
    v === null || v === undefined ? '—' : money(toTaka(v), 2);

  const chrome = (
    <>
      <div className="cr__tabs">
        {([['today', 'Today'], ['yesterday', 'Yesterday'], ['7d', '7-days']] as [Preset, string][])
          .map(([key, label]) => (
            <button key={key} type="button" className={preset === key ? 'on' : ''} onClick={() => setPreset(key)}>
              {label}
            </button>
          ))}
      </div>
      <div className="cr__filters">
        <select value={state} onChange={(e) => setState(e.target.value as typeof state)}>
          <option value="all">All</option>
          {(Object.keys(STATE_LABEL) as Row['state'][]).map((s) => (
            <option key={s} value={s}>{STATE_LABEL[s]}</option>
          ))}
        </select>
        {channels.length > 1 && (
          <select value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="all">Types</option>
            {channels.map((c) => (
              <option key={c} value={c}>{KIND_LABEL[c as keyof typeof KIND_LABEL] ?? c}</option>
            ))}
          </select>
        )}
        <span className="cr__span">{span[0].slice(5)} – {span[1].slice(5)}</span>
      </div>
    </>
  );

  if (!ready) return null;

  if (!backendReady || !session) {
    return (
      <>
        {chrome}
        <Empty glyph={glyph} text={emptyText} />
        {backendReady && (
          <div className="note" style={{ margin: 12 }}>
            <Link href="/login">Log in</Link> to see your own records.
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {chrome}
      {rows === null && <Empty glyph={glyph} text="Loading…" />}
      {rows !== null && shown.length === 0 && <Empty glyph={glyph} text="No data" />}

      {shown.map((r) => (
        <article className="cr__card" key={r.id}>
          <header>
            <b>{(KIND_LABEL[r.channel_id as keyof typeof KIND_LABEL] ?? r.channel_id).toUpperCase()}</b>
            <time>{r.created_at.replace('T', ' ').slice(0, 19)}</time>
          </header>

          <dl className="cr__detail">
            <div>
              <dt>{table === 'deposits' ? 'Deposit' : 'Withdrawal'} ref#</dt>
              <dd>
                {r.id}
                <button type="button" onClick={() => copy(String(r.id))} aria-label="Copy"><CopyIcon /></button>
              </dd>
            </div>
            <div><dt>Postscript</dt><dd>{r.admin_note || '—'}</dd></div>
            <div><dt>Received time</dt><dd>{r.state === 'approved' ? r.created_at.replace('T', ' ').slice(0, 19) : '—'}</dd></div>
            <div><dt>Handling fee</dt><dd>{dash(r.charge_amount)}</dd></div>
            <div><dt>Promotions</dt><dd>{dash(r.bonus_amount)}</dd></div>
            <div><dt>Remarks</dt><dd>{r.admin_note || '—'}</dd></div>
          </dl>

          <footer className="cr__figs">
            <div><b className="is-req">{money(toTaka(r.amount), 2)}</b><span>Request</span></div>
            <div><b>{r.state === 'approved' ? money(toTaka(r.amount), 2) : '—'}</b><span>Received amount</span></div>
            <div><b>{dash(r.bonus_amount)}</b><span>Bonus Amount</span></div>
            <div>
              <b className={`cr__state cr__state--${r.state}`}>{STATE_LABEL[r.state]}</b>
              <span>Status</span>
            </div>
          </footer>
        </article>
      ))}
    </>
  );
}
