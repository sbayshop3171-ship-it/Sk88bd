import { NextResponse } from 'next/server';
import { getSiteSettings } from '@/lib/site-settings-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Cashier limits, support links and the notice line. Public: the deposit
    and withdraw screens print them, and the support buttons link to them. */
export async function GET() {
  return NextResponse.json(
    { ok: true, settings: await getSiteSettings() },
    { headers: { 'cache-control': 'no-store' } },
  );
}
