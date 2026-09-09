'use client';

import { useState } from 'react';
import type { BonusConfig, PromoCode } from '@/lib/bonus-config';

const ERROR_LABEL: Record<string, string> = {
  'sign-in-days': 'The sign-in ladder needs between 1 and 30 days, none of them negative.',
  'rescue-percent': 'The rescue share must be between 0 and 100.',
  'rebate-percent': 'The rebate share must be between 0 and 100.',
  'empty-code': 'A promo code cannot be blank.',
  'duplicate-code': 'That promo code is listed twice.',
  'too-many-codes': 'That is more promo codes than this screen will hold (50).',
  unauthorized: 'Your session has expired — log in again.',
};

/** What the house pays out, in taka, without a code change.

    Everything on this screen moves real money into a player's wallet the
    moment it is saved, so it says what each number costs in the line under
    it rather than leaving the operator to work it out. */
export default function BonusControl({ initial }: { initial: BonusConfig }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/admin/bonus', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as
        | { ok: true; config: BonusConfig }
        | { ok: false; reason: string };

      if (!data.ok) {
        setError(ERROR_LABEL[data.reason] ?? `Something went wrong (${data.reason})`);
        return;
      }
      setForm(data.config);
      setNotice('Saved — live on the site now.');
    } catch {
      setError('Could not reach the server — try again.');
    } finally {
      setBusy(false);
    }
  }

  const num = (v: number) => (Number.isFinite(v) ? v : '');
  const setCodes = (codes: PromoCode[]) => setForm((f) => ({ ...f, promo: { ...f.promo, codes } }));

  return (
    <form onSubmit={submit}>
      {/* ---------------------------------------------------- sign in ---- */}
      <div className="adm__card">
        <h2 className="adm__cardh">Daily sign in</h2>
        <label className="adm__check">
          <input
            type="checkbox" checked={form.signIn.active} disabled={busy}
            onChange={(e) => setForm((f) => ({ ...f, signIn: { ...f.signIn, active: e.target.checked } }))}
          />
          <span>Players can claim a sign-in bonus</span>
        </label>
        <p className="adm__hint">
          One claim per day. The ladder is the streak: day 1 pays the first figure, day 2 the
          second, and a player who misses a day starts again. The last figure repeats for as
          long as the streak holds.
        </p>
        <div className="adm__formgrid">
          {form.signIn.days.map((v, i) => (
            <label className="adm__f" key={i}>
              <span>Day {i + 1} (৳)</span>
              <input
                type="number" min={0} step={1} value={num(v)} disabled={busy}
                onChange={(e) => setForm((f) => {
                  const days = [...f.signIn.days];
                  days[i] = Number(e.target.value);
                  return { ...f, signIn: { ...f.signIn, days } };
                })}
              />
            </label>
          ))}
          <label className="adm__f">
            <span>Must have deposited (৳)</span>
            <input
              type="number" min={0} step={1} value={num(form.signIn.minDeposited)} disabled={busy}
              onChange={(e) => setForm((f) => ({ ...f, signIn: { ...f.signIn, minDeposited: Number(e.target.value) } }))}
            />
          </label>
        </div>
        <div className="adm__row">
          <button
            type="button" className="btn btn--ghost" disabled={busy || form.signIn.days.length >= 30}
            onClick={() => setForm((f) => ({ ...f, signIn: { ...f.signIn, days: [...f.signIn.days, 0] } }))}
          >
            Add a day
          </button>
          <button
            type="button" className="btn btn--ghost" disabled={busy || form.signIn.days.length <= 1}
            onClick={() => setForm((f) => ({ ...f, signIn: { ...f.signIn, days: f.signIn.days.slice(0, -1) } }))}
          >
            Remove the last
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------- rescue ---- */}
      <div className="adm__card">
        <h2 className="adm__cardh">Rescue fund</h2>
        <label className="adm__check">
          <input
            type="checkbox" checked={form.rescue.active} disabled={busy}
            onChange={(e) => setForm((f) => ({ ...f, rescue: { ...f.rescue, active: e.target.checked } }))}
          />
          <span>Players can claim back part of a losing day</span>
        </label>
        <p className="adm__hint">
          Worked out on yesterday, once yesterday is over: everything staked, less everything
          won. A player who came out ahead has nothing to claim.
        </p>
        <div className="adm__formgrid">
          <label className="adm__f">
            <span>Share returned (%)</span>
            <input
              type="number" min={0} max={100} step={0.1} value={num(form.rescue.percent)} disabled={busy}
              onChange={(e) => setForm((f) => ({ ...f, rescue: { ...f.rescue, percent: Number(e.target.value) } }))}
            />
          </label>
          <label className="adm__f">
            <span>Only if they lost at least (৳)</span>
            <input
              type="number" min={0} step={1} value={num(form.rescue.minLoss)} disabled={busy}
              onChange={(e) => setForm((f) => ({ ...f, rescue: { ...f.rescue, minLoss: Number(e.target.value) } }))}
            />
          </label>
          <label className="adm__f">
            <span>Never more than (৳ / day)</span>
            <input
              type="number" min={0} step={1} value={num(form.rescue.maxPayout)} disabled={busy}
              onChange={(e) => setForm((f) => ({ ...f, rescue: { ...f.rescue, maxPayout: Number(e.target.value) } }))}
            />
          </label>
        </div>
      </div>

      {/* ----------------------------------------------------- rebate ---- */}
      <div className="adm__card">
        <h2 className="adm__cardh">Rebate</h2>
        <label className="adm__check">
          <input
            type="checkbox" checked={form.rebate.active} disabled={busy}
            onChange={(e) => setForm((f) => ({ ...f, rebate: { ...f.rebate, active: e.target.checked } }))}
          />
          <span>Players can claim a rebate on what they staked</span>
        </label>
        <p className="adm__hint">
          A share of yesterday&apos;s stake, win or lose. Claimed once for that day.
        </p>
        <div className="adm__formgrid">
          <label className="adm__f">
            <span>Share of stake (%)</span>
            <input
              type="number" min={0} max={100} step={0.01} value={num(form.rebate.percent)} disabled={busy}
              onChange={(e) => setForm((f) => ({ ...f, rebate: { ...f.rebate, percent: Number(e.target.value) } }))}
            />
          </label>
          <label className="adm__f">
            <span>Do not pay below (৳)</span>
            <input
              type="number" min={0} step={1} value={num(form.rebate.minClaim)} disabled={busy}
              onChange={(e) => setForm((f) => ({ ...f, rebate: { ...f.rebate, minClaim: Number(e.target.value) } }))}
            />
          </label>
        </div>
      </div>

      {/* ------------------------------------------------------ promo ---- */}
      <div className="adm__card">
        <h2 className="adm__cardh">Promo codes</h2>
        <label className="adm__check">
          <input
            type="checkbox" checked={form.promo.active} disabled={busy}
            onChange={(e) => setForm((f) => ({ ...f, promo: { ...f.promo, active: e.target.checked } }))}
          />
          <span>Players can redeem a code</span>
        </label>
        <p className="adm__hint">
          One redeem per player per code. A limit of 0 means as many players as want it.
          Codes are matched without case or spaces, so they survive being read down a phone.
        </p>

        <table className="adm__table adm__table--edit">
          <thead>
            <tr><th>Code</th><th>Pays (৳)</th><th>Limit</th><th>On</th><th /></tr>
          </thead>
          <tbody>
            {form.promo.codes.length === 0 && (
              <tr><td colSpan={5} className="adm__empty">No codes yet.</td></tr>
            )}
            {form.promo.codes.map((c, i) => (
              <tr key={i}>
                <td>
                  <input
                    className="adm__mini" value={c.code} disabled={busy} maxLength={24}
                    onChange={(e) => setCodes(form.promo.codes.map((x, j) =>
                      j === i ? { ...x, code: e.target.value.toUpperCase() } : x))}
                  />
                </td>
                <td>
                  <input
                    className="adm__mini" type="number" min={0} step={1} value={num(c.amount)} disabled={busy}
                    onChange={(e) => setCodes(form.promo.codes.map((x, j) =>
                      j === i ? { ...x, amount: Number(e.target.value) } : x))}
                  />
                </td>
                <td>
                  <input
                    className="adm__mini" type="number" min={0} step={1} value={num(c.limit)} disabled={busy}
                    onChange={(e) => setCodes(form.promo.codes.map((x, j) =>
                      j === i ? { ...x, limit: Number(e.target.value) } : x))}
                  />
                </td>
                <td>
                  <input
                    type="checkbox" checked={c.active} disabled={busy}
                    onChange={(e) => setCodes(form.promo.codes.map((x, j) =>
                      j === i ? { ...x, active: e.target.checked } : x))}
                  />
                </td>
                <td>
                  <button
                    type="button" className="adm__iconbtn adm__iconbtn--danger" disabled={busy}
                    onClick={() => setCodes(form.promo.codes.filter((_, j) => j !== i))}
                    aria-label="Delete"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          type="button" className="btn btn--ghost" disabled={busy || form.promo.codes.length >= 50}
          onClick={() => setCodes([...form.promo.codes, { code: '', amount: 0, limit: 0, active: true }])}
        >
          Add a code
        </button>
      </div>

      {error && <p className="adm__err">{error}</p>}
      {notice && <p className="adm__ok">{notice}</p>}

      <button type="submit" className="btn btn--gold" disabled={busy}>
        {busy ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}
