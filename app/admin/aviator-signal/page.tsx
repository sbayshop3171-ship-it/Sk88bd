import AviatorSignalControl from '@/components/admin/AviatorSignalControl';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { getAviatorSignalState, publicAviatorState } from '@/lib/aviator-signal-store';

export const dynamic = 'force-dynamic';

export default async function AdminAviatorSignalPage() {
  if (!(await getCurrentAdminSession())) return null;

  const state = await getAviatorSignalState();
  return <AviatorSignalControl initialState={publicAviatorState(state)} />;
}
