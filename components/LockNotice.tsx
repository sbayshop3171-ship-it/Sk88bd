'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { APPEAL_MAX, type LockStatus } from '@/lib/withdraw-lock';

/* ============================================================
   The withdraw-lock notice (migration 013).

   Shown on My Account and in place of the withdraw form while an admin or
   agent has the player's withdrawals locked. Everything else on the site
   works as usual, so this is the one place the player learns why their
   money will not come out — and the one place they can answer it.

   Bangla on purpose: it is money the player could lose by misreading
   (see site-is-english-now), and the reference screen is Bangla too.
   ============================================================ */

/** The signed-in player's lock, re-read on demand. null until known. */
export function useWithdrawLock() {
  const { session } = useAuth();
  const [status, setStatus] = useState<LockStatus | null>(null);

  const reload = useCallback(async () => {
    if (!session) { setStatus(null); return; }
    try {
      const res = await fetch('/api/me/lock', { cache: 'no-store' });
      const data = (await res.json()) as { ok: boolean; status?: LockStatus };
      setStatus(data.ok && data.status ? data.status : null);
    } catch {
      /* offline: say nothing rather than a false "locked" */
    }
  }, [session]);

  useEffect(() => { void reload(); }, [reload]);

  return { status, setStatus, reload };
}

const bnNum = new Intl.NumberFormat('bn-BD');

function ago(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'এইমাত্র';
  if (min < 60) return `${bnNum.format(min)} মিনিট আগে`;
  const h = Math.round(min / 60);
  return h < 24 ? `${bnNum.format(h)} ঘণ্টা আগে` : `${bnNum.format(Math.round(h / 24))} দিন আগে`;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString('bn-BD', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });

/** One tap fills the appeal box; the player can still write their own. */
const APPEAL_PRESETS = [
  'আমার অ্যাকাউন্ট ভুলবশত ফ্ল্যাগ করা হয়েছে',
  'আমি কোনো হ্যাকিং বা প্রতারণা করিনি, দয়া করে যাচাই করুন',
];

export default function LockNotice({
  status,
  onChange,
}: {
  status: LockStatus;
  onChange: (next: LockStatus) => void;
}) {
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (!status.locked) return null;
  const appeal = status.appeal;
  const pending = appeal?.state === 'pending';
  const rejected = appeal?.state === 'rejected';
  const canAppeal = !pending;

  const submit = async () => {
    if (!text.trim()) { setErr('আপিলে কিছু লিখুন'); return; }
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/me/lock', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = (await res.json()) as { ok: boolean; status?: LockStatus; message?: string };
      if (!data.ok || !data.status) { setErr(data.message ?? 'আপিল পাঠানো যায়নি — আবার চেষ্টা করুন'); return; }
      setWriting(false);
      setText('');
      onChange(data.status);
    } catch {
      setErr('সংযোগ পাওয়া যায়নি — আবার চেষ্টা করুন');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="lk" aria-live="polite">
      <div className="lk__head">
        <span className="lk__ico" aria-hidden><ShieldAlert /></span>
        <div className="lk__txt">
          <div className="lk__title">
            <b>অ্যাকাউন্ট পর্যালোচনাধীন</b>
            <i className="lk__bang" aria-hidden>!</i>
          </div>
          <p className="lk__reason">{status.reason}</p>
        </div>
        {canAppeal && !writing && !rejected && (
          <button type="button" className="lk__btn" onClick={() => setWriting(true)}>
            <PlaneIcon /> আপিল করুন
          </button>
        )}
      </div>

      <p className="lk__rule">এই অবস্থায় ডিপোজিট ও খেলা চালু আছে, তবে উইথড্র বন্ধ থাকবে।</p>

      {appeal && !writing && (
        <div className="lk__box">
          <div className="lk__row">
            <span className={`lk__chip${rejected ? ' is-no' : ''}`}>
              <ClockIcon />
              আপিলের অবস্থা: {pending ? 'পর্যালোচনাধীন' : rejected ? 'প্রত্যাখ্যাত' : 'গৃহীত'}
            </span>
            <small className="lk__ago">{ago(appeal.reviewedAt ?? appeal.createdAt)}</small>
          </div>

          <p className="lk__when">জমা দেওয়া হয়েছে: <b>{when(appeal.createdAt)}</b></p>

          <div className="lk__quote">
            <small><DocIcon /> আপনার আপিল</small>
            <p>{appeal.message}</p>
          </div>

          {rejected && appeal.adminNote && (
            <div className="lk__quote is-no">
              <small>সিদ্ধান্তের কারণ</small>
              <p>{appeal.adminNote}</p>
            </div>
          )}

          <ol className="lk__steps">
            <li className="is-done"><span>✓</span>জমা</li>
            <li className={pending ? 'is-now' : 'is-done'}><span>{pending ? '•' : '✓'}</span>পর্যালোচনা</li>
            <li className={rejected ? 'is-no' : ''}><span>{rejected ? '✕' : '•'}</span>সিদ্ধান্ত</li>
          </ol>

          {rejected && (
            <button type="button" className="lk__btn lk__btn--wide" onClick={() => setWriting(true)}>
              <PlaneIcon /> আবার আপিল করুন
            </button>
          )}
        </div>
      )}

      {writing && (
        <div className="lk__box">
          <label className="lk__label" htmlFor="lk-appeal">আপনার আপিল লিখুন</label>
          <div className="lk__presets">
            {APPEAL_PRESETS.map((p) => (
              <button key={p} type="button" onClick={() => setText(p)} disabled={busy}>{p}</button>
            ))}
          </div>
          <textarea
            id="lk-appeal"
            value={text}
            maxLength={APPEAL_MAX}
            rows={3}
            disabled={busy}
            onChange={(e) => setText(e.target.value)}
            placeholder="কেন আপনার অ্যাকাউন্ট আনলক করা উচিত, লিখুন…"
          />
          {err && <p className="lk__err">{err}</p>}
          <div className="lk__acts">
            <button type="button" className="lk__ghost" disabled={busy} onClick={() => { setWriting(false); setErr(''); }}>
              বাতিল
            </button>
            <button type="button" className="lk__btn" disabled={busy} onClick={submit}>
              <PlaneIcon /> {busy ? 'পাঠানো হচ্ছে…' : 'আপিল জমা দিন'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

const svg = {
  viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true,
};
const ShieldAlert = () => (
  <svg {...svg}><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6z" /><path d="M12 8v4.5" /><circle cx="12" cy="15.8" r=".6" fill="currentColor" /></svg>
);
const PlaneIcon = () => (
  <svg {...svg}><path d="M21 3 10.5 13.5" /><path d="M21 3l-6.5 18-4-7.5L3 9.5z" /></svg>
);
const ClockIcon = () => (
  <svg {...svg}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
const DocIcon = () => (
  <svg {...svg}><path d="M6 3h9l4 4v14H6z" /><path d="M9 12h6M9 16h4" /></svg>
);
