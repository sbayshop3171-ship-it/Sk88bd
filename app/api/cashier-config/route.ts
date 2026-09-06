import { NextResponse } from 'next/server';
import { getCashierConfig } from '@/lib/cashier-config-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The admin's cashier design. Public: the deposit and withdraw screens
    draw their methods, amounts and copy from it. */
export async function GET() {
  return NextResponse.json(
    { ok: true, config: await getCashierConfig() },
    { headers: { 'cache-control': 'no-store' } },
  );
}
