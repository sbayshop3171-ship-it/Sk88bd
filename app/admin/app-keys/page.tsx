import NoAccess from '@/components/admin/NoAccess';
import AppKeysControl from '@/components/admin/AppKeysControl';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { can } from '@/lib/admin-roles';
import { getSignalAppKeyAdminState } from '@/lib/signal-app-access';

export const dynamic = 'force-dynamic';

export default async function AdminAppKeysPage() {
  const session = await getCurrentAdminSession();
  if (!session) return null;
  if (!can(session.role, 'app-keys.write')) return <NoAccess role={session.role} what="App keys" />;

  const state = await getSignalAppKeyAdminState();
  return <AppKeysControl initialState={state} />;
}
