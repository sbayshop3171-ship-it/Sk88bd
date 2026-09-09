'use client';

import { useState } from 'react';
import { BRAND } from '@/lib/brand';
import { DEPOSIT_CHANNELS } from '@/lib/payments';
import type { SiteSettings } from '@/lib/site-settings';

const ERROR_LABEL: Record<string, string> = {
  'invalid-limit': 'Those limits are wrong — the minimum must be 0 or more and below the maximum.',
  'invalid-url': 'The link must start with https:// (leave it blank to drop the button).',
  'invalid-email': 'That email address is not valid (leave it blank to hide the email).',
  'unknown-channel': 'Unknown payment channel — refresh the page.',
  unauthorized: 'Your session has expired — log in again.',
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
        setError((ERROR_LABEL[data.reason] ?? `Something went wrong (${data.reason})`) + where);
        return;
      }
      setSaved(data.settings);
      setForm(data.settings);
      setNotice('Settings saved — live on the site now.');
    } catch {
      setError('Could not reach the server — try again.');
    } finally {
      setBusy(false);
    }
  }

  const num = (value: number) => (Number.isFinite(value) ? value : '');

  return (
    <form onSubmit={submit}>
      <div className="adm__card">
        <h2 className="adm__cardh">Deposit methods &amp; limits</h2>
        <p className="adm__hint" style={{ margin: 0 }}>
          Deposit methods, their minimums and maximums, bonuses and page copy now live in the
          <a href="/admin/cashier" style={{ color: 'var(--mint)', marginLeft: 4 }}>Cashier tab</a>.
        </p>
      </div>

      <div className="adm__card">
        <h2 className="adm__cardh">Withdrawal limits (৳)</h2>
        <div className="adm__formgrid">
          <label className="adm__f">
            <span>Minimum withdrawal</span>
            <input
              type="number" min={0} step={1} value={num(form.withdraw.min)} disabled={busy}
              onChange={(e) => setForm((f) => ({ ...f, withdraw: { ...f.withdraw, min: Number(e.target.value) } }))}
            />
          </label>
          <label className="adm__f">
            <span>Maximum withdrawal (per request)</span>
            <input
              type="number" min={0} step={1} value={num(form.withdraw.max)} disabled={busy}
              onChange={(e) => setForm((f) => ({ ...f, withdraw: { ...f.withdraw, max: Number(e.target.value) } }))}
            />
          </label>
        </div>
      </div>

      <div className="adm__card">
        <h2 className="adm__cardh">Support links</h2>
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
            <span>Support email</span>
            <input
              type="email" placeholder="support@example.com" value={form.support.email} disabled={busy}
              onChange={(e) => setForm((f) => ({ ...f, support: { ...f.support, email: e.target.value } }))}
            />
          </label>
        </div>
        <p className="adm__hint">
          The floating buttons, the support page and the footer all use these. Leave one
          blank and that row or button disappears.
        </p>
      </div>

      <div className="adm__card">
        <h2 className="adm__cardh">Scrolling notice</h2>
        <label className="adm__f adm__f--wide">
          <span>Text that scrolls across the top of the home page</span>
          <input
            value={form.notice} placeholder={`Leave blank to show the ${BRAND.name} welcome message`}
            maxLength={200} disabled={busy}
            onChange={(e) => setForm((f) => ({ ...f, notice: e.target.value }))}
          />
        </label>
      </div>

      {error && <p className="adm__err">{error}</p>}
      {notice && <p className="adm__note">{notice}</p>}

      <div className="adm__actions">
        <button type="submit" className="btn btn--gold" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => { setForm(saved); setError(''); setNotice(''); }}>
          Cancel
        </button>
      </div>
      {saved.updatedAt && (
        <p className="adm__hint">Last saved: {new Date(saved.updatedAt).toLocaleString('en-GB')}</p>
      )}
    </form>
  );
}
