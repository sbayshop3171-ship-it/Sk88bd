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
  if (!can(session.role, 'players.read')) return <NoAccess role={session.role} what="ইউজার তালিকা" />;

  const players = await listPlayers();

  return (
    <>
      <h1 className="adm__h1">ইউজার</h1>
      <p className="adm__sub">
        ব্যালেন্স সমন্বয়, ব্লক/আনব্লক, VIP লেভেল ও রেফারেল কোড। ব্যালেন্সের প্রতিটি
        পরিবর্তন লেজারে লেখা থাকে, তাই পরে কে কী করেছে দেখা যায়।
      </p>
      <PlayerControl
        initialPlayers={players.ok ? players.data : []}
        backendReady={isBackendReady()}
        canWrite={can(session.role, 'players.write')}
      />
    </>
  );
}
