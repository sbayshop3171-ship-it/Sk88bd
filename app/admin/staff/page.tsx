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
  if (!can(session.role, 'staff.manage')) return <NoAccess role={session.role} what="স্টাফ অ্যাকাউন্ট" />;

  return (
    <>
      <h1 className="adm__h1">স্টাফ অ্যাকাউন্ট</h1>
      <p className="adm__sub">
        অ্যাডমিন আর এজেন্টদের লগইন। এজেন্ট শুধু ডিপোজিট-উইথড্র অনুমোদন করতে আর
        ইউজার দেখতে পারে — <b>পেমেন্ট নাম্বার বদলাতে পারে না</b>। অ্যাডমিন গেম,
        ব্যানার আর ব্যালেন্সও সামলাতে পারে, কিন্তু পেমেন্ট নাম্বার শুধু সুপার
        অ্যাডমিনের হাতে।
      </p>
      <p className="adm__sub">
        সুপার অ্যাডমিনের লগইন (<b>{superAdminUsername()}</b>) সার্ভারের{' '}
        <code>.env</code> এ থাকে — এই তালিকায় আসে না, এখান থেকে মোছাও যায় না।
      </p>
      <StaffControl initialStaff={await listStaff()} />
    </>
  );
}
