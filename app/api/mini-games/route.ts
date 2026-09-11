import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  cashOutFlight,
  flightState,
  playInstant,
  takeOff,
  type InstantBet,
} from '@/lib/mini-games-play';
import { isMiniGame, MINI_GAMES } from '@/lib/mini-games';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** ?game=crash — is anything of this player's still in the air? */
export async function GET(req: Request) {
  const game = new URL(req.url).searchParams.get('game') ?? '';
  if (!isFlight(game)) return json({ ok: false, reason: 'unknown-game' }, 400);
  const state = await flightState(await cookieAdapter(), game);
  // a visitor who is not signed in has nothing in the air — not an error
  if (!state.ok && (state as { reason?: string }).reason === 'unauthorized') {
    return json({ ok: true, round: null, serverNow: Date.now() });
  }
  return reply(state);
}

/**
 * { action: 'play', game, stake, clientSeed, ...terms }  — instant games
 * { action: 'takeoff', game, stake, clientSeed }         — crash / jetx
 * { action: 'cashout', game }                            — crash / jetx
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: 'invalid-json' }, 400);
  }
  if (!body || typeof body !== 'object') return json({ ok: false, reason: 'invalid-action' }, 400);

  const record = body as Record<string, unknown>;
  const game = String(record.game ?? '');
  if (!isMiniGame(game)) return json({ ok: false, reason: 'unknown-game' }, 400);

  const store = await cookieAdapter();

  if (record.action === 'takeoff') {
    if (!isFlight(game)) return json({ ok: false, reason: 'unknown-game' }, 400);
    return reply(await takeOff(store, game, Number(record.stake), String(record.clientSeed ?? '')));
  }

  if (record.action === 'cashout') {
    if (!isFlight(game)) return json({ ok: false, reason: 'unknown-game' }, 400);
    return reply(await cashOutFlight(store, game));
  }

  if (record.action === 'play') {
    if (MINI_GAMES[game].kind !== 'instant') return json({ ok: false, reason: 'unknown-game' }, 400);
    const bet: InstantBet = {
      game,
      stake: Number(record.stake),
      clientSeed: String(record.clientSeed ?? ''),
      target: record.target === undefined ? undefined : Number(record.target),
      mode: record.mode as InstantBet['mode'],
      rows: record.rows === undefined ? undefined : Number(record.rows),
      risk: record.risk as InstantBet['risk'],
      side: record.side as InstantBet['side'],
    };
    return reply(await playInstant(store, bet));
  }

  return json({ ok: false, reason: 'invalid-action' }, 400);
}

const isFlight = (id: string): id is 'crash' | 'jetx' => id === 'crash' || id === 'jetx';

function reply(result: { ok: boolean; reason?: string }) {
  if (result.ok) return json(result);
  return json(result, result.reason === 'unauthorized' ? 401 : 400);
}

/** next/headers hands back a store with `set`, while @supabase/ssr wants
    getAll/setAll — bridge the two shapes. */
async function cookieAdapter() {
  const store = await cookies();
  return {
    getAll: () => store.getAll().map((c) => ({ name: c.name, value: c.value })),
    setAll: (list: { name: string; value: string; options?: object }[]) => {
      for (const c of list) store.set(c.name, c.value, c.options);
    },
  };
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'cache-control': 'no-store' } });
}
