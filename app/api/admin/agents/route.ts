import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth-next';
import { can } from '@/lib/admin-roles';
import { listStaff } from '@/lib/admin-users-store';
import { agentNetwork } from '@/lib/agent-network';
import { normalizeAgentCode } from '@/lib/agent-links';
import { listPlayers } from '@/lib/cashier';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The agent screen, refreshed.
 *
 * Two shapes behind one route: no `code` asks for the agent list, a `code`
 * asks for that agent's players. Both answer inside the caller's own scope —
 * an agent gets themselves and their own signups, and asking for somebody
 * else's code is a 403, not an empty list. Reading the scope off the session
 * rather than a parameter is the point: a link an agent can edit in the URL
 * bar is not a boundary.
 */
export async function GET(req: Request) {
  const gate = await requireAdmin('agents.self');
  if (!gate.ok) return gate.response;
  const { session } = gate;

  const staff = await listStaff();
  const seesEveryone = can(session, 'agents.read');
  const mine = staff.filter((s) => s.id === session.uid);
  const scoped = seesEveryone ? staff.filter((s) => s.role === 'agent' || s.id === session.uid) : mine;

  const code = normalizeAgentCode(new URL(req.url).searchParams.get('code'));
  if (code) {
    if (!scoped.some((s) => s.refCode === code)) return json({ ok: false, reason: 'forbidden' }, 403);
    const players = await listPlayers('', 200, code);
    return players.ok
      ? json({ ok: true, code, players: players.data })
      : json(players, players.reason === 'no-backend' ? 503 : 500);
  }

  const network = await agentNetwork(scoped);
  return network.ok
    ? json({ ok: true, seesEveryone, ...network.data })
    : json(network, network.reason === 'no-backend' ? 503 : 500);
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'cache-control': 'no-store' } });
}
