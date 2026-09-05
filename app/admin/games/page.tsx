import DataTable from '@/components/admin/DataTable';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { CATALOGUE, HOME_SECTIONS } from '@/lib/catalogue';
import { CATEGORY_LABEL } from '@/lib/strings';

/**
 * Until the `games` table is live this lists what ships in lib/catalogue.ts,
 * so the screen is useful for auditing coverage today — in particular which
 * games still have no artwork.
 */
export default async function AdminGames() {
  if (!(await getCurrentAdminSession())) return null;

  // flatten once, then derive both the table and the counters from it
  const games = HOME_SECTIONS.flatMap((cat) =>
    CATALOGUE[cat].map((g) => ({ ...g, categoryLabel: CATEGORY_LABEL[cat] })),
  );

  const rows = games.map((g) => [
    g.name,
    g.provider,
    g.categoryLabel,
    g.thumb
      ? <span className="adm__ok">আছে</span>
      : <span className="adm__miss">জেনারেটেড আর্ট</span>,
    g.id === 'aviator'
      ? <span className="adm__ok">চালু</span>
      : <span className="adm__muted">শুধু তালিকায়</span>,
    g.tag ?? '—',
  ]);

  const withArt = games.filter((g) => Boolean(g.thumb)).length;
  const playable = games.filter((g) => g.id === 'aviator').length;

  return (
    <>
      <h1 className="adm__h1">গেম</h1>
      <p className="adm__sub">
        আর্ট আসে <code>public/games/icons/</code> থেকে; তালিকাটি{' '}
        <code>scripts/sync_icons.sh</code> দিয়ে <code>lib/catalogue.ts</code> এ
        রি-জেনারেট হয়। ডেটাবেস যুক্ত হলে এখান থেকেই আপলোড করা যাবে।
      </p>
      <div className="adm__tiles" style={{ marginBottom: 14 }}>
        <div className="adm__tile"><b>{games.length}</b><small>মোট গেম</small></div>
        <div className="adm__tile"><b>{withArt}</b><small>আর্ট বসানো</small></div>
        <div className="adm__tile"><b>{playable}</b><small>চালু গেম</small></div>
      </div>
      <DataTable
        columns={['গেম', 'প্রোভাইডার', 'ক্যাটাগরি', 'আর্ট', 'অবস্থা', 'ট্যাগ']}
        rows={rows}
      />
    </>
  );
}
