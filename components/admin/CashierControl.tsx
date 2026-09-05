'use client';

import { useState } from 'react';
import { toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';
import type { CashierRow, RequestState } from '@/lib/cashier';

type Table = 'deposits' | 'withdrawals';

const STATE_TABS: { value: RequestState | 'all'; label: string }[] = [
  { value: 'pending', label: 'পেন্ডিং' },
  { value: 'approved', label: 'অনুমোদিত' },
  { value: 'rejected', label: 'বাতিল' },
  { value: 'all', label: 'সব' },
];

const STATE_LABEL: Record<RequestState, string> = {
  pending: 'পেন্ডিং',
  approved: 'অনুমোদিত',
  rejected: 'বাতিল',
  cancelled: 'বাতিল হয়েছে',
};

export default function CashierControl({
  table,
  initialRows,
  backendReady,
}: {
  table: Table;
  initialRows: CashierRow[];
  backendReady: boolean;
}) {
  const [rows, setRows] = useState(initialRows);
  const [state, setState] = useState<RequestState | 'all'>('pending');
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isDeposit = table === 'deposits';

  async function load(next: RequestState | 'all') {
    setState(next);
    setError('');
    setNotice('');
    try {
      const res = await fetch(`/api/admin/cashier?table=${table}&state=${next}`, { cache: 'no-store' });
      const data = (await res.json()) as
        | { ok: true; rows: CashierRow[] }
        | { ok: false; reason: string; message?: string };
      if (!data.ok) {
        setError(data.message ?? `লোড হয়নি (${data.reason})`);
        return;
      }
      setRows(data.rows);
    } catch {
      setError('সার্ভারে পৌঁছানো গেল না।');
    }
  }

  async function review(id: number, decision: 'approve' | 'reject') {
    setBusyId(id);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/admin/cashier', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ table, id, decision, note: notes[id] ?? '', state }),
      });
      const data = (await res.json()) as
        | { ok: true; rows: CashierRow[] }
        | { ok: false; reason: string; message?: string };

      if (!data.ok) {
        setError(data.message ?? `কাজ হয়নি (${data.reason})`);
        return;
      }
      setRows(data.rows);
      setNotes((n) => ({ ...n, [id]: '' }));
      setNotice(
        decision === 'approve'
          ? isDeposit ? 'ডিপোজিট অনুমোদন হয়েছে — প্লেয়ারের ব্যালেন্সে টাকা যোগ হয়েছে।'
                      : 'উইথড্র অনুমোদন হয়েছে।'
          : isDeposit ? 'ডিপোজিট বাতিল করা হয়েছে।'
                      : 'উইথড্র বাতিল — টাকা প্লেয়ারের ব্যালেন্সে ফেরত গেছে।',
      );
    } catch {
      setError('সার্ভারে পৌঁছানো গেল না।');
    } finally {
      setBusyId(0);
    }
  }

  if (!backendReady) {
    return (
      <p className="adm__warn">
        ডেটাবেস যুক্ত হয়নি। <code>.env.local</code> এ Supabase কী বসিয়ে সার্ভার
        রিস্টার্ট করলেই এই স্ক্রিন কাজ শুরু করবে — কোড সম্পূর্ণ তৈরি আছে।
      </p>
    );
  }

  const pending = rows.filter((r) => r.state === 'pending');
  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <>
      <div className="adm__tiles" style={{ marginBottom: 14 }}>
        <div className="adm__tile"><b>{rows.length}</b><small>এই তালিকায়</small></div>
        <div className="adm__tile"><b>{pending.length}</b><small>পেন্ডিং</small></div>
        <div className="adm__tile"><b>{money(toTaka(total))}</b><small>মোট পরিমাণ</small></div>
      </div>

      <div className="adm__seg">
        {STATE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={state === tab.value ? 'on' : ''}
            onClick={() => void load(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <p className="adm__err">{error}</p>}
      {notice && <p className="adm__note">{notice}</p>}

      <div className="adm__tablewrap">
        <table className="adm__table">
          <thead>
            <tr>
              <th>#</th><th>প্লেয়ার</th><th>চ্যানেল</th><th>পরিমাণ</th>
              <th>{isDeposit ? 'সেন্ডার / TxnID' : 'যে অ্যাকাউন্টে যাবে'}</th>
              <th>সময়</th><th>অবস্থা</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="adm__empty">
                  {isDeposit ? 'কোনো ডিপোজিট রিকোয়েস্ট নেই।' : 'কোনো উইথড্র রিকোয়েস্ট নেই।'}
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const busy = busyId === r.id;
                return (
                  <tr key={r.id}>
                    <td className="adm__muted">{r.id}</td>
                    <td>
                      {r.phone}
                      {r.displayName && <div className="adm__muted" style={{ fontSize: 11 }}>{r.displayName}</div>}
                    </td>
                    <td>{r.channelId}</td>
                    <td><b style={{ color: 'var(--gold)' }}>{money(toTaka(r.amount))}</b></td>
                    <td>
                      {isDeposit ? (
                        <>
                          <code>{r.senderNo || '—'}</code>
                          {r.txnId && <div className="adm__muted" style={{ fontSize: 11 }}>{r.txnId}</div>}
                        </>
                      ) : (
                        <code>{r.accountNo || '—'}</code>
                      )}
                    </td>
                    <td className="adm__muted">{when(r.createdAt)}</td>
                    <td>
                      {r.state === 'pending' && <span className="adm__miss">{STATE_LABEL.pending}</span>}
                      {r.state === 'approved' && <span className="adm__ok">{STATE_LABEL.approved}</span>}
                      {(r.state === 'rejected' || r.state === 'cancelled') && (
                        <span className="adm__muted">{STATE_LABEL[r.state]}</span>
                      )}
                      {r.adminNote && (
                        <div className="adm__muted" style={{ fontSize: 10.5 }}>{r.adminNote}</div>
                      )}
                    </td>
                    <td>
                      {r.state === 'pending' ? (
                        <div className="adm__review">
                          <input
                            className="adm__mini"
                            placeholder="নোট (ঐচ্ছিক)"
                            value={notes[r.id] ?? ''}
                            disabled={busy}
                            onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                          />
                          <div className="adm__rowacts">
                            <button type="button" className="btn btn--gold" disabled={busy}
                                    onClick={() => void review(r.id, 'approve')}>
                              অনুমোদন
                            </button>
                            <button type="button" className="btn btn--ghost adm__danger" disabled={busy}
                                    onClick={() => void review(r.id, 'reject')}>
                              বাতিল
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="adm__muted" style={{ fontSize: 11 }}>{when(r.reviewedAt)}</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function when(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}
