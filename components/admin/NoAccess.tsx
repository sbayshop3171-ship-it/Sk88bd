import { ROLE_HELP, ROLE_LABEL, type AdminRole } from '@/lib/admin-roles';

/** What a screen shows when the signed-in staff member may not be here.
    The nav already hides the tab; this catches a typed URL or a bookmark
    kept from before a role changed. */
export default function NoAccess({ role, what }: { role: AdminRole; what: string }) {
  return (
    <>
      <h1 className="adm__h1">অনুমতি নেই</h1>
      <p className="adm__sub">
        {what} শুধু {role === 'agent' ? 'অ্যাডমিন ও সুপার অ্যাডমিন' : 'সুপার অ্যাডমিন'} দেখতে
        পারেন। আপনার রোল <b>{ROLE_LABEL[role]}</b> — {ROLE_HELP[role]}
      </p>
      <p className="adm__sub">দরকার হলে সুপার অ্যাডমিনকে বলুন রোল বদলে দিতে।</p>
    </>
  );
}
