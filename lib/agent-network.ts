/** How many players each agent brought in, and how they are doing.

    The two halves of an agent live in different places: the login and the
    invite code are a row in .data/admin-users-store.json, the players are
    rows in Supabase. Nothing joins them but the code, so every figure here
    starts from the codes the staff store hands over. */

import type { AdminStaff } from './admin-roles';
import { isMissingColumn, type CashierResult } from './cashier';
import { adminClient } from './supabase';

export type AgentSummary = {
  id: string;
  username: string;
  role: AdminStaff['role'];
  active: boolean;
  refCode: string;
  createdAt: string;
  lastLoginAt: string | null;
  /** players who signed up through this agent's link */
  players: number;
  /** of those, the ones with at least one approved deposit */
  activePlayers: number;
  /** paisa, approved deposits by those players, all time */
  deposited: number;
};

/** Every figure on the agent screen, in two round trips.

    `migrated` is false when the database has not run migration 008 yet: the
    staff and their links are still real, so the screen shows them with the
    counts blanked and says why, rather than reporting zero players to an
    agent who has plenty. */
export async function agentNetwork(
  staff: AdminStaff[],
): Promise<CashierResult<{ agents: AgentSummary[]; migrated: boolean }>> {
  const db = adminClient();
  if (!db) return { ok: false, reason: 'no-backend' };

  const blank = (migrated: boolean) => ({
    ok: true as const,
    data: { migrated, agents: staff.map((s) => toSummary(s, [], new Set(), new Map())) },
  });

  const codes = staff.map((s) => s.refCode).filter(Boolean);
  if (codes.length === 0) return blank(true);

  const signups = await db
    .from('profiles')
    .select('id, agent_code')
    .in('agent_code', codes)
    .returns<{ id: string; agent_code: string }[]>();

  if (signups.error) {
    if (isMissingColumn(signups.error.message)) return blank(false);
    return { ok: false, reason: 'db-error', message: signups.error.message };
  }

  const rows = signups.data ?? [];
  const ids = rows.map((r) => r.id);

  // one query for every agent's players at once — a per-agent round trip
  // would turn a ten-agent panel into twenty
  const deposits = ids.length
    ? await db
        .from('deposits')
        .select('user_id, amount')
        .eq('state', 'approved')
        .in('user_id', ids)
        .returns<{ user_id: string; amount: number }[]>()
    : { data: [], error: null };

  if (deposits.error) {
    return { ok: false, reason: 'db-error', message: deposits.error.message };
  }

  const depositors = new Set<string>();
  const paidBy = new Map<string, number>();
  for (const row of deposits.data ?? []) {
    depositors.add(row.user_id);
    paidBy.set(row.user_id, (paidBy.get(row.user_id) ?? 0) + Number(row.amount ?? 0));
  }

  return {
    ok: true,
    data: { migrated: true, agents: staff.map((s) => toSummary(s, rows, depositors, paidBy)) },
  };
}

function toSummary(
  member: AdminStaff,
  rows: { id: string; agent_code: string }[],
  depositors: Set<string>,
  paidBy: Map<string, number>,
): AgentSummary {
  const mine = rows.filter((r) => r.agent_code === member.refCode);
  return {
    id: member.id,
    username: member.username,
    role: member.role,
    active: member.active,
    refCode: member.refCode,
    createdAt: member.createdAt,
    lastLoginAt: member.lastLoginAt,
    players: mine.length,
    activePlayers: mine.filter((r) => depositors.has(r.id)).length,
    deposited: mine.reduce((sum, r) => sum + (paidBy.get(r.id) ?? 0), 0),
  };
}
