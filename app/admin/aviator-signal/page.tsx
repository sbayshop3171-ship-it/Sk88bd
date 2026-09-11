import NoAccess from '@/components/admin/NoAccess';
import AviatorSignalControl from '@/components/admin/AviatorSignalControl';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { can } from '@/lib/admin-roles';
import { adminAviatorState, getAviatorSignalState } from '@/lib/aviator-signal-store';

export const dynamic = 'force-dynamic';

export default async function AdminAviatorSignalPage() {
  const session = await getCurrentAdminSession();
  if (!session) return null;
  if (!can(session.role, 'signal.write')) return <NoAccess role={session.role} what="Signal control" />;

  const state = await getAviatorSignalState();
  return <AviatorSignalControl initialState={adminAviatorState(state)} />;
}
