/** What a screen shows when the signed-in staff member may not be here.
    The nav already hides the tab; this catches a typed URL or a bookmark
    kept from before a permission was taken away. */
export default function NoAccess({ what }: { what: string }) {
  return (
    <>
      <h1 className="adm__h1">No access</h1>
      <p className="adm__sub">{what} is not turned on for your account.</p>
      <p className="adm__sub">
        If you need it, ask the super admin to tick it for you on the Staff page.
      </p>
    </>
  );
}
