'use client';

import { Fragment, useState } from 'react';
import { toPaisa, toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';
import type { PlayerRow } from '@/lib/cashier';

const ERROR_LABEL: Record<string, string> = {
  forbidden: 'You are not allowed to change balances, hold or ban players.',
  'invalid-amount': 'Enter an amount — zero will not do.',
  'amount-too-large': 'A single adjustment can be at most ৳100,000.',
  'invalid-user': 'Player not found.',
  'invalid-action': 'That action was not recognised.',
  unauthorized: 'Your session has expired — log in again.',
};

/** Which row has its drawer open, and for what. */
type Panel = { id: string; kind: 'balance' | 'hold' | 'ban' } | null;

/** How a player is named in a notice: their ID once they have one. */
const nameOf = (p: PlayerRow) => (p.playerNo ? `ID ${p.playerNo}` : p.phone);

export default function PlayerControl({
  initialPlayers,
  initialError = '',
  backendReady,
  canWrite,
}: {
  initialPlayers: PlayerRow[];
  /** the first load failed: say so, rather than drawing "No players" */
  initialError?: string;
  backendReady: boolean;
  /** false for an agent: they look players up while answering a cashier
      request, they do not move balances, hold or ban anybody. */
  canWrite: boolean;
}) {
  const [players, setPlayers] = useState(initialPlayers);
  const [search, setSearch] = useState('');
  const [panel, setPanel] = useState<Panel>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState(initialError);
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

  function toggle(id: string, kind: 'balance' | 'hold' | 'ban') {
    setPanel(panel?.id === id && panel.kind === kind ? null : { id, kind });
    setAmount('');
    setNote('');
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
        ? `${money(taka)} added to ${nameOf(player)}'s balance.`
        : `${money(taka)} taken off ${nameOf(player)}'s balance.`,
    );
    if (ok) {
      setAmount('');
      setNote('');
      setPanel(null);
    }
  }

  /** on=true holds or bans (with the reason typed in the drawer); on=false
      lifts it straight from the row. */
  async function setStatus(player: PlayerRow, kind: 'hold' | 'ban', on: boolean) {
    const body = kind === 'ban'
      ? { action: 'block', blocked: on, reason: on ? note : '' }
      : { action: 'hold', held: on, reason: on ? note : '' };
    const who = nameOf(player);
    const message = kind === 'ban'
      ? (on ? `${who} is banned.` : `${who} is unbanned.`)
      : (on ? `${who} is on hold.` : `${who} is released from hold.`);

    const ok = await send(player.id, body, message);
    if (ok) {
      setNote('');
      setPanel(null);
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
  const banned = players.filter((p) => p.isBlocked).length;
  const held = players.filter((p) => p.isHeld && !p.isBlocked).length;
  const numbered = players.some((p) => p.playerNo !== null);
  const columns = canWrite ? 11 : 10;

  return (
    <>
      <div className="adm__tiles" style={{ marginBottom: 14 }}>
        <div className="adm__tile"><b>{players.length}</b><small>In this list</small></div>
        <div className="adm__tile"><b>{money(toTaka(totalBalance))}</b><small>Total balance</small></div>
        <div className="adm__tile"><b>{held}</b><small>On hold</small></div>
        <div className="adm__tile"><b>{banned}</b><small>Banned</small></div>
      </div>

      <form
        className="adm__card"
        onSubmit={(e) => { e.preventDefault(); void load(search); }}
      >
        <div className="adm__formgrid">
          <label className="adm__f adm__f--wide">
            <span>Search by player ID, phone number or name</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="100023 or 01XXXXXXXXX" />
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
        {!numbered && players.length > 0 && (
          <p className="adm__hint">
            Player IDs appear once <code>supabase/012_player_ids_hold_ban.sql</code> has been run in
            Supabase. Ban works already; Hold needs that migration too.
          </p>
        )}
      </form>

      {error && <p className="adm__err">{error}</p>}
      {notice && <p className="adm__note">{notice}</p>}

      <div className="adm__tablewrap">
        <table className="adm__table">
          <thead>
            <tr>
              <th>ID</th><th>Phone</th><th>Name</th><th>Balance</th><th>Bonus</th>
              <th>VIP</th><th>Referral code</th><th>Agent</th><th>Registered</th><th>Status</th>
              {canWrite && <th></th>}
            </tr>
          </thead>
          <tbody>
            {players.length === 0 ? (
              <tr><td colSpan={columns} className="adm__empty">No players.</td></tr>
            ) : (
              players.map((p) => {
                const busy = busyId === p.id;
                const open = panel?.id === p.id ? panel.kind : null;
                const reason = p.isBlocked ? p.blockReason : p.isHeld ? p.holdReason : null;
                return (
                  <Fragment key={p.id}>
                    <tr>
                      <td>{p.playerNo ? <b>{p.playerNo}</b> : <span className="adm__muted">—</span>}</td>
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
                          ? <span className="adm__miss">Banned</span>
                          : p.isHeld
                            ? <span className="adm__miss" style={{ color: '#e0a526' }}>On hold</span>
                            : <span className="adm__ok">Active</span>}
                        {reason && <div className="adm__muted" style={{ fontSize: 12 }}>{reason}</div>}
                      </td>
                      {canWrite && (
                      <td className="adm__rowacts">
                        <button
                          type="button" className="btn btn--ghost" disabled={busy}
                          onClick={() => toggle(p.id, 'balance')}
                        >
                          Balance
                        </button>
                        {!p.isBlocked && (
                          <button
                            type="button" className="btn btn--ghost" disabled={busy}
                            onClick={() => (p.isHeld ? void setStatus(p, 'hold', false) : toggle(p.id, 'hold'))}
                          >
                            {p.isHeld ? 'Release' : 'Hold'}
                          </button>
                        )}
                        <button
                          type="button" className={`btn btn--ghost${p.isBlocked ? '' : ' adm__danger'}`}
                          disabled={busy}
                          onClick={() => (p.isBlocked ? void setStatus(p, 'ban', false) : toggle(p.id, 'ban'))}
                        >
                          {p.isBlocked ? 'Unban' : 'Ban'}
                        </button>
                      </td>
                      )}
                    </tr>

                    {canWrite && open === 'balance' && (
                      <tr className="adm__subrow">
                        <td colSpan={columns}>
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

                    {canWrite && (open === 'hold' || open === 'ban') && (
                      <tr className="adm__subrow">
                        <td colSpan={columns}>
                          <div className="adm__adjust">
                            <label className="adm__f adm__f--wide">
                              <span>{open === 'ban' ? 'Why is this account banned?' : 'Why is this account on hold?'}</span>
                              <input
                                value={note} disabled={busy}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder={open === 'ban' ? 'e.g. second account, fraud' : 'e.g. checking a deposit'}
                              />
                            </label>
                            <div className="adm__rowacts">
                              <button type="button" className="btn btn--ghost adm__danger" disabled={busy}
                                      onClick={() => void setStatus(p, open, true)}>
                                {open === 'ban' ? 'Ban account' : 'Put on hold'}
                              </button>
                              <button type="button" className="btn btn--ghost" disabled={busy}
                                      onClick={() => setPanel(null)}>
                                Cancel
                              </button>
                            </div>
                          </div>
                          <p className="adm__hint">
                            {open === 'ban'
                              ? 'A banned player is signed out and cannot log in, play, claim bonuses, deposit or withdraw. Their balance stays as it is.'
                              : 'On hold the player can still log in and see their balance, but cannot bet, claim bonuses or withdraw until released.'}
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
