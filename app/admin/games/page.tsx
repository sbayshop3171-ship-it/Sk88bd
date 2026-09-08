import NoAccess from '@/components/admin/NoAccess';
import GameControl from '@/components/admin/GameControl';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { can } from '@/lib/admin-roles';
import { CATALOGUE, HOME_SECTIONS, PLAYABLE_IDS } from '@/lib/catalogue';
import { listOverrides } from '@/lib/game-control-store';
import { CATEGORY_LABEL } from '@/lib/strings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * lib/catalogue.ts stays the list of what exists — it is regenerated from the
 * icon pack. This screen layers the operator's decisions on top: hide a game,
 * change its badge, pin it to the front of its category.
 */
export default async function AdminGames() {
  const session = await getCurrentAdminSession();
  if (!session) return null;
  if (!can(session.role, 'games.write')) return <NoAccess role={session.role} what="গেম কন্ট্রোল" />;

  // 35 of the 209 games sit in more than one category (Aviator is both hot and
  // jackpot). An override applies to the game, not to one of its listings, so
  // collapse to one row per id and show every category it appears in.
  const rows = new Map<string, {
    id: string; name: string; provider: string; category: string;
    catalogueTag: string | null; thumb: string | null; hasArt: boolean; playable: boolean;
  }>();

  for (const cat of HOME_SECTIONS) {
    for (const g of CATALOGUE[cat]) {
      const existing = rows.get(g.id);
      if (existing) {
        existing.category += `, ${CATEGORY_LABEL[cat]}`;
        continue;
      }
      rows.set(g.id, {
        id: g.id,
        name: g.name,
        provider: g.provider,
        category: CATEGORY_LABEL[cat],
        catalogueTag: g.tag ?? null,
        thumb: g.thumb ?? null,
        hasArt: Boolean(g.thumb),
        playable: PLAYABLE_IDS.includes(g.id),
      });
    }
  }

  const games = [...rows.values()];

  return (
    <>
      <h1 className="adm__h1">গেম</h1>
      <p className="adm__sub">
        কোন গেম সাইটে দেখা যাবে, কোনটায় HOT/NEW ব্যাজ বসবে আর কোনটা তালিকার
        উপরে থাকবে — সব এখান থেকে। তালিকাটি নিজে আসে{' '}
        <code>lib/catalogue.ts</code> থেকে, আর আর্ট{' '}
        <code>public/games/icons/</code> থেকে।
      </p>
      <GameControl games={games} initialOverrides={await listOverrides()} />
    </>
  );
}
