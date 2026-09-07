'use client';

import { useState } from 'react';
import {
  CHARGE_BASIS_LABEL,
  PAY_TYPE_LABEL,
  type AmountPreset,
  type ChargeBasis,
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
  ['noticeTitle', 'সর্বনিম্ন ডিপোজিট নোটিশের শিরোনাম (খালি রাখলে নোটিশ দেখাবে না)', false],
  ['noticeText', 'সর্বনিম্ন ডিপোজিট নোটিশের লেখা — {min} ও {max} লিখলে বাছাই করা মেথডের লিমিট বসে যাবে', true],
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
  ['chargeTitle', 'উত্তোলন চার্জ কার্ডের শিরোনাম (খালি রাখলে কার্ড দেখাবে না)', false],
  ['chargeText', 'চার্জের ব্যাখ্যা — {rate} লিখলে প্রতি ১,০০০ টাকার চার্জ বসে যাবে', true],
  ['chargeWarning', 'চার্জ না দিলে কী হবে — লাল সতর্কবার্তা', true],
  ['processingTime', 'উত্তোলন সময় (যেমন: ২৪ ঘন্টা)', false],
  ['walletsTitle', 'সংরক্ষিত ওয়ালেট সেকশনের শিরোনাম', false],
  ['reminder', 'সৌজন্যমূলক স্মরণিকা', true],
  ['emptyWalletsText', 'ওয়ালেট না থাকলে যে লেখা', false],
  ['amountLabel', 'পরিমাণ সেকশনের শিরোনাম', false],
  ['passwordLabel', 'পাসওয়ার্ড ফিল্ডের লেবেল', false],
  ['passwordHint', 'পাসওয়ার্ড ফিল্ডের নিচের ইঙ্গিত', false],
  ['note', 'বাটনের নিচের নোট', true],
];

/** Step 2 (the summary the player confirms) and step 3 (paying the charge to
    an agent number) — kept apart from the plain withdraw copy so the admin
    form does not read as one long wall of inputs. */
const CHARGE_TEXTS: [keyof CashierConfig['withdraw'], string, boolean][] = [
  ['summaryTitle', 'সারাংশ স্ক্রিনের শিরোনাম', false],
  ['summaryWarning', 'সারাংশের উপরের লাল সতর্কবার্তা', true],
  ['chargeLabel', 'চার্জের অংকের উপরের লেবেল', false],
  ['rulesTitle', 'নিয়মাবলী বক্সের শিরোনাম', false],
  ['rules', 'নিয়মাবলী — প্রতি লাইনে একটি নিয়ম। লাইনের শুরুতে ! দিলে লাল রঙে দেখাবে। {rate} {max} {min} {time} {charge} {balance} {amount} বসানো যাবে', true],
  ['applyLabel', 'সারাংশের বাটনের লেখা', false],
  ['payTitle', 'চার্জ পরিশোধ স্ক্রিনের শিরোনাম', false],
  ['payWarning', 'চার্জ পরিশোধ স্ক্রিনের উপরের লাল লেখা', true],
  ['agentNote', 'এজেন্ট নাম্বারের নিচের ছোট লেখা', false],
  ['chargeExactNote', 'চার্জের অংকের নিচের ছোট লেখা', false],
  ['guideTitle', 'নির্দেশনা বক্সের শিরোনাম', false],
  ['guideLines', 'নির্দেশনা — প্রতি লাইনে একটি পয়েন্ট ({charge} বসানো যাবে)', true],
  ['chargeTrxLabel', 'চার্জের TrxID ইনপুটের লেবেল', false],
  ['chargeTrxPlaceholder', 'চার্জের TrxID ইনপুটের placeholder', false],
  ['chargeCaution', 'চার্জ স্ক্রিনের নিচের সতর্কতা', true],
];

/* The bonus a method advertises and the bonus it actually credits are two
   separate fields — a label the admin types, and the percent the cashier
   applies. Nothing stops them drifting apart, and when they do the player is
   promised one number and paid another. So the label's own digits are read
   back and checked against the percent. Bengali numerals count: the label is
   written in them. */
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const toLatinDigits = (v: string) =>
  v.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));

/** The percent a label claims, or null when it names no number at all. */
function claimedPercent(label: string): number | null {
  const m = toLatinDigits(label).match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? Number(m[1]) : null;
}

/** Set when the label promises a percent the cashier will not pay. */
function bonusMismatch(label: string, percent: number): string | null {
  const claim = claimedPercent(label);
  if (claim === null || claim === percent) return null;
  return `লেবেলে ${claim}% লেখা, কিন্তু দেওয়া হবে ${percent}%`;
}

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
                      <td>
                        <input
                          className={`adm__mini${bonusMismatch(m.bonusLabel, m.bonusPercent) ? ' adm__mini--bad' : ''}`}
                          style={{ width: 110 }}
                          value={m.bonusLabel}
                          placeholder={m.bonusPercent > 0 ? `+${m.bonusPercent}% বোনাস` : 'বোনাস নেই'}
                          disabled={busy}
                          onChange={(e) => patchDepMethod(i, { bonusLabel: e.target.value })}
                        />
                        {bonusMismatch(m.bonusLabel, m.bonusPercent) && (
                          <em className="adm__warn">⚠ {bonusMismatch(m.bonusLabel, m.bonusPercent)}</em>
                        )}
                      </td>
                      <td>
                        <input
                          className={`adm__mini${bonusMismatch(m.bonusLabel, m.bonusPercent) ? ' adm__mini--bad' : ''}`}
                          type="number" min={0} max={100} style={{ width: 62 }}
                          value={num(m.bonusPercent)}
                          disabled={busy}
                          onChange={(e) => patchDepMethod(i, { bonusPercent: Number(e.target.value) })}
                        />
                      </td>
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
              <label className="adm__f">
                <span>উত্তোলন চার্জ — প্রতি ১,০০০ টাকায় (৳, ০ = চার্জ নেই)</span>
                <input type="number" min={0} max={1000} value={num(form.withdraw.chargePerThousand)} disabled={busy} onChange={(e) => setWd({ chargePerThousand: Number(e.target.value) })} />
              </label>
              <label className="adm__f">
                <span>চার্জ কিসের উপর হিসাব হবে</span>
                <select value={form.withdraw.chargeBasis} disabled={busy} onChange={(e) => setWd({ chargeBasis: e.target.value as ChargeBasis })}>
                  {(Object.keys(CHARGE_BASIS_LABEL) as ChargeBasis[]).map((b) => (
                    <option key={b} value={b}>{CHARGE_BASIS_LABEL[b]}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className="adm__hint">
              চার্জ প্লেয়ারের উত্তোলনের পরিমাণ অনুযায়ী হিসাব হয় — {form.withdraw.chargePerThousand} ৳ প্রতি ১,০০০ টাকায়,
              অর্থাৎ ৳১,০০০ এ ৳{form.withdraw.chargePerThousand} আর ৳৫,০০০ এ
              ৳{form.withdraw.chargePerThousand * 5}। “{CHARGE_BASIS_LABEL[form.withdraw.chargeBasis]}”
              বেছে নিলে হিসাবটা {form.withdraw.chargeBasis === 'balance'
                ? 'প্লেয়ারের পুরো ওয়ালেট ব্যালেন্স ধরে হয় — সে যত টাকাই তুলুক'
                : 'শুধু সে যত টাকা তুলতে চাইছে তার উপর হয়'}। ০ দিলে চার্জের ধাপটি একেবারে উঠে যাবে
              এবং রিকোয়েস্ট সরাসরি জমা হবে।
            </p>
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

          <div className="adm__card">
            <h2 className="adm__cardh">সারাংশ ও চার্জ পরিশোধ স্ক্রিন</h2>
            <p className="adm__hint" style={{ marginTop: 0 }}>
              রিকোয়েস্ট দেওয়ার পর প্লেয়ার দুইটি স্ক্রিন দেখে — কত চার্জ লাগবে তার সারাংশ,
              তারপর কোন এজেন্ট নাম্বারে চার্জ পাঠাতে হবে সেই পাতা। এজেন্ট নাম্বার আসে
              <b> অ্যাডমিন → পেমেন্ট</b> এর “এজেন্ট” ধরনের নাম্বার থেকে, তাই ওখানে অন্তত
              একটি এজেন্ট নাম্বার চালু রাখতে হবে।
            </p>
            <div className="adm__formgrid">
              {CHARGE_TEXTS.map(([key, label, long]) => (
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
