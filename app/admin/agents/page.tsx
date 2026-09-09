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
  if (!can(session.role, 'agents.self')) return <NoAccess role={session.role} what="এজেন্ট তালিকা" />;

  const staff = await listStaff();
  const seesEveryone = can(session.role, 'agents.read');
  const scoped = seesEveryone
    ? staff.filter((s) => s.role === 'agent' || s.id === session.uid)
    : staff.filter((s) => s.id === session.uid);

  const network = await agentNetwork(scoped);

  return (
    <>
      <h1 className="adm__h1">{seesEveryone ? 'এজেন্ট' : 'আমার লিংক'}</h1>
      <p className="adm__sub">
        {seesEveryone
          ? 'প্রতিটি এজেন্টের নিজের রেজিস্ট্রেশন লিংক আছে। কেউ সেই লিংক দিয়ে অ্যাকাউন্ট খুললে সে ওই এজেন্টের নিচে যোগ হয় — নিচে কোন এজেন্টের কত ইউজার আর তারা কত ডিপোজিট করেছে সব দেখা যাচ্ছে।'
          : 'আপনার নিজের রেজিস্ট্রেশন লিংক। এই লিংক দিয়ে কেউ অ্যাকাউন্ট খুললে সে আপনার নিচে যোগ হবে, আর নিচের তালিকায় দেখা যাবে।'}
      </p>

      {!isBackendReady() ? (
        <p className="adm__sub">
          ডেটাবেস যুক্ত হয়নি, তাই ইউজারের হিসাব দেখানো যাচ্ছে না। লিংকগুলো তবু কাজ করবে।
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
