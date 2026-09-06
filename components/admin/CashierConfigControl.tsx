'use client';

import { useState } from 'react';
import {
  PAY_TYPE_LABEL,
  type AmountPreset,
  type CashierConfig,
  type DepositMethod,
  type PayType,
  type WithdrawMethod,
} from '@/lib/cashier-config';

type Channel = { id: string; name: string };
type Side = 'deposit' | 'withdraw';

const ERROR_LABEL: Record<string, string> = {
  'invalid-method': 'মেথডের নাম কমপক্ষে ২ অক্ষর হতে হবে।',
  'invalid-amounts': 'অংকের চিপে শুধু ০ এর বেশি সংখ্যা দিন।',
  'invalid-limit': 'লিমিট ঠিক নেই — সর্বনিম্ন সর্বোচ্চের চেয়ে ছোট হতে হবে।',
  'unknown-channel': 'অজানা পেমেন্ট চ্যানেল।',
  'invalid-pattern': 'TrxID ফরম্যাট (regex) টি ঠিক নয়।',
  'invalid-url': 'লিংক https:// দিয়ে শুরু হতে হবে।',
  unauthorized: 'সেশন শেষ হয়ে গেছে — আবার লগইন করুন।',
};

const PAY_TYPES = Object.keys(PAY_TYPE_LABEL) as PayType[];

const DEPOSIT_TEXTS: [keyof CashierConfig['deposit'], string, boolean][] = [
  ['methodTitle', 'মেথড সেকশনের শিরোনাম', false],
  ['channelTitle', 'চ্যানেল সেকশনের শিরোনাম', false],
  ['amountTitle', 'পরিমাণ সেকশনের শিরোনাম', false],
  ['channelNote', 'চ্যানেল কার্ডের নিচের গোলাপি নোট', true],
  ['stepHeaderNote', 'পেমেন্ট স্ক্রিনের হেডারের ছোট লেখা', false],
  ['stepWarning', 'পেমেন্ট স্ক্রিনের লাল সতর্কবার্তা', true],
  ['walletLabel', 'ওয়ালেট নাম্বার লেবেল', false],
  ['howToTitle', 'কিভাবে পাঠাবেন — শিরোনাম', false],
  ['howToSteps', 'কিভাবে পাঠাবেন — ধাপ (প্রতি লাইনে একটি; “উপরের মেনু বেছে নিন” লাইনটি মেথডের মেনু নামে বদলে যায়)', true],
  ['trxLabel', 'TrxID ইনপুটের লেবেল', false],
  ['trxHelpText', 'TrxID সাহায্য লিংকের লেখা', false],
  ['trxHelpUrl', 'TrxID সাহায্য লিংক (URL, খালি রাখলে নির্দেশনা টগল করে)', false],
  ['trxPlaceholder', 'TrxID ইনপুটের placeholder', false],
  ['trxPattern', 'TrxID ফরম্যাট (regex, খালি রাখলে যেকোনো লেখা চলবে)', false],
  ['confirmTitle', 'নিশ্চিতকরণ ডায়ালগের শিরোনাম', false],
  ['confirmText', 'নিশ্চিতকরণ ডায়ালগের লেখা', true],
  ['cautionTitle', 'সতর্কতা ব্লকের শিরোনাম', false],
  ['cautionText', 'সতর্কতা ব্লকের লেখা', true],
  ['successTitle', 'সফল স্ক্রিনের শিরোনাম', false],
  ['successText', 'সফল স্ক্রিনের লেখা', true],
  ['promoTitle', 'প্রমোশন সেকশনের শিরোনাম (খালি রাখলে সেকশন থাকবে না)', false],
  ['promoText', 'প্রমোশন সেকশনের লেখা', true],
];

const WITHDRAW_TEXTS: [keyof CashierConfig['withdraw'], string, boolean][] = [
  ['processingTime', 'উত্তোলন সময় (যেমন: ২৪ ঘন্টা)', false],
  ['reminder', 'সৌজন্যমূলক স্মরণিকা', true],
  ['walletsTitle', 'সংরক্ষিত ওয়ালেট সেকশনের শিরোনাম', false],
  ['emptyWalletsText', 'ওয়ালেট না থাকলে যে লেখা', false],
  ['amountLabel', 'পরিমাণ সেকশনের শিরোনাম', false],
  ['passwordLabel', 'পাসওয়ার্ড ফিল্ডের লেবেল', false],
  ['passwordHint', 'পাসওয়ার্ড ফিল্ডের নিচের ইঙ্গিত', false],
  ['note', 'বাটনের নিচের নোট', true],
];

const blankDeposit = (channelId: string): DepositMethod => ({
  id: '', name: '', channelId, payType: 'transfer', bonusLabel: '', bonusPercent: 0,
  icon: '💳', color: '#0f766e', tag: 'GATEWAY', min: 300, max: 30000, trxRequired: true, note: '', active: true,
});

const blankWithdraw = (channelId: string): WithdrawMethod => ({
  id: '', name: '', channelId, icon: '💳', color: '#0f766e', min: 500, max: 50000, accountHint: '01XXXXXXXXX', active: true,
});

export default function CashierConfigControl({ initial, channels }: { initial: CashierConfig; channels: Channel[] }) {
  const [saved, setSaved] = useState(initial);
  const [form, setForm] = useState(initial);
  const [side, setSide] = useState<Side>('deposit');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const setDep = (patch: Partial<CashierConfig['deposit']>) =>
    setForm((f) => ({ ...f, deposit: { ...f.deposit, ...patch } }));
  const setWd = (patch: Partial<CashierConfig['withdraw']>) =>
    setForm((f) => ({ ...f, withdraw: { ...f.withdraw, ...patch } }));

  const patchDepMethod = (i: number, patch: Partial<DepositMethod>) =>
    setDep({ methods: form.deposit.methods.map((m, j) => (j === i ? { ...m, ...patch } : m)) });
  const patchWdMethod = (i: number, patch: Partial<WithdrawMethod>) =>
    setWd({ methods: form.withdraw.methods.map((m, j) => (j === i ? { ...m, ...patch } : m)) });
  const patchAmount = (i: number, patch: Partial<AmountPreset>) =>
    setDep({ amounts: form.deposit.amounts.map((a, j) => (j === i ? { ...a, ...patch } : a)) });

  const move = <T,>(list: T[], i: number, dir: -1 | 1): T[] => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return list;
    const out = [...list];
    [out[i], out[j]] = [out[j], out[i]];
    return out;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/admin/cashier-config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ deposit: form.deposit, withdraw: form.withdraw }),
      });
      const data = (await res.json()) as
        | { ok: true; config: CashierConfig }
        | { ok: false; reason: string; field?: string };
      if (!data.ok) {
        setError((ERROR_LABEL[data.reason] ?? `সমস্যা হয়েছে (${data.reason})`) + (data.field ? ` (${data.field})` : ''));
        return;
      }
      setSaved(data.config);
      setForm(data.config);
      setNotice('ক্যাশিয়ার সেভ হয়েছে — সাইটে এখনই কার্যকর।');
    } catch {
      setError('সার্ভারে পৌঁছানো গেল না — আবার চেষ্টা করুন।');
    } finally {
      setBusy(false);
    }
  }

  const num = (value: number) => (Number.isFinite(value) ? value : '');

  return (
    <form onSubmit={submit}>
      <div className="adm__seg">
        <button type="button" className={side === 'deposit' ? 'on' : ''} onClick={() => setSide('deposit')}>ডিপোজিট</button>
        <button type="button" className={side === 'withdraw' ? 'on' : ''} onClick={() => setSide('withdraw')}>উইথড্র</button>
      </div>

      {side === 'deposit' && (
        <>
          <div className="adm__card">
            <h2 className="adm__cardh">ডিপোজিট মেথড</h2>
            <div className="adm__tablewrap" style={{ marginBottom: 6 }}>
              <table className="adm__table adm__table--edit">
                <thead>
                  <tr>
                    <th>ক্রম</th><th>নাম</th><th>চ্যানেল (নাম্বার)</th><th>মেনু</th><th>বোনাস লেবেল</th><th>বোনাস %</th>
                    <th>আইকন</th><th>রং</th><th>ট্যাগ</th><th>সর্বনিম্ন</th><th>সর্বোচ্চ</th><th>TrxID</th><th>চালু</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {form.deposit.methods.map((m, i) => (
                    <tr key={i}>
                      <td>
                        <button type="button" className="adm__mini adm__iconbtn" onClick={() => setDep({ methods: move(form.deposit.methods, i, -1) })} aria-label="উপরে">↑</button>
                        <button type="button" className="adm__mini adm__iconbtn" onClick={() => setDep({ methods: move(form.deposit.methods, i, 1) })} aria-label="নিচে">↓</button>
                      </td>
                      <td><input className="adm__mini" style={{ width: 150 }} value={m.name} disabled={busy} onChange={(e) => patchDepMethod(i, { name: e.target.value })} /></td>
                      <td>
                        <select className="adm__mini" value={m.channelId} disabled={busy} onChange={(e) => patchDepMethod(i, { channelId: e.target.value })}>
                          {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </td>
                      <td>
                        <select className="adm__mini" value={m.payType} disabled={busy} onChange={(e) => patchDepMethod(i, { payType: e.target.value as PayType })}>
                          {PAY_TYPES.map((p) => <option key={p} value={p}>{PAY_TYPE_LABEL[p]}</option>)}
                        </select>
                      </td>
                      <td><input className="adm__mini" style={{ width: 110 }} value={m.bonusLabel} placeholder="+10% বোনাস" disabled={busy} onChange={(e) => patchDepMethod(i, { bonusLabel: e.target.value })} /></td>
                      <td><input className="adm__mini" type="number" min={0} max={100} style={{ width: 62 }} value={num(m.bonusPercent)} disabled={busy} onChange={(e) => patchDepMethod(i, { bonusPercent: Number(e.target.value) })} /></td>
                      <td><input className="adm__mini" style={{ width: 70 }} value={m.icon} placeholder="🅱️ বা /path.png" disabled={busy} onChange={(e) => patchDepMethod(i, { icon: e.target.value })} /></td>
                      <td><input className="adm__mini" type="color" style={{ width: 44, padding: 2 }} value={/^#[0-9a-f]{6}$/i.test(m.color) ? m.color : '#0f766e'} disabled={busy} onChange={(e) => patchDepMethod(i, { color: e.target.value })} /></td>
                      <td><input className="adm__mini" style={{ width: 84 }} value={m.tag} placeholder="GATEWAY" disabled={busy} onChange={(e) => patchDepMethod(i, { tag: e.target.value })} /></td>
                      <td><input className="adm__mini" type="number" min={0} style={{ width: 80 }} value={num(m.min)} disabled={busy} onChange={(e) => patchDepMethod(i, { min: Number(e.target.value) })} /></td>
                      <td><input className="adm__mini" type="number" min={0} style={{ width: 96 }} value={num(m.max)} disabled={busy} onChange={(e) => patchDepMethod(i, { max: Number(e.target.value) })} /></td>
                      <td>
                        <select className="adm__mini" value={m.trxRequired ? '1' : '0'} disabled={busy} onChange={(e) => patchDepMethod(i, { trxRequired: e.target.value === '1' })}>
                          <option value="1">লাগবে</option><option value="0">ঐচ্ছিক</option>
                        </select>
                      </td>
                      <td>
                        <select className="adm__mini" value={m.active ? '1' : '0'} disabled={busy} onChange={(e) => patchDepMethod(i, { active: e.target.value === '1' })}>
                          <option value="1">হ্যাঁ</option><option value="0">বন্ধ</option>
                        </select>
                      </td>
                      <td><button type="button" className="adm__mini adm__iconbtn adm__iconbtn--danger" disabled={busy} onClick={() => setDep({ methods: form.deposit.methods.filter((_, j) => j !== i) })} aria-label="মুছুন">✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {form.deposit.methods.map((m, i) => (
              <label className="adm__f adm__f--wide" key={`note-${i}`} style={{ marginBottom: 8 }}>
                <span>{m.name || `মেথড ${i + 1}`} — মেথড বাছলে নিচে যে লেখা দেখাবে</span>
                <input value={m.note} disabled={busy} maxLength={300} onChange={(e) => patchDepMethod(i, { note: e.target.value })} />
              </label>
            ))}
            <button type="button" className="btn btn--ghost" disabled={busy || form.deposit.methods.length >= 20}
                    onClick={() => setDep({ methods: [...form.deposit.methods, blankDeposit(channels[0].id)] })}>
              + মেথড যোগ করুন
            </button>
            <p className="adm__hint">
              “মেনু” বলে দেয় প্লেয়ার bKash/Nagad অ্যাপে কোন অপশন ব্যবহার করবে — পেমেন্ট হলে
              মার্চেন্ট নাম্বার, ক্যাশ আউট হলে এজেন্ট নাম্বার, সেন্ড মানি হলে পার্সোনাল নাম্বার
              দেখানো হয় (পেমেন্ট ট্যাবে ঐ ধরনের নাম্বার না থাকলে চ্যানেলের যেকোনো চালু নাম্বার)।
              আইকনে ইমোজি অথবা ছবির লিংক দিন।
            </p>
          </div>

          <div className="adm__card">
            <h2 className="adm__cardh">অংকের চিপ</h2>
            <div className="adm__tablewrap" style={{ marginBottom: 6 }}>
              <table className="adm__table" style={{ minWidth: 0 }}>
                <thead><tr><th>পরিমাণ (৳)</th><th>বোনাস ব্যাজ</th><th></th></tr></thead>
                <tbody>
                  {form.deposit.amounts.map((a, i) => (
                    <tr key={i}>
                      <td><input className="adm__mini" type="number" min={1} style={{ width: 110 }} value={num(a.amount)} disabled={busy} onChange={(e) => patchAmount(i, { amount: Number(e.target.value) })} /></td>
                      <td><input className="adm__mini" style={{ width: 110 }} value={a.bonusLabel} placeholder="+50" disabled={busy} onChange={(e) => patchAmount(i, { bonusLabel: e.target.value })} /></td>
                      <td><button type="button" className="adm__mini adm__iconbtn adm__iconbtn--danger" disabled={busy} onClick={() => setDep({ amounts: form.deposit.amounts.filter((_, j) => j !== i) })} aria-label="মুছুন">✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className="btn btn--ghost" disabled={busy || form.deposit.amounts.length >= 12}
                    onClick={() => setDep({ amounts: [...form.deposit.amounts, { amount: 0, bonusLabel: '' }] })}>
              + চিপ যোগ করুন
            </button>
            <p className="adm__hint">সেভ করলে ছোট থেকে বড় ক্রমে সাজিয়ে রাখা হয়। ব্যাজ খালি রাখলে দেখাবে না।</p>
          </div>

          <div className="adm__card">
            <h2 className="adm__cardh">লেখা ও নির্দেশনা</h2>
            <div className="adm__formgrid">
              {DEPOSIT_TEXTS.map(([key, label, long]) => (
                <label className={`adm__f${long ? ' adm__f--wide' : ''}`} key={key}>
                  <span>{label}</span>
                  {long
                    ? <textarea value={String(form.deposit[key])} disabled={busy} onChange={(e) => setDep({ [key]: e.target.value })} />
                    : <input value={String(form.deposit[key])} disabled={busy} onChange={(e) => setDep({ [key]: e.target.value })} />}
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      {side === 'withdraw' && (
        <>
          <div className="adm__card">
            <h2 className="adm__cardh">উইথড্র মেথড</h2>
            <div className="adm__tablewrap" style={{ marginBottom: 6 }}>
              <table className="adm__table adm__table--edit">
                <thead>
                  <tr><th>ক্রম</th><th>নাম</th><th>চ্যানেল</th><th>আইকন</th><th>রং</th><th>সর্বনিম্ন</th><th>সর্বোচ্চ</th><th>নাম্বারের ইঙ্গিত</th><th>চালু</th><th></th></tr>
                </thead>
                <tbody>
                  {form.withdraw.methods.map((m, i) => (
                    <tr key={i}>
                      <td>
                        <button type="button" className="adm__mini adm__iconbtn" onClick={() => setWd({ methods: move(form.withdraw.methods, i, -1) })} aria-label="উপরে">↑</button>
                        <button type="button" className="adm__mini adm__iconbtn" onClick={() => setWd({ methods: move(form.withdraw.methods, i, 1) })} aria-label="নিচে">↓</button>
                      </td>
                      <td><input className="adm__mini" style={{ width: 130 }} value={m.name} disabled={busy} onChange={(e) => patchWdMethod(i, { name: e.target.value })} /></td>
                      <td>
                        <select className="adm__mini" value={m.channelId} disabled={busy} onChange={(e) => patchWdMethod(i, { channelId: e.target.value })}>
                          {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </td>
                      <td><input className="adm__mini" style={{ width: 70 }} value={m.icon} disabled={busy} onChange={(e) => patchWdMethod(i, { icon: e.target.value })} /></td>
                      <td><input className="adm__mini" type="color" style={{ width: 44, padding: 2 }} value={/^#[0-9a-f]{6}$/i.test(m.color) ? m.color : '#0f766e'} disabled={busy} onChange={(e) => patchWdMethod(i, { color: e.target.value })} /></td>
                      <td><input className="adm__mini" type="number" min={0} style={{ width: 80 }} value={num(m.min)} disabled={busy} onChange={(e) => patchWdMethod(i, { min: Number(e.target.value) })} /></td>
                      <td><input className="adm__mini" type="number" min={0} style={{ width: 96 }} value={num(m.max)} disabled={busy} onChange={(e) => patchWdMethod(i, { max: Number(e.target.value) })} /></td>
                      <td><input className="adm__mini" style={{ width: 120 }} value={m.accountHint} disabled={busy} onChange={(e) => patchWdMethod(i, { accountHint: e.target.value })} /></td>
                      <td>
                        <select className="adm__mini" value={m.active ? '1' : '0'} disabled={busy} onChange={(e) => patchWdMethod(i, { active: e.target.value === '1' })}>
                          <option value="1">হ্যাঁ</option><option value="0">বন্ধ</option>
                        </select>
                      </td>
                      <td><button type="button" className="adm__mini adm__iconbtn adm__iconbtn--danger" disabled={busy} onClick={() => setWd({ methods: form.withdraw.methods.filter((_, j) => j !== i) })} aria-label="মুছুন">✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className="btn btn--ghost" disabled={busy || form.withdraw.methods.length >= 20}
                    onClick={() => setWd({ methods: [...form.withdraw.methods, blankWithdraw(channels[0].id)] })}>
              + মেথড যোগ করুন
            </button>
          </div>

          <div className="adm__card">
            <h2 className="adm__cardh">নিয়ম</h2>
            <div className="adm__formgrid">
              <label className="adm__f">
                <span>দৈনিক উত্তোলন (বার, ০ = সীমা নেই)</span>
                <input type="number" min={0} max={999} value={num(form.withdraw.dailyLimit)} disabled={busy} onChange={(e) => setWd({ dailyLimit: Number(e.target.value) })} />
              </label>
              <label className="adm__f">
                <span>প্রতি মেথডে সর্বোচ্চ সংরক্ষিত ওয়ালেট</span>
                <input type="number" min={1} max={20} value={num(form.withdraw.maxWallets)} disabled={busy} onChange={(e) => setWd({ maxWallets: Number(e.target.value) })} />
              </label>
            </div>
          </div>

          <div className="adm__card">
            <h2 className="adm__cardh">লেখা</h2>
            <div className="adm__formgrid">
              {WITHDRAW_TEXTS.map(([key, label, long]) => (
                <label className={`adm__f${long ? ' adm__f--wide' : ''}`} key={key}>
                  <span>{label}</span>
                  {long
                    ? <textarea value={String(form.withdraw[key])} disabled={busy} onChange={(e) => setWd({ [key]: e.target.value })} />
                    : <input value={String(form.withdraw[key])} disabled={busy} onChange={(e) => setWd({ [key]: e.target.value })} />}
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      {error && <p className="adm__err">{error}</p>}
      {notice && <p className="adm__note">{notice}</p>}

      <div className="adm__actions">
        <button type="submit" className="btn btn--gold" disabled={busy}>{busy ? 'সেভ হচ্ছে…' : 'সেভ করুন'}</button>
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => { setForm(saved); setError(''); setNotice(''); }}>বাতিল</button>
      </div>
      {saved.updatedAt && <p className="adm__hint">শেষ সেভ: {new Date(saved.updatedAt).toLocaleString('bn-BD')}</p>}
    </form>
  );
}
