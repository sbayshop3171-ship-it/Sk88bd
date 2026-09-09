import Link from 'next/link';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { can, type AdminPermission } from '@/lib/admin-roles';
import { listStaff } from '@/lib/admin-users-store';
import { agentNetwork } from '@/lib/agent-network';
import { CATALOGUE, HOME_SECTIONS } from '@/lib/catalogue';
import { listOverrides } from '@/lib/game-control-store';
import { cashierStats } from '@/lib/cashier';
import { listAccounts } from '@/lib/payment-accounts-store';
import { activeSorted } from '@/lib/site-content';
import { getSiteContent } from '@/lib/site-content-store';
import { toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';
import { panelHref } from '@/lib/panel-base';
import { panelBase } from '@/lib/panel-base-next';
import { isBackendReady } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** label, value, where it links, and the permission that earns it */
type Tile = [string, string, string, AdminPermission];

/**
 * Two groups on purpose. The first counts things this server actually stores,
 * so every number is real. The second is the cashier and player figures, which
 * live in Supabase — they stay marked as unavailable rather than showing a
 * zero that reads like "no deposits today".
 *
 * Every tile carries the permission its screen needs, so an agent's dashboard
 * is the four cashier numbers and nothing that links somewhere they cannot go.
 */
export default async function AdminDashboard() {
  const session = await getCurrentAdminSession();
  if (!session) return null;
  const base = await panelBase();

  const [accounts, overrides, content, stats, staff] = await Promise.all([
    listAccounts(),
    listOverrides(),
    getSiteContent(),
    cashierStats(),
    listStaff(),
  ]);

  // An agent's dashboard counts only their own signups; an admin's counts
  // every agent. Same query, scoped the same way the agent screen scopes it.
  const seesEveryAgent = can(session.role, 'agents.read');
  const agentScope = seesEveryAgent
    ? staff.filter((s) => s.role === 'agent' || s.id === session.uid)
    : staff.filter((s) => s.id === session.uid);
  const network = agentScope.length > 0 ? await agentNetwork(agentScope) : null;
  const agents = network?.ok && network.data.migrated ? network.data.agents : null;

  // a game can be listed in several categories; count each one once
  const totalGames = new Set(HOME_SECTIONS.flatMap((cat) => CATALOGUE[cat].map((g) => g.id))).size;
  const hidden = overrides.filter((o) => o.status === 'hidden').length;
  const activeAccounts = accounts.filter((a) => a.status === 'active');
  const deposits = activeAccounts.filter((a) => a.use !== 'withdraw');

  const mine = (tiles: Tile[]) => tiles.filter(([, , , need]) => can(session.role, need));

  const live = mine([
    ['Active payment numbers', String(activeAccounts.length), '/admin/payments', 'payments.read'],
    ['Deposit numbers', String(deposits.length), '/admin/payments', 'payments.read'],
    ['Games showing', String(totalGames - hidden), '/admin/games', 'games.write'],
    ['Games hidden', String(hidden), '/admin/games', 'games.write'],
    ['Home banners', String(activeSorted(content.banners).length), '/admin/banners', 'content.write'],
    ['Announcement cards', String(activeSorted(content.announcements).length), '/admin/banners', 'content.write'],
  ]);

  const cashier = stats.ok
    ? mine([
        ['Pending deposits', String(stats.data.pendingDeposits), '/admin/deposits', 'cashier.review'],
        ['Pending withdrawals', String(stats.data.pendingWithdrawals), '/admin/withdrawals', 'cashier.review'],
        ['Deposited today', money(toTaka(stats.data.todayDeposited)), '/admin/deposits', 'cashier.review'],
        ['Withdrawn today', money(toTaka(stats.data.todayWithdrawn)), '/admin/withdrawals', 'cashier.review'],
        ['Total players', String(stats.data.totalPlayers), '/admin/users', 'players.read'],
      ])
    : [];

  return (
    <>
      <h1 className="adm__h1">Dashboard</h1>
      <p className="adm__sub">What this server currently holds.</p>

      {live.length > 0 && (
        <div className="adm__tiles">
          {live.map(([label, value, href]) => (
            <Link className="adm__tile adm__tile--link" key={label} href={panelHref(base, href)}>
              <b>{value}</b>
              <small>{label}</small>
            </Link>
          ))}
        </div>
      )}

      {can(session.role, 'agents.self') && (
        <>
          <h2 className="adm__h2">{seesEveryAgent ? 'Agents' : 'My link'}</h2>
          <p className="adm__sub">
            {seesEveryAgent
              ? 'Players who registered through an agent’s link. The Agents page has the detail.'
              : 'Players who registered through your link.'}
          </p>
          <div className="adm__tiles">
            {seesEveryAgent && (
              <Link className="adm__tile adm__tile--link" href={panelHref(base, '/admin/agents')}>
                <b>{agentScope.filter((s) => s.role === 'agent').length}</b>
                <small>Agents</small>
              </Link>
            )}
            <Link className="adm__tile adm__tile--link" href={panelHref(base, '/admin/agents')}>
              <b>{agents ? agents.reduce((n, a) => n + a.players, 0) : '—'}</b>
              <small>{seesEveryAgent ? 'Players brought in' : 'Players I brought in'}</small>
            </Link>
            <Link className="adm__tile adm__tile--link" href={panelHref(base, '/admin/agents')}>
              <b>{agents ? agents.reduce((n, a) => n + a.activePlayers, 0) : '—'}</b>
              <small>Of those, have deposited</small>
            </Link>
            <Link className="adm__tile adm__tile--link" href={panelHref(base, '/admin/agents')}>
              <b>{agents ? money(toTaka(agents.reduce((n, a) => n + a.deposited, 0))) : '—'}</b>
              <small>Their total deposits</small>
            </Link>
          </div>
        </>
      )}

      <h2 className="adm__h2">Players &amp; cashier</h2>

      {cashier.length > 0 ? (
        <div className="adm__tiles">
          {cashier.map(([label, value, href]) => (
            <Link className="adm__tile adm__tile--link" key={label} href={panelHref(base, href)}>
              <b>{value}</b>
              <small>{label}</small>
            </Link>
          ))}
        </div>
      ) : (
        <>
          <p className="adm__sub">
            {isBackendReady()
              ? `Could not read the figures from the database${stats.ok ? '' : ` — ${stats.message ?? stats.reason}`}.`
              : 'These figures live in Supabase. The database is not connected, so they are left blank rather than shown as zero.'}
          </p>
          <div className="adm__tiles">
            {['Deposited today', 'Withdrawn today', 'Total players', 'Pending requests'].map((label) => (
              <div className="adm__tile adm__tile--off" key={label}>
                <b>—</b>
                <small>{label}</small>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
