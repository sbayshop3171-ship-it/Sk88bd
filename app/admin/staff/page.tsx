import NoAccess from '@/components/admin/NoAccess';
import StaffControl from '@/components/admin/StaffControl';
import { superAdminUsername } from '@/lib/admin-auth';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { can } from '@/lib/admin-roles';
import { listStaff } from '@/lib/admin-users-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Who else may sign in here. The super admin's own login stays in the
    server environment — it is not on this list and cannot be deleted from a
    screen, so nobody can lock the operator out of their own panel. */
export default async function AdminStaff() {
  const session = await getCurrentAdminSession();
  if (!session) return null;
  if (!can(session, 'staff.manage')) return <NoAccess what="Staff accounts" />;

  return (
    <>
      <h1 className="adm__h1">Staff Accounts</h1>
      <p className="adm__sub">
        Logins for admins and agents. The role sets where an account starts; press{' '}
        <b>Access</b> on any row to tick exactly what that account may do — deposits,
        withdrawals, payment numbers, banners and the rest, one box each. Staff accounts
        themselves stay with the super admin alone.
      </p>
      <p className="adm__sub">
        Every account gets its own <b>link code</b>. When somebody registers through that
        code’s link they are added under that agent — the full link, and who is under
        whom, is on the <b>Agents</b> page.
      </p>
      <p className="adm__sub">
        The super admin login (<b>{superAdminUsername()}</b>) lives in the server's{' '}
        <code>.env</code> — it never appears in this list and cannot be deleted here.
      </p>
      <StaffControl initialStaff={await listStaff()} />
    </>
  );
}
