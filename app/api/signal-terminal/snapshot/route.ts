import { NextResponse } from 'next/server';
import { getSignalTerminalSnapshot, type SignalGame } from '@/lib/aviator-signal-store';
import { authorizeSignalAccess } from '@/lib/signal-app-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!(await authorizeSignalAccess(req.headers.get('authorization')))) {
    return NextResponse.json(
      { ok: false, reason: 'unauthorized' },
      {
        status: 401,
        headers: corsHeaders(),
      },
    );
  }

  const { searchParams } = new URL(req.url);
  const rawGame = searchParams.get('game');
  const game: SignalGame = rawGame === 'crash' ? 'crash' : 'aviator';
  const snapshot = await getSignalTerminalSnapshot(game);

  return NextResponse.json(snapshot, {
    headers: corsHeaders(),
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function corsHeaders() {
  return {
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
  };
}
