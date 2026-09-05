import { NextResponse } from 'next/server';
import { listOverrides } from '@/lib/game-control-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Which games the operator has hidden, re-badged or pinned. Public — it only
    describes what the lobby is about to render anyway. */
export async function GET() {
  return NextResponse.json(
    { ok: true, overrides: await listOverrides() },
    { headers: { 'cache-control': 'no-store' } },
  );
}
