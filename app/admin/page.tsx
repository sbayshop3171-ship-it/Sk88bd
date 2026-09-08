import Link from 'next/link';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { can, type AdminPermission } from '@/lib/admin-roles';
import { CATALOGUE, HOME_SECTIONS } from '@/lib/catalogue';
import { listOverrides } from '@/lib/game-control-store';
import { cashierStats } from '@/lib/cashier';
import { listAccounts } from '@/lib/payment-accounts-store';
import { activeSorted } from '@/lib/site-content';
import { getSiteContent } from '@/lib/site-content-store';
import { toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';
import { isBackendReady } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** label, value, where it links, and the permission that earns it */
type Tile = [string, string, string, AdminPermission];

/**
 * Two groups on purpose. The first counts things this server actually stores,
 * so every number is real. The second is the cashier and player figures, which
 * live in Supabase — they stay marked as unavailable rather than showing a
 * zero that reads like "no deposits today".
 *
 * Every tile carries the permission its screen needs, so an agent's dashboard
 * is the four cashier numbers and nothing that links somewhere they cannot go.
 */
export default async function AdminDashboard() {
  const session = await getCurrentAdminSession();
  if (!session) return null;

  const [accounts, overrides, content, stats] = await Promise.all([
    listAccounts(),
    listOverrides(),
    getSiteContent(),
    cashierStats(),
  ]);

  // a game can be listed in several categories; count each one once
  const totalGames = new Set(HOME_SECTIONS.flatMap((cat) => CATALOGUE[cat].map((g) => g.id))).size;
  const hidden = overrides.filter((o) => o.status === 'hidden').length;
  const activeAccounts = accounts.filter((a) => a.status === 'active');
  const deposits = activeAccounts.filter((a) => a.use !== 'withdraw');

  const mine = (tiles: Tile[]) => tiles.filter(([, , , need]) => can(session.role, need));

  const live = mine([
    ['সক্রিয় পেমেন্ট নাম্বার', String(activeAccounts.length), '/admin/payments', 'payments.read'],
    ['ডিপোজিট নাম্বার', String(deposits.length), '/admin/payments', 'payments.read'],
    ['দেখানো গেম', String(totalGames - hidden), '/admin/games', 'games.write'],
    ['লুকানো গেম', String(hidden), '/admin/games', 'games.write'],
    ['হোম ব্যানার', String(activeSorted(content.banners).length), '/admin/banners', 'content.write'],
    ['ঘোষণা কার্ড', String(activeSorted(content.announcements).length), '/admin/banners', 'content.write'],
  ]);

  const cashier = stats.ok
    ? mine([
        ['পেন্ডিং ডিপোজিট', String(stats.data.pendingDeposits), '/admin/deposits', 'cashier.review'],
        ['পেন্ডিং উইথড্র', String(stats.data.pendingWithdrawals), '/admin/withdrawals', 'cashier.review'],
        ['আজকের ডিপোজিট', money(toTaka(stats.data.todayDeposited)), '/admin/deposits', 'cashier.review'],
        ['আজকের উইথড্র', money(toTaka(stats.data.todayWithdrawn)), '/admin/withdrawals', 'cashier.review'],
        ['মোট ইউজার', String(stats.data.totalPlayers), '/admin/users', 'players.read'],
      ])
    : [];

  return (
    <>
      <h1 className="adm__h1">ড্যাশবোর্ড</h1>
      <p className="adm__sub">এই সার্ভারে যা আছে তার হিসাব।</p>

      {live.length > 0 && (
        <div className="adm__tiles">
          {live.map(([label, value, href]) => (
            <Link className="adm__tile adm__tile--link" key={label} href={href}>
              <b>{value}</b>
              <small>{label}</small>
            </Link>
          ))}
        </div>
      )}

      <h2 className="adm__h2">প্লেয়ার ও ক্যাশিয়ার</h2>

      {cashier.length > 0 ? (
        <div className="adm__tiles">
          {cashier.map(([label, value, href]) => (
            <Link className="adm__tile adm__tile--link" key={label} href={href}>
              <b>{value}</b>
              <small>{label}</small>
            </Link>
          ))}
        </div>
      ) : (
        <>
          <p className="adm__sub">
            {isBackendReady()
              ? `ডেটাবেস থেকে হিসাব আনা গেল না${stats.ok ? '' : ` — ${stats.message ?? stats.reason}`}।`
              : 'এই হিসাবগুলো Supabase এ থাকে। ডেটাবেস যুক্ত হয়নি, তাই শূন্য না দেখিয়ে খালি রাখা হয়েছে।'}
          </p>
          <div className="adm__tiles">
            {['আজকের ডিপোজিট', 'আজকের উইথড্র', 'মোট ইউজার', 'পেন্ডিং রিকোয়েস্ট'].map((label) => (
              <div className="adm__tile adm__tile--off" key={label}>
                <b>—</b>
                <small>{label}</small>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
