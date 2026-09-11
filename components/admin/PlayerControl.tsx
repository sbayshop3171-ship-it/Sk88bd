'use client';

import { Fragment, useState } from 'react';
import { toPaisa, toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';
import type { PlayerRow } from '@/lib/cashier';

const ERROR_LABEL: Record<string, string> = {
  forbidden: 'You are not allowed to do that to this player.',
  'invalid-amount': 'Enter an amount — zero will not do.',
  'amount-too-large': 'A single adjustment can be at most ৳100,000.',
  'invalid-user': 'Player not found.',
  'invalid-action': 'That action was not recognised.',
  unauthorized: 'Your session has expired — log in again.',
};

type Kind = 'balance' | 'hold' | 'ban' | 'lock' | 'appeal';

/** Which row has its drawer open, and for what. */
type Panel = { id: string; kind: Kind } | null;

/** One tap fills the lock reason — the player reads it word for word on
    their My Account screen, so these are in Bangla. */
const LOCK_PRESETS = [
  'সন্দেহজনক গেমপ্লে / হ্যাকিং কার্যকলাপ সনাক্ত হয়েছে',
  'একাধিক অ্যাকাউন্ট ব্যবহারের সন্দেহ',
  'ডিপোজিট যাচাই করা হচ্ছে',
  'বোনাস অপব্যবহারের সন্দেহ',
];

/** "5 min ago" for the appeal line. */
function ago(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

/** How a player is named in a notice: their ID once they have one. */
const nameOf = (p: PlayerRow) => (p.playerNo ? `ID ${p.playerNo}` : p.phone);

export default function PlayerControl({
  initialPlayers,
  initialError = '',
  backendReady,
  canWrite,
  canLock = false,
  scopedToAgent = false,
}: {
  initialPlayers: PlayerRow[];
  /** the first load failed: say so, rather than drawing "No players" */
  initialError?: string;
  backendReady: boolean;
  /** false for an agent: they look players up while answering a cashier
      request, they do not move balances, hold or ban anybody. */
  canWrite: boolean;
  /** lock withdrawals and answer appeals — agents too, on their own players */
  canLock?: boolean;
  /** an agent: the list holds only the players who came through their link */
  scopedToAgent?: boolean;
}) {
  const [players, setPlayers] = useState(initialPlayers);
  const [search, setSearch] = useState('');
  const [onlyLocked, setOnlyLocked] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState(initialError);
  const [notice, setNotice] = useState('');

  async function load(term: string, locked = onlyLocked) {
    setError('');
    setNotice('');
    try {
      const filter = locked ? '&filter=locked' : '';
      const res = await fetch(`/api/admin/players?search=${encodeURIComponent(term)}${filter}`, {
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
        body: JSON.stringify({ userId, search, filter: onlyLocked ? 'locked' : '', ...body }),
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

  function toggle(id: string, kind: Kind) {
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

  async function lock(player: PlayerRow, on: boolean) {
    const who = nameOf(player);
    const ok = await send(
      player.id,
      { action: on ? 'lock' : 'unlock', reason: on ? note.trim() : '' },
      on ? `${who}'s withdrawals are locked. They see the notice on My Account.` : `${who} is unlocked — withdrawals work again.`,
    );
    if (ok) {
      setNote('');
      setPanel(null);
    }
  }

  async function rejectAppeal(player: PlayerRow) {
    if (!player.appeal) return;
    const ok = await send(
      player.id,
      { action: 'reject-appeal', appealId: player.appeal.id, reason: note.trim() },
      `${nameOf(player)}'s appeal is turned down. The account stays locked.`,
    );
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
  const locked = players.filter((p) => p.withdrawLocked && !p.isBlocked).length;
  const appeals = players.filter((p) => p.withdrawLocked && p.appeal?.state === 'pending').length;
  const numbered = players.some((p) => p.playerNo !== null);
  // the one to look at when the total looks wrong
  const richest = players.reduce<PlayerRow | null>((top, p) => (!top || p.balance > top.balance ? p : top), null);
  const acts = canWrite || canLock;
  const columns = acts ? 11 : 10;

  return (
    <>
      <div className="adm__tiles" style={{ marginBottom: 14 }}>
        <div className="adm__tile"><b>{players.length}</b><small>In this list</small></div>
        <div className="adm__tile"><b>{money(toTaka(totalBalance))}</b><small>Total balance</small></div>
        {richest && richest.balance > 0 && (
          <button
            type="button" className="adm__tile adm__tile--link" style={{ textAlign: 'left', cursor: 'pointer' }}
            onClick={() => { const term = String(richest.playerNo ?? richest.phone); setSearch(term); void load(term); }}
          >
            <b>{money(toTaka(richest.balance))}</b>
            <small>Highest balance · {nameOf(richest)} — tap to open</small>
          </button>
        )}
        <div className="adm__tile"><b>{held}</b><small>On hold</small></div>
        <div className="adm__tile"><b>{locked}</b><small>Withdraw locked</small></div>
        <div className="adm__tile"><b style={appeals ? { color: '#e0a526' } : undefined}>{appeals}</b><small>Appeals waiting</small></div>
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
          <button
            type="button" className={`btn ${onlyLocked ? 'btn--gold' : 'btn--ghost'}`}
            onClick={() => { const next = !onlyLocked; setOnlyLocked(next); void load(search, next); }}
          >
            {onlyLocked ? 'Showing locked only' : 'Locked & appeals'}
          </button>
        </div>
        {scopedToAgent && (
          <p className="adm__hint">You see only the players who signed up through your own link.</p>
        )}
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
              {acts && <th></th>}
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
                        {p.withdrawLocked && !p.isBlocked && (
                          <div style={{ marginTop: 4 }}>
                            <span className="adm__miss" style={{ color: '#e0a526' }}>Withdraw locked</span>
                            {p.lockReason && <div className="adm__muted" style={{ fontSize: 12 }}>{p.lockReason}</div>}
                            {p.lockedBy && <div className="adm__muted" style={{ fontSize: 11 }}>by {p.lockedBy}</div>}
                            {p.appeal?.state === 'pending' && (
                              <button
                                type="button" className="btn btn--gold" disabled={busy || !canLock}
                                style={{ marginTop: 4, padding: '3px 10px', fontSize: 12 }}
                                onClick={() => toggle(p.id, 'appeal')}
                              >
                                Appeal waiting · {ago(p.appeal.createdAt)}
                              </button>
                            )}
                            {p.appeal?.state === 'rejected' && (
                              <div className="adm__muted" style={{ fontSize: 11 }}>Last appeal turned down</div>
                            )}
                          </div>
                        )}
                      </td>
                      {acts && (
                      <td>
                      <div className="adm__acts2">
                        {canWrite && (
                        <button
                          type="button" className="btn btn--ghost" disabled={busy}
                          onClick={() => toggle(p.id, 'balance')}
                        >
                          Balance
                        </button>
                        )}
                        {canLock && !p.isBlocked && (
                          <button
                            type="button" className="btn btn--ghost" disabled={busy}
                            onClick={() => (p.withdrawLocked ? void lock(p, false) : toggle(p.id, 'lock'))}
                          >
                            {p.withdrawLocked ? 'Unlock' : 'Lock'}
                          </button>
                        )}
                        {canWrite && !p.isBlocked && (
                          <button
                            type="button" className="btn btn--ghost" disabled={busy}
                            onClick={() => (p.isHeld ? void setStatus(p, 'hold', false) : toggle(p.id, 'hold'))}
                          >
                            {p.isHeld ? 'Release' : 'Hold'}
                          </button>
                        )}
                        {canWrite && (
                        <button
                          type="button" className={`btn btn--ghost${p.isBlocked ? '' : ' adm__danger'}`}
                          disabled={busy}
                          onClick={() => (p.isBlocked ? void setStatus(p, 'ban', false) : toggle(p.id, 'ban'))}
                        >
                          {p.isBlocked ? 'Unban' : 'Ban'}
                        </button>
                        )}
                      </div>
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

                    {canLock && open === 'lock' && (
                      <tr className="adm__subrow">
                        <td colSpan={columns}>
                          <div className="adm__adjust">
                            <label className="adm__f adm__f--wide">
                              <span>Reason the player will see</span>
                              <input
                                value={note} disabled={busy} maxLength={200}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder={LOCK_PRESETS[0]}
                              />
                            </label>
                            <div className="adm__rowacts">
                              <button type="button" className="btn btn--ghost adm__danger" disabled={busy}
                                      onClick={() => void lock(p, true)}>
                                Lock withdrawals
                              </button>
                              <button type="button" className="btn btn--ghost" disabled={busy}
                                      onClick={() => setPanel(null)}>
                                Cancel
                              </button>
                            </div>
                          </div>
                          <div className="adm__rowacts" style={{ flexWrap: 'wrap', marginTop: 6 }}>
                            {LOCK_PRESETS.map((text) => (
                              <button key={text} type="button" className="btn btn--ghost" disabled={busy}
                                      style={{ fontSize: 12, padding: '4px 10px' }}
                                      onClick={() => setNote(text)}>
                                {text}
                              </button>
                            ))}
                          </div>
                          <p className="adm__hint">
                            A locked player can still log in, deposit, play and claim bonuses — only
                            withdrawals are refused. My Account shows them this reason with an Appeal
                            button; their appeal shows up here. Leave it blank for a general notice.
                          </p>
                        </td>
                      </tr>
                    )}

                    {canLock && open === 'appeal' && p.appeal && (
                      <tr className="adm__subrow">
                        <td colSpan={columns}>
                          <p style={{ margin: '0 0 8px' }}>
                            <span className="adm__muted">
                              Appeal from {nameOf(p)}, {new Date(p.appeal.createdAt).toLocaleString('en-GB')}:
                            </span>
                            <br />
                            <b style={{ whiteSpace: 'pre-wrap' }}>{p.appeal.message}</b>
                          </p>
                          <div className="adm__adjust">
                            <label className="adm__f adm__f--wide">
                              <span>Note to the player if you turn it down</span>
                              <input
                                value={note} disabled={busy} maxLength={200}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="e.g. যাচাই শেষ হয়নি, সাপোর্টে যোগাযোগ করুন"
                              />
                            </label>
                            <div className="adm__rowacts">
                              <button type="button" className="btn btn--gold" disabled={busy}
                                      onClick={() => void lock(p, false)}>
                                Accept &amp; unlock
                              </button>
                              <button type="button" className="btn btn--ghost adm__danger" disabled={busy}
                                      onClick={() => void rejectAppeal(p)}>
                                Turn down
                              </button>
                            </div>
                          </div>
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
