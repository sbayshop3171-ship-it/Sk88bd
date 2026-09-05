import { NextResponse } from 'next/server';
import { activeSorted } from '@/lib/site-content';
import { getSiteContent } from '@/lib/site-content-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Active slides for the home carousel and the first-visit popup. Public: it
    is the same promo copy already rendered into the page. */
export async function GET() {
  const { banners, announcements } = await getSiteContent();

  return NextResponse.json(
    { ok: true, banners: activeSorted(banners), announcements: activeSorted(announcements) },
    { headers: { 'cache-control': 'no-store' } },
  );
}
