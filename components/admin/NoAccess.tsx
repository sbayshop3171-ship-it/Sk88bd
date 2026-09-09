import { ROLE_HELP, ROLE_LABEL, type AdminRole } from '@/lib/admin-roles';

/** What a screen shows when the signed-in staff member may not be here.
    The nav already hides the tab; this catches a typed URL or a bookmark
    kept from before a role changed. */
export default function NoAccess({ role, what }: { role: AdminRole; what: string }) {
  return (
    <>
      <h1 className="adm__h1">No access</h1>
      <p className="adm__sub">
        {what} is for {role === 'agent' ? 'admins and super admins' : 'the super admin'} only.
        Your role is <b>{ROLE_LABEL[role]}</b> — {ROLE_HELP[role]}
      </p>
      <p className="adm__sub">If you need it, ask the super admin to change your role.</p>
    </>
  );
}
