import BonusControl from '@/components/admin/BonusControl';
import NoAccess from '@/components/admin/NoAccess';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { can } from '@/lib/admin-roles';
import { getBonusConfig } from '@/lib/bonus-config-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** What the house pays out that a player did not win at a game: the daily
    sign-in, the rescue fund, the rebate and the promo codes. Every figure
    here moves real money the moment it is saved, so it sits behind the same
    permission as the cashier itself. */
export default async function AdminBonus() {
  const session = await getCurrentAdminSession();
  if (!session) return null;
  if (!can(session, 'cashier.config')) return <NoAccess what="bonus rules" />;

  return (
    <>
      <h1 className="adm__h1">Bonuses</h1>
      <p className="adm__sub">
        What the sign-in, the rescue fund, the rebate and the promo codes pay. Saved here, live
        on the member screens straight away.
      </p>
      <BonusControl initial={await getBonusConfig()} />
    </>
  );
}
