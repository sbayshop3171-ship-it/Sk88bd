'use client';

import { Fragment, useState } from 'react';
import { toPaisa, toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';
import type { PlayerRow } from '@/lib/cashier';

const ERROR_LABEL: Record<string, string> = {
  forbidden: 'You are not allowed to change balances or block players.',
  'invalid-amount': 'Enter an amount — zero will not do.',
  'amount-too-large': 'A single adjustment can be at most ৳100,000.',
  'invalid-user': 'Player not found.',
  unauthorized: 'Your session has expired — log in again.',
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
        setError(data.message ?? ERROR_LABEL[data.reason] ?? `Could not load (${data.reason})`);
        return;
      }
      setPlayers(data.players);
    } catch {
      setError('Could not reach the server.');
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
        setError(data.message ?? ERROR_LABEL[data.reason] ?? `That did not work (${data.reason})`);
        return false;
      }
      setPlayers(data.players);
      setNotice(okMessage);
      return true;
    } catch {
      setError('Could not reach the server.');
      return false;
    } finally {
      setBusyId('');
    }
  }

  async function adjust(player: PlayerRow, sign: 1 | -1) {
    const taka = Number(amount);
    if (!Number.isFinite(taka) || taka <= 0) {
      setError('Enter how much to adjust.');
      return;
    }

    const ok = await send(
      player.id,
      { action: 'adjust', amount: sign * toPaisa(taka), note },
      sign > 0
        ? `${money(taka)} added to ${player.phone}'s balance.`
        : `${money(taka)} taken off ${player.phone}'s balance.`,
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
        The database is not connected. Put the Supabase keys in <code>.env.local</code> and
        restart the server to see the player list — the code is all here.
      </p>
    );
  }

  const totalBalance = players.reduce((sum, p) => sum + p.balance, 0);
  const blocked = players.filter((p) => p.isBlocked).length;

  return (
    <>
      <div className="adm__tiles" style={{ marginBottom: 14 }}>
        <div className="adm__tile"><b>{players.length}</b><small>In this list</small></div>
        <div className="adm__tile"><b>{money(toTaka(totalBalance))}</b><small>Total balance</small></div>
        <div className="adm__tile"><b>{blocked}</b><small>Blocked</small></div>
      </div>

      <form
        className="adm__card"
        onSubmit={(e) => { e.preventDefault(); void load(search); }}
      >
        <div className="adm__formgrid">
          <label className="adm__f adm__f--wide">
            <span>Search by phone number or name</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="01XXXXXXXXX" />
          </label>
        </div>
        <div className="adm__actions">
          <button type="submit" className="btn btn--gold">Search</button>
          {search && (
            <button type="button" className="btn btn--ghost" onClick={() => { setSearch(''); void load(''); }}>
              Show all
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
              <th>Phone</th><th>Name</th><th>Balance</th><th>Bonus</th>
              <th>VIP</th><th>Referral code</th><th>Agent</th><th>Registered</th><th>Status</th>
              {canWrite && <th></th>}
            </tr>
          </thead>
          <tbody>
            {players.length === 0 ? (
              <tr><td colSpan={canWrite ? 10 : 9} className="adm__empty">No players.</td></tr>
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
                          ? <span className="adm__miss">Blocked</span>
                          : <span className="adm__ok">Active</span>}
                      </td>
                      {canWrite && (
                      <td className="adm__rowacts">
                        <button
                          type="button" className="btn btn--ghost" disabled={busy}
                          onClick={() => { setOpenId(openId === p.id ? '' : p.id); setAmount(''); setNote(''); }}
                        >
                          Balance
                        </button>
                        <button
                          type="button" className={`btn btn--ghost${p.isBlocked ? '' : ' adm__danger'}`}
                          disabled={busy}
                          onClick={() => void send(
                            p.id,
                            { action: 'block', blocked: !p.isBlocked },
                            p.isBlocked ? `${p.phone} unblocked.` : `${p.phone} blocked.`,
                          )}
                        >
                          {p.isBlocked ? 'Unblock' : 'Block'}
                        </button>
                      </td>
                      )}
                    </tr>

                    {canWrite && openId === p.id && (
                      <tr className="adm__subrow">
                        <td colSpan={10}>
                          <div className="adm__adjust">
                            <label className="adm__f">
                              <span>Amount (৳)</span>
                              <input
                                type="number" min={1} value={amount} disabled={busy}
                                onChange={(e) => setAmount(e.target.value)} placeholder="500"
                              />
                            </label>
                            <label className="adm__f">
                              <span>Reason</span>
                              <input
                                value={note} disabled={busy}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="e.g. bonus, correcting a mistake"
                              />
                            </label>
                            <div className="adm__rowacts">
                              <button type="button" className="btn btn--gold" disabled={busy}
                                      onClick={() => void adjust(p, 1)}>
                                Add
                              </button>
                              <button type="button" className="btn btn--ghost adm__danger" disabled={busy}
                                      onClick={() => void adjust(p, -1)}>
                                Deduct
                              </button>
                            </div>
                          </div>
                          <p className="adm__hint">
                            Every adjustment is written to the ledger — who did it, and why.
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
