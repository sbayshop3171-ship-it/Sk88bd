import AppKeysControl from '@/components/admin/AppKeysControl';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { getSignalAppKeyAdminState } from '@/lib/signal-app-access';

export const dynamic = 'force-dynamic';

export default async function AdminAppKeysPage() {
  if (!(await getCurrentAdminSession())) return null;

  const state = await getSignalAppKeyAdminState();
  return <AppKeysControl initialState={state} />;
}
