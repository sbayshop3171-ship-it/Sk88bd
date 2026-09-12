import AgentControl from '@/components/admin/AgentControl';
import NoAccess from '@/components/admin/NoAccess';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { can } from '@/lib/admin-roles';
import { listStaff } from '@/lib/admin-users-store';
import { agentNetwork } from '@/lib/agent-network';
import { isBackendReady } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Every agent and the players their link brought in — or, for an agent,
    their own link and their own players. The scope is decided here and in
    /api/admin/agents from the session, never from the URL. */
export default async function AdminAgents() {
  const session = await getCurrentAdminSession();
  if (!session) return null;
  if (!can(session, 'agents.self')) return <NoAccess what="The agent list" />;

  const staff = await listStaff();
  const seesEveryone = can(session, 'agents.read');
  const scoped = seesEveryone
    ? staff.filter((s) => s.role === 'agent' || s.id === session.uid)
    : staff.filter((s) => s.id === session.uid);

  const network = await agentNetwork(scoped);

  return (
    <>
      <h1 className="adm__h1">{seesEveryone ? 'Agents' : 'My link'}</h1>
      <p className="adm__sub">
        {seesEveryone
          ? 'Every agent has their own registration link. Anyone who opens an account through it is added under that agent — below you can see how many players each agent brought in and how much they have deposited.'
          : 'Your own registration link. Anyone who opens an account through it is added under you, and shows up in the list below.'}
      </p>

      {!isBackendReady() ? (
        <p className="adm__sub">
          The database is not connected, so player counts cannot be shown. The links still work.
        </p>
      ) : null}

      <AgentControl
        initialAgents={network.ok ? network.data.agents : scoped.map(toBlank)}
        seesEveryone={seesEveryone}
        migrated={network.ok ? network.data.migrated : false}
        backendReady={isBackendReady()}
      />
    </>
  );
}

/** With no database to count in, the agents and their links are still real
    — the numbers are the only thing missing. */
function toBlank(member: Awaited<ReturnType<typeof listStaff>>[number]) {
  return {
    id: member.id,
    username: member.username,
    role: member.role,
    active: member.active,
    refCode: member.refCode,
    createdAt: member.createdAt,
    lastLoginAt: member.lastLoginAt,
    players: 0,
    activePlayers: 0,
    deposited: 0,
  };
}
