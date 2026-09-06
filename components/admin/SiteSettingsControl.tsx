'use client';

import { useState } from 'react';
import { BRAND } from '@/lib/brand';
import { DEPOSIT_CHANNELS } from '@/lib/payments';
import type { SiteSettings } from '@/lib/site-settings';

const ERROR_LABEL: Record<string, string> = {
  'invalid-limit': 'লিমিট ঠিক নেই — সর্বনিম্ন ০ বা বেশি এবং সর্বোচ্চের চেয়ে ছোট হতে হবে।',
  'invalid-url': 'লিংক https:// দিয়ে শুরু হতে হবে (খালি রাখলে বাটন থাকবে না)।',
  'invalid-email': 'ইমেইল ঠিকানাটি ঠিক নয় (খালি রাখলে ইমেইল দেখাবে না)।',
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
        <h2 className="adm__cardh">ডিপোজিট মেথড ও লিমিট</h2>
        <p className="adm__hint" style={{ margin: 0 }}>
          ডিপোজিট মেথড, তাদের সর্বনিম্ন-সর্বোচ্চ, বোনাস আর পেজের লেখা এখন
          <a href="/admin/cashier" style={{ color: 'var(--mint)', marginLeft: 4 }}>ক্যাশিয়ার ট্যাবে</a>।
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
          <label className="adm__f">
            <span>সাপোর্ট ইমেইল</span>
            <input
              type="email" placeholder="support@example.com" value={form.support.email} disabled={busy}
              onChange={(e) => setForm((f) => ({ ...f, support: { ...f.support, email: e.target.value } }))}
            />
          </label>
        </div>
        <p className="adm__hint">
          সাইটের পাশের ভাসমান বাটন, সাপোর্ট পেজ আর ফুটার এইগুলো ব্যবহার করে। খালি
          রাখলে সেই সারি বা বাটনটা লুকিয়ে যাবে।
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
