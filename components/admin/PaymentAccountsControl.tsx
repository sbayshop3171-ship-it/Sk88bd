'use client';

import { useMemo, useState } from 'react';
import {
  KIND_LABEL,
  MAX_PER_CHANNEL,
  USE_LABEL,
  type PaymentAccount,
  type PaymentAccountInput,
} from '@/lib/payment-accounts';

type Channel = { id: string; name: string; glyph: string; art: string };

const ERROR_LABEL: Record<string, string> = {
  'channel-full': `একটি চ্যানেলে সর্বোচ্চ ${MAX_PER_CHANNEL} টি নাম্বার রাখা যায়।`,
  'duplicate-number': 'এই নাম্বারটি ঐ চ্যানেলে আগে থেকেই আছে।',
  'invalid-number': 'নাম্বারটি ঠিক নয় — ৪ থেকে ৬৪ ক্যারেক্টার হতে হবে।',
  'invalid-holder': 'অ্যাকাউন্টের নাম দিন (কমপক্ষে ২ অক্ষর)।',
  'unknown-channel': 'চ্যানেলটি চেনা গেল না।',
  'not-found': 'অ্যাকাউন্টটি পাওয়া যায়নি — পেজ রিফ্রেশ করুন।',
  unauthorized: 'সেশন শেষ হয়ে গেছে — আবার লগইন করুন।',
};

const BLANK = (channelId: string): PaymentAccountInput => ({
  channelId,
  number: '',
  holder: '',
  kind: 'personal',
  use: 'deposit',
  note: '',
  status: 'active',
  weight: 1,
});

export default function PaymentAccountsControl({
  channels,
  initialAccounts,
}: {
  channels: Channel[];
  initialAccounts: PaymentAccount[];
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [form, setForm] = useState<PaymentAccountInput>(BLANK(channels[0].id));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const perChannel = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of accounts) counts[a.channelId] = (counts[a.channelId] ?? 0) + 1;
    return counts;
  }, [accounts]);

  const activeCount = accounts.filter((a) => a.status === 'active').length;
  const channelsCovered = channels.filter((c) => (perChannel[c.id] ?? 0) > 0).length;
  const full = !editingId && (perChannel[form.channelId] ?? 0) >= MAX_PER_CHANNEL;

  async function send(body: Record<string, unknown>, okMessage: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/admin/payment-accounts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as
        | { ok: true; accounts: PaymentAccount[] }
        | { ok: false; reason: string };

      if (!data.ok) {
        setError(ERROR_LABEL[data.reason] ?? `সমস্যা হয়েছে (${data.reason})`);
        return false;
      }
      setAccounts(data.accounts);
      setNotice(okMessage);
      return true;
    } catch {
      setError('সার্ভারে পৌঁছানো গেল না — আবার চেষ্টা করুন।');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = editingId
      ? await send({ action: 'update', id: editingId, ...form }, 'অ্যাকাউন্ট আপডেট হয়েছে।')
      : await send({ action: 'add', ...form }, 'নতুন অ্যাকাউন্ট যোগ হয়েছে।');

    if (ok) {
      setForm(BLANK(form.channelId));
      setEditingId(null);
    }
  }

  function edit(account: PaymentAccount) {
    setEditingId(account.id);
    setError('');
    setNotice('');
    setForm({
      channelId: account.channelId,
      number: account.number,
      holder: account.holder,
      kind: account.kind,
      use: account.use,
      note: account.note,
      status: account.status,
      weight: account.weight,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(BLANK(form.channelId));
    setError('');
    setNotice('');
  }

  const set = <K extends keyof PaymentAccountInput>(key: K, value: PaymentAccountInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <>
      <div className="adm__tiles" style={{ marginBottom: 14 }}>
        <div className="adm__tile"><b>{accounts.length}</b><small>মোট অ্যাকাউন্ট</small></div>
        <div className="adm__tile"><b>{activeCount}</b><small>সক্রিয়</small></div>
        <div className="adm__tile"><b>{channelsCovered}/{channels.length}</b><small>চ্যানেল কভার</small></div>
        <div className="adm__tile"><b>{MAX_PER_CHANNEL}</b><small>প্রতি চ্যানেলে সর্বোচ্চ</small></div>
      </div>

      <form className="adm__card" onSubmit={submit}>
        <h2 className="adm__cardh">
          {editingId ? 'অ্যাকাউন্ট এডিট' : 'নতুন অ্যাকাউন্ট যোগ করুন'}
        </h2>

        <div className="adm__formgrid">
          <label className="adm__f">
            <span>চ্যানেল</span>
            <select
              value={form.channelId}
              onChange={(e) => set('channelId', e.target.value)}
              disabled={busy}
            >
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({perChannel[c.id] ?? 0}/{MAX_PER_CHANNEL})
                </option>
              ))}
            </select>
          </label>

          <label className="adm__f">
            <span>নাম্বার / অ্যাকাউন্ট</span>
            <input
              value={form.number}
              onChange={(e) => set('number', e.target.value)}
              placeholder="01XXXXXXXXX"
              inputMode="text"
              disabled={busy}
            />
          </label>

          <label className="adm__f">
            <span>অ্যাকাউন্টের নাম</span>
            <input
              value={form.holder}
              onChange={(e) => set('holder', e.target.value)}
              placeholder="যেমন: Sk88bd Agent 1"
              disabled={busy}
            />
          </label>

          <label className="adm__f">
            <span>ধরন</span>
            <select value={form.kind} onChange={(e) => set('kind', e.target.value as PaymentAccountInput['kind'])} disabled={busy}>
              {Object.entries(KIND_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>

          <label className="adm__f">
            <span>কোথায় ব্যবহার</span>
            <select value={form.use} onChange={(e) => set('use', e.target.value as PaymentAccountInput['use'])} disabled={busy}>
              {Object.entries(USE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>

          <label className="adm__f">
            <span>ওজন (১-১০)</span>
            <input
              type="number" min={1} max={10}
              value={form.weight}
              onChange={(e) => set('weight', Number(e.target.value))}
              disabled={busy}
            />
          </label>

          <label className="adm__f">
            <span>অবস্থা</span>
            <select value={form.status} onChange={(e) => set('status', e.target.value as PaymentAccountInput['status'])} disabled={busy}>
              <option value="active">সক্রিয়</option>
              <option value="disabled">বন্ধ</option>
            </select>
          </label>

          <label className="adm__f adm__f--wide">
            <span>নোট (ঐচ্ছিক — প্লেয়ার দেখবে)</span>
            <input
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
              placeholder="যেমন: Send Money করুন, Cash Out নয়"
              disabled={busy}
            />
          </label>
        </div>

        {full && (
          <p className="adm__warn" style={{ margin: '0 0 10px' }}>
            এই চ্যানেলে {MAX_PER_CHANNEL} টি নাম্বার হয়ে গেছে। নতুন যোগ করতে আগে একটি মুছুন।
          </p>
        )}
        {error && <p className="adm__err">{error}</p>}
        {notice && <p className="adm__note">{notice}</p>}

        <div className="adm__actions">
          <button type="submit" className="btn btn--gold" disabled={busy || full}>
            {editingId ? 'আপডেট করুন' : 'যোগ করুন'}
          </button>
          {editingId && (
            <button type="button" className="btn btn--ghost" onClick={cancelEdit} disabled={busy}>
              বাতিল
            </button>
          )}
        </div>

        <p className="adm__hint">
          ওজন বেশি মানে ঐ নাম্বারে বেশি প্লেয়ার যাবে। সব নাম্বারের ওজন সমান রাখলে
          ট্রাফিক সমানভাবে ভাগ হবে।
        </p>
      </form>

      <div className="adm__tablewrap">
        <table className="adm__table">
          <thead>
            <tr>
              <th>চ্যানেল</th><th>নাম্বার</th><th>নাম</th><th>ধরন</th>
              <th>ব্যবহার</th><th>ওজন</th><th>হিট</th><th>অবস্থা</th><th></th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={9} className="adm__empty">
                  কোনো অ্যাকাউন্ট যোগ করা হয়নি — উপরের ফর্ম থেকে যোগ করুন।
                </td>
              </tr>
            ) : (
              accounts.map((a) => {
                const channel = channels.find((c) => c.id === a.channelId);
                return (
                  <tr key={a.id}>
                    <td>{channel?.name ?? a.channelId}</td>
                    <td><code>{a.number}</code></td>
                    <td>{a.holder}</td>
                    <td>{KIND_LABEL[a.kind]}</td>
                    <td>{USE_LABEL[a.use]}</td>
                    <td>{a.weight}</td>
                    <td>{a.usageCount}</td>
                    <td>
                      {a.status === 'active'
                        ? <span className="adm__ok">সক্রিয়</span>
                        : <span className="adm__miss">বন্ধ</span>}
                    </td>
                    <td className="adm__rowacts">
                      <button type="button" className="btn btn--ghost" onClick={() => edit(a)} disabled={busy}>
                        এডিট
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        disabled={busy}
                        onClick={() => send(
                          { action: 'update', ...a, status: a.status === 'active' ? 'disabled' : 'active' },
                          a.status === 'active' ? 'অ্যাকাউন্ট বন্ধ করা হয়েছে।' : 'অ্যাকাউন্ট সক্রিয় করা হয়েছে।',
                        )}
                      >
                        {a.status === 'active' ? 'বন্ধ' : 'চালু'}
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost adm__danger"
                        disabled={busy}
                        onClick={() => send({ action: 'remove', id: a.id }, 'অ্যাকাউন্ট মুছে ফেলা হয়েছে।')}
                      >
                        মুছুন
                      </button>
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
