'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ROLE_LABEL } from '@/lib/admin-roles';
import type { AgentSummary } from '@/lib/agent-network';
import { agentInviteLink } from '@/lib/agent-links';
import { toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';
import type { PlayerRow } from '@/lib/cashier';
import DataTable from './DataTable';

/**
 * Agents, their invite links, and who signed up through them.
 *
 * The same screen serves two readers. A super admin or admin sees every
 * agent and can open any of them; an agent sees one card — their own — and
 * the players under it. The server decides which of those it sent, so the
 * component only has to render what it was given.
 */
export default function AgentControl({
  initialAgents,
  seesEveryone,
  migrated,
  backendReady,
}: {
  initialAgents: AgentSummary[];
  seesEveryone: boolean;
  migrated: boolean;
  backendReady: boolean;
}) {
  const [agents] = useState(initialAgents);
  const [open, setOpen] = useState<string | null>(initialAgents.length === 1 ? initialAgents[0].refCode : null);
  const [players, setPlayers] = useState<Record<string, PlayerRow[]>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState('');

  // The link has to carry the host the panel is being read from — copied on
  // localhost it must point at localhost, copied on the live domain at the
  // live domain. window.location is the only place that knows, and it does
  // not exist while this renders on the server.
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);

  const load = useCallback(async (code: string) => {
    setBusy(code);
    setErr('');
    try {
      const res = await fetch(`/api/admin/agents?code=${encodeURIComponent(code)}`, { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.reason ?? 'failed');
      setPlayers((cur) => ({ ...cur, [code]: body.players as PlayerRow[] }));
    } catch {
      setErr('Could not load the player list — try again.');
    } finally {
      setBusy(null);
    }
  }, []);

  const toggle = (code: string) => {
    const next = open === code ? null : code;
    setOpen(next);
    if (next && !players[next]) void load(next);
  };

  useEffect(() => {
    if (open && !players[open] && backendReady && migrated) void load(open);
    // one shot for the single-agent case, where the card opens on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(agentInviteLink(origin, code));
      setCopied(code);
      setTimeout(() => setCopied((c) => (c === code ? '' : c)), 2000);
    } catch {
      setErr('Could not copy — select the link and copy it by hand.');
    }
  };

  const totals = useMemo(
    () => ({
      players: agents.reduce((n, a) => n + a.players, 0),
      active: agents.reduce((n, a) => n + a.activePlayers, 0),
      deposited: agents.reduce((n, a) => n + a.deposited, 0),
    }),
    [agents],
  );

  if (agents.length === 0) {
    return (
      <p className="adm__sub">
        {seesEveryone
          ? 'No agent accounts yet. Create an agent on the Staff page and their link shows up here.'
          : 'No link was found for your account — tell the super admin.'}
      </p>
    );
  }

  return (
    <>
      {!migrated && (
        <p className="adm__note">
          <code>008_agent_referrals.sql</code> has not been run on the database yet, so players
          cannot be counted. The links still work, but the numbers need that migration.
        </p>
      )}

      {seesEveryone && agents.length > 1 && (
        <div className="adm__tiles">
          <div className="adm__tile"><b>{agents.length}</b><small>Agents</small></div>
          <div className="adm__tile"><b>{totals.players}</b><small>Players brought in</small></div>
          <div className="adm__tile"><b>{totals.active}</b><small>Have deposited</small></div>
          <div className="adm__tile"><b>{money(toTaka(totals.deposited))}</b><small>Total deposits</small></div>
        </div>
      )}

      {err && <p className="adm__err">{err}</p>}

      <div className="adm__agents">
        {agents.map((agent) => {
          const link = origin ? agentInviteLink(origin, agent.refCode) : '…';
          const rows = players[agent.refCode] ?? [];
          const isOpen = open === agent.refCode;

          return (
            <div className="adm__agent" key={agent.id}>
              <div className="adm__agent-top">
                <div className="adm__agent-who">
                  <b>{agent.username}</b>
                  <span className="adm__agent-role">{ROLE_LABEL[agent.role]}</span>
                  {!agent.active && <span className="adm__agent-off">Disabled</span>}
                </div>
                <div className="adm__agent-nums">
                  <span><b>{migrated ? agent.players : '—'}</b> players</span>
                  <span><b>{migrated ? agent.activePlayers : '—'}</b> deposited</span>
                  <span><b>{migrated ? money(toTaka(agent.deposited)) : '—'}</b> total</span>
                </div>
              </div>

              <div className="adm__agent-link">
                <code>{link}</code>
                <button type="button" className="btn btn--ghost" onClick={() => copy(agent.refCode)} disabled={!origin}>
                  {copied === agent.refCode ? 'Copied' : 'Copy link'}
                </button>
              </div>
              <p className="adm__hint">
                Code <b>{agent.refCode}</b> — anyone who registers through this link is added
                under this account.
              </p>

              <button type="button" className="btn btn--ghost adm__agent-more" onClick={() => toggle(agent.refCode)}>
                {isOpen ? 'Hide players' : 'Show players'}
              </button>

              {isOpen && (
                busy === agent.refCode ? (
                  <p className="adm__sub">Loading…</p>
                ) : (
                  <DataTable
                    columns={['Number', 'Balance', 'VIP', 'Status', 'Joined']}
                    rows={rows.map((p) => [
                      <span key="p">{p.phone}{p.displayName ? ` · ${p.displayName}` : ''}</span>,
                      money(toTaka(p.balance)),
                      p.vipLevel,
                      p.isBlocked
                        ? <span key="b" className="adm__miss">Banned</span>
                        : p.isHeld
                          ? <span key="b" className="adm__miss" style={{ color: '#e0a526' }}>On hold</span>
                          : p.withdrawLocked
                            ? <span key="b" className="adm__miss" style={{ color: '#e0a526' }}>Withdraw locked</span>
                            : <span key="b" className="adm__ok">Active</span>,
                      new Date(p.createdAt).toLocaleDateString('en-GB'),
                    ])}
                    empty={migrated ? 'Nobody has registered through this link yet.' : 'Visible once the migration has been run.'}
                  />
                )
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
