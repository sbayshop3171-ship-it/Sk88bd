'use client';

import { Fragment, useState } from 'react';
import { toPaisa, toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';
import type { PlayerRow } from '@/lib/cashier';

const ERROR_LABEL: Record<string, string> = {
  forbidden: 'ব্যালেন্স বা ব্লক বদলানোর অনুমতি আপনার নেই।',
  'invalid-amount': 'পরিমাণ দিন — শূন্য চলবে না।',
  'amount-too-large': 'এক বারে সর্বোচ্চ ৳১,০০,০০০ পর্যন্ত সমন্বয় করা যায়।',
  'invalid-user': 'প্লেয়ার পাওয়া যায়নি।',
  unauthorized: 'সেশন শেষ হয়ে গেছে — আবার লগইন করুন।',
};

export default function PlayerControl({
  initialPlayers,
  backendReady,
  canWrite,
}: {
  initialPlayers: PlayerRow[];
  backendReady: boolean;
  /** false for an agent: they look players up while answering a cashier
      request, they do not move balances or block anybody. */
  canWrite: boolean;
}) {
  const [players, setPlayers] = useState(initialPlayers);
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load(term: string) {
    setError('');
    setNotice('');
    try {
      const res = await fetch(`/api/admin/players?search=${encodeURIComponent(term)}`, {
        cache: 'no-store',
      });
      const data = (await res.json()) as
        | { ok: true; players: PlayerRow[] }
        | { ok: false; reason: string; message?: string };
      if (!data.ok) {
        setError(data.message ?? ERROR_LABEL[data.reason] ?? `লোড হয়নি (${data.reason})`);
        return;
      }
      setPlayers(data.players);
    } catch {
      setError('সার্ভারে পৌঁছানো গেল না।');
    }
  }

  async function send(userId: string, body: Record<string, unknown>, okMessage: string) {
    setBusyId(userId);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/admin/players', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId, search, ...body }),
      });
      const data = (await res.json()) as
        | { ok: true; players: PlayerRow[] }
        | { ok: false; reason: string; message?: string };

      if (!data.ok) {
        setError(data.message ?? ERROR_LABEL[data.reason] ?? `কাজ হয়নি (${data.reason})`);
        return false;
      }
      setPlayers(data.players);
      setNotice(okMessage);
      return true;
    } catch {
      setError('সার্ভারে পৌঁছানো গেল না।');
      return false;
    } finally {
      setBusyId('');
    }
  }

  async function adjust(player: PlayerRow, sign: 1 | -1) {
    const taka = Number(amount);
    if (!Number.isFinite(taka) || taka <= 0) {
      setError('কত টাকা সমন্বয় করবেন লিখুন।');
      return;
    }

    const ok = await send(
      player.id,
      { action: 'adjust', amount: sign * toPaisa(taka), note },
      sign > 0
        ? `${player.phone} এর ব্যালেন্সে ${money(taka)} যোগ হয়েছে।`
        : `${player.phone} এর ব্যালেন্স থেকে ${money(taka)} কাটা হয়েছে।`,
    );
    if (ok) {
      setAmount('');
      setNote('');
      setOpenId('');
    }
  }

  if (!backendReady) {
    return (
      <p className="adm__warn">
        ডেটাবেস যুক্ত হয়নি। <code>.env.local</code> এ Supabase কী বসিয়ে সার্ভার
        রিস্টার্ট করলেই প্লেয়ার তালিকা দেখা যাবে — কোড সম্পূর্ণ তৈরি আছে।
      </p>
    );
  }

  const totalBalance = players.reduce((sum, p) => sum + p.balance, 0);
  const blocked = players.filter((p) => p.isBlocked).length;

  return (
    <>
      <div className="adm__tiles" style={{ marginBottom: 14 }}>
        <div className="adm__tile"><b>{players.length}</b><small>এই তালিকায়</small></div>
        <div className="adm__tile"><b>{money(toTaka(totalBalance))}</b><small>মোট ব্যালেন্স</small></div>
        <div className="adm__tile"><b>{blocked}</b><small>ব্লক করা</small></div>
      </div>

      <form
        className="adm__card"
        onSubmit={(e) => { e.preventDefault(); void load(search); }}
      >
        <div className="adm__formgrid">
          <label className="adm__f adm__f--wide">
            <span>ফোন নাম্বার বা নাম দিয়ে খুঁজুন</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="01XXXXXXXXX" />
          </label>
        </div>
        <div className="adm__actions">
          <button type="submit" className="btn btn--gold">খুঁজুন</button>
          {search && (
            <button type="button" className="btn btn--ghost" onClick={() => { setSearch(''); void load(''); }}>
              সব দেখুন
            </button>
          )}
        </div>
      </form>

      {error && <p className="adm__err">{error}</p>}
      {notice && <p className="adm__note">{notice}</p>}

      <div className="adm__tablewrap">
        <table className="adm__table">
          <thead>
            <tr>
              <th>ফোন</th><th>নাম</th><th>ব্যালেন্স</th><th>বোনাস</th>
              <th>VIP</th><th>রেফার কোড</th><th>এজেন্ট</th><th>রেজিস্ট্রেশন</th><th>অবস্থা</th>
              {canWrite && <th></th>}
            </tr>
          </thead>
          <tbody>
            {players.length === 0 ? (
              <tr><td colSpan={canWrite ? 10 : 9} className="adm__empty">কোনো প্লেয়ার নেই।</td></tr>
            ) : (
              players.map((p) => {
                const busy = busyId === p.id;
                return (
                  <Fragment key={p.id}>
                    <tr>
                      <td>{p.phone}</td>
                      <td className="adm__muted">{p.displayName || '—'}</td>
                      <td><b style={{ color: 'var(--gold)' }}>{money(toTaka(p.balance))}</b></td>
                      <td className="adm__muted">{money(toTaka(p.bonusBalance))}</td>
                      <td>{p.vipLevel}</td>
                      <td><code>{p.referralCode}</code></td>
                      <td>
                        {p.agentCode
                          ? <code>{p.agentCode}</code>
                          : <span className="adm__muted">—</span>}
                      </td>
                      <td className="adm__muted">{new Date(p.createdAt).toLocaleDateString('en-GB')}</td>
                      <td>
                        {p.isBlocked
                          ? <span className="adm__miss">ব্লক</span>
                          : <span className="adm__ok">সক্রিয়</span>}
                      </td>
                      {canWrite && (
                      <td className="adm__rowacts">
                        <button
                          type="button" className="btn btn--ghost" disabled={busy}
                          onClick={() => { setOpenId(openId === p.id ? '' : p.id); setAmount(''); setNote(''); }}
                        >
                          ব্যালেন্স
                        </button>
                        <button
                          type="button" className={`btn btn--ghost${p.isBlocked ? '' : ' adm__danger'}`}
                          disabled={busy}
                          onClick={() => void send(
                            p.id,
                            { action: 'block', blocked: !p.isBlocked },
                            p.isBlocked ? `${p.phone} আনব্লক হয়েছে।` : `${p.phone} ব্লক হয়েছে।`,
                          )}
                        >
                          {p.isBlocked ? 'আনব্লক' : 'ব্লক'}
                        </button>
                      </td>
                      )}
                    </tr>

                    {canWrite && openId === p.id && (
                      <tr className="adm__subrow">
                        <td colSpan={10}>
                          <div className="adm__adjust">
                            <label className="adm__f">
                              <span>পরিমাণ (৳)</span>
                              <input
                                type="number" min={1} value={amount} disabled={busy}
                                onChange={(e) => setAmount(e.target.value)} placeholder="500"
                              />
                            </label>
                            <label className="adm__f">
                              <span>কারণ</span>
                              <input
                                value={note} disabled={busy}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="যেমন: বোনাস, ভুল সংশোধন"
                              />
                            </label>
                            <div className="adm__rowacts">
                              <button type="button" className="btn btn--gold" disabled={busy}
                                      onClick={() => void adjust(p, 1)}>
                                যোগ করুন
                              </button>
                              <button type="button" className="btn btn--ghost adm__danger" disabled={busy}
                                      onClick={() => void adjust(p, -1)}>
                                কাটুন
                              </button>
                            </div>
                          </div>
                          <p className="adm__hint">
                            প্রতিটি সমন্বয় লেজারে লেখা থাকে — কে করেছে, কেন করেছে।
                          </p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
