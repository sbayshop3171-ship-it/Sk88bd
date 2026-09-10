import NoAccess from '@/components/admin/NoAccess';
import PlayerControl from '@/components/admin/PlayerControl';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { can } from '@/lib/admin-roles';
import { listPlayers } from '@/lib/cashier';
import { isBackendReady } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminUsers() {
  const session = await getCurrentAdminSession();
  if (!session) return null;
  if (!can(session.role, 'players.read')) return <NoAccess role={session.role} what="The player list" />;

  const players = await listPlayers();

  return (
    <>
      <h1 className="adm__h1">Users</h1>
      <p className="adm__sub">
        Find a player by their ID, phone or name. Adjust a balance, put an account on hold, or
        ban it. Every balance change is written to the ledger, and every hold or ban keeps its
        reason and who set it.
      </p>
      <PlayerControl
        initialPlayers={players.ok ? players.data : []}
        initialError={players.ok ? '' : players.message ?? `Could not load the players (${players.reason})`}
        backendReady={isBackendReady()}
        canWrite={can(session.role, 'players.write')}
      />
    </>
  );
}
