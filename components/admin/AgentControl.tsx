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
      setErr('ইউজার তালিকা আনা গেল না — আবার চেষ্টা করুন।');
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
      setErr('কপি করা গেল না — লিংকটি হাতে সিলেক্ট করে কপি করুন।');
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
          ? 'এখনো কোনো এজেন্ট অ্যাকাউন্ট নেই। স্টাফ পেজ থেকে এজেন্ট বানালে তার লিংক এখানে চলে আসবে।'
          : 'আপনার অ্যাকাউন্টের লিংক পাওয়া গেল না — সুপার অ্যাডমিনকে জানান।'}
      </p>
    );
  }

  return (
    <>
      {!migrated && (
        <p className="adm__note">
          ডেটাবেসে <code>008_agent_referrals.sql</code> এখনো চালানো হয়নি, তাই ইউজার গোনা
          যাচ্ছে না। লিংক শেয়ার করা যাবে, কিন্তু হিসাব দেখাতে মাইগ্রেশনটি লাগবে।
        </p>
      )}

      {seesEveryone && agents.length > 1 && (
        <div className="adm__tiles">
          <div className="adm__tile"><b>{agents.length}</b><small>এজেন্ট</small></div>
          <div className="adm__tile"><b>{totals.players}</b><small>এজেন্টের আনা ইউজার</small></div>
          <div className="adm__tile"><b>{totals.active}</b><small>ডিপোজিট করেছে</small></div>
          <div className="adm__tile"><b>{money(toTaka(totals.deposited))}</b><small>মোট ডিপোজিট</small></div>
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
                  {!agent.active && <span className="adm__agent-off">বন্ধ</span>}
                </div>
                <div className="adm__agent-nums">
                  <span><b>{migrated ? agent.players : '—'}</b> ইউজার</span>
                  <span><b>{migrated ? agent.activePlayers : '—'}</b> ডিপোজিট করেছে</span>
                  <span><b>{migrated ? money(toTaka(agent.deposited)) : '—'}</b> মোট</span>
                </div>
              </div>

              <div className="adm__agent-link">
                <code>{link}</code>
                <button type="button" className="btn btn--ghost" onClick={() => copy(agent.refCode)} disabled={!origin}>
                  {copied === agent.refCode ? 'কপি হয়েছে' : 'লিংক কপি'}
                </button>
              </div>
              <p className="adm__hint">
                কোড <b>{agent.refCode}</b> — এই লিংকে ঢুকে কেউ রেজিস্টার করলে সে এই
                অ্যাকাউন্টের নিচে যোগ হবে।
              </p>

              <button type="button" className="btn btn--ghost adm__agent-more" onClick={() => toggle(agent.refCode)}>
                {isOpen ? 'ইউজার লুকান' : 'ইউজার দেখুন'}
              </button>

              {isOpen && (
                busy === agent.refCode ? (
                  <p className="adm__sub">আনা হচ্ছে…</p>
                ) : (
                  <DataTable
                    columns={['নাম্বার', 'ব্যালেন্স', 'VIP', 'অবস্থা', 'যোগ দিয়েছে']}
                    rows={rows.map((p) => [
                      <span key="p">{p.phone}{p.displayName ? ` · ${p.displayName}` : ''}</span>,
                      money(toTaka(p.balance)),
                      p.vipLevel,
                      p.isBlocked ? <span key="b" className="adm__miss">ব্লক</span> : <span key="b" className="adm__ok">সক্রিয়</span>,
                      new Date(p.createdAt).toLocaleDateString('bn-BD'),
                    ])}
                    empty={migrated ? 'এই লিংকে এখনো কেউ রেজিস্টার করেনি।' : 'মাইগ্রেশন চালানোর পর দেখা যাবে।'}
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
