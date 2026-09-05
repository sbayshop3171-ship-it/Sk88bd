import { NextResponse } from 'next/server';
import { findGame } from '@/lib/catalogue';
import { resolveLaunch, type LaunchMode } from '@/lib/launch';

/* The launch call lives on the server so the aggregator key stays there.
   The browser only ever sees the URL that comes back. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') ?? '';
  const mode = (searchParams.get('mode') === 'real' ? 'real' : 'demo') as LaunchMode;

  const game = findGame(id);
  if (!game) return NextResponse.json({ ok: false, reason: 'unknown-game' }, { status: 404 });

  /* Real-money launches need a signed-in player and a wallet; until that is
     wired to the aggregator the site does not pretend otherwise. */
  if (mode === 'real') {
    return NextResponse.json({ ok: false, reason: 'no-aggregator' }, { status: 409 });
  }

  const result = await resolveLaunch(game, mode);
  return NextResponse.json(result, {
    status: result.ok ? 200 : 409,
    headers: { 'cache-control': 'no-store' },
  });
}
