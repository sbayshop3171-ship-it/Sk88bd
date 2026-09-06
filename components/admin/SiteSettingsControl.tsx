'use client';

import { useState } from 'react';
import { BRAND } from '@/lib/brand';
import { DEPOSIT_CHANNELS } from '@/lib/payments';
import type { SiteSettings } from '@/lib/site-settings';

const ERROR_LABEL: Record<string, string> = {
  'invalid-limit': 'লিমিট ঠিক নেই — সর্বনিম্ন ০ বা বেশি এবং সর্বোচ্চের চেয়ে ছোট হতে হবে।',
  'invalid-url': 'লিংক https:// দিয়ে শুরু হতে হবে (খালি রাখলে বাটন থাকবে না)।',
  'unknown-channel': 'অজানা পেমেন্ট চ্যানেল — পেজ রিফ্রেশ করুন।',
  unauthorized: 'সেশন শেষ হয়ে গেছে — আবার লগইন করুন।',
};

const CHANNEL_NAME = Object.fromEntries(DEPOSIT_CHANNELS.map((c) => [c.id, c.name]));

/** Cashier limits, support links and the running notice — the numbers the
    deposit / withdraw screens print, editable without a code change. */
export default function SiteSettingsControl({ initial }: { initial: SiteSettings }) {
  const [saved, setSaved] = useState(initial);
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const setDeposit = (id: string, patch: Partial<SiteSettings['deposit'][string]>) =>
    setForm((f) => ({ ...f, deposit: { ...f.deposit, [id]: { ...f.deposit[id], ...patch } } }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          deposit: form.deposit,
          withdraw: form.withdraw,
          support: form.support,
          notice: form.notice,
        }),
      });
      const data = (await res.json()) as
        | { ok: true; settings: SiteSettings }
        | { ok: false; reason: string; field?: string };

      if (!data.ok) {
        const where = data.field && CHANNEL_NAME[data.field] ? ` (${CHANNEL_NAME[data.field]})` : '';
        setError((ERROR_LABEL[data.reason] ?? `সমস্যা হয়েছে (${data.reason})`) + where);
        return;
      }
      setSaved(data.settings);
      setForm(data.settings);
      setNotice('সেটিংস সেভ হয়েছে — সাইটে এখনই কার্যকর।');
    } catch {
      setError('সার্ভারে পৌঁছানো গেল না — আবার চেষ্টা করুন।');
    } finally {
      setBusy(false);
    }
  }

  const num = (value: number) => (Number.isFinite(value) ? value : '');

  return (
    <form onSubmit={submit}>
      <div className="adm__card">
        <h2 className="adm__cardh">ডিপোজিট লিমিট (৳)</h2>
        <div className="adm__tablewrap" style={{ marginBottom: 6 }}>
          <table className="adm__table">
            <thead>
              <tr><th>চ্যানেল</th><th>সর্বনিম্ন</th><th>সর্বোচ্চ</th><th>চালু</th></tr>
            </thead>
            <tbody>
              {DEPOSIT_CHANNELS.map((c) => {
                const lim = form.deposit[c.id];
                if (!lim) return null;
                return (
                  <tr key={c.id}>
                    <td>{c.glyph} {c.name}</td>
                    <td>
                      <input
                        className="adm__mini" type="number" min={0} step={1} style={{ width: 96 }}
                        value={num(lim.min)} disabled={busy}
                        onChange={(e) => setDeposit(c.id, { min: Number(e.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        className="adm__mini" type="number" min={0} step={1} style={{ width: 110 }}
                        value={num(lim.max)} disabled={busy}
                        onChange={(e) => setDeposit(c.id, { max: Number(e.target.value) })}
                      />
                    </td>
                    <td>
                      <select
                        className="adm__mini" value={lim.active ? '1' : '0'} disabled={busy}
                        onChange={(e) => setDeposit(c.id, { active: e.target.value === '1' })}
                      >
                        <option value="1">হ্যাঁ</option>
                        <option value="0">বন্ধ</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="adm__hint">
          বন্ধ করা চ্যানেল ডিপোজিট পেজে দেখাবে না। প্লেয়ার এই সীমার বাইরে অংক দিলে
          ফর্ম আটকে যাবে।
        </p>
      </div>

      <div className="adm__card">
        <h2 className="adm__cardh">উইথড্র লিমিট (৳)</h2>
        <div className="adm__formgrid">
          <label className="adm__f">
            <span>সর্বনিম্ন উইথড্র</span>
            <input
              type="number" min={0} step={1} value={num(form.withdraw.min)} disabled={busy}
              onChange={(e) => setForm((f) => ({ ...f, withdraw: { ...f.withdraw, min: Number(e.target.value) } }))}
            />
          </label>
          <label className="adm__f">
            <span>সর্বোচ্চ উইথড্র (এক রিকোয়েস্টে)</span>
            <input
              type="number" min={0} step={1} value={num(form.withdraw.max)} disabled={busy}
              onChange={(e) => setForm((f) => ({ ...f, withdraw: { ...f.withdraw, max: Number(e.target.value) } }))}
            />
          </label>
        </div>
      </div>

      <div className="adm__card">
        <h2 className="adm__cardh">সাপোর্ট লিংক</h2>
        <div className="adm__formgrid">
          {(['whatsapp', 'telegram', 'facebook'] as const).map((key) => (
            <label className="adm__f" key={key}>
              <span>{key === 'whatsapp' ? 'WhatsApp' : key === 'telegram' ? 'Telegram' : 'Facebook'}</span>
              <input
                type="url" placeholder="https://…" value={form.support[key]} disabled={busy}
                onChange={(e) => setForm((f) => ({ ...f, support: { ...f.support, [key]: e.target.value } }))}
              />
            </label>
          ))}
        </div>
        <p className="adm__hint">
          সাইটের পাশের ভাসমান বাটন আর সাপোর্ট পেজ এই লিংকগুলো ব্যবহার করে। খালি
          রাখলে সেই বাটনটা লুকিয়ে যাবে।
        </p>
      </div>

      <div className="adm__card">
        <h2 className="adm__cardh">চলমান নোটিশ</h2>
        <label className="adm__f adm__f--wide">
          <span>হোম পেজের উপরে স্ক্রল করা লেখা</span>
          <input
            value={form.notice} placeholder={`খালি রাখলে ${BRAND.name} এর স্বাগত বার্তা দেখাবে`}
            maxLength={200} disabled={busy}
            onChange={(e) => setForm((f) => ({ ...f, notice: e.target.value }))}
          />
        </label>
      </div>

      {error && <p className="adm__err">{error}</p>}
      {notice && <p className="adm__note">{notice}</p>}

      <div className="adm__actions">
        <button type="submit" className="btn btn--gold" disabled={busy}>
          {busy ? 'সেভ হচ্ছে…' : 'সেভ করুন'}
        </button>
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => { setForm(saved); setError(''); setNotice(''); }}>
          বাতিল
        </button>
      </div>
      {saved.updatedAt && (
        <p className="adm__hint">শেষ সেভ: {new Date(saved.updatedAt).toLocaleString('bn-BD')}</p>
      )}
    </form>
  );
}
