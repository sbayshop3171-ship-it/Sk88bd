import { NextResponse } from 'next/server';
import { CRASHED_HOLD_MS, getAviatorSignalState, publicAviatorState } from '@/lib/aviator-signal-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Longest a `?wait=` request is held. Well under Cloudflare's 100s; a round
    still flying when it runs out simply asks again. */
const MAX_WAIT_MS = 25_000;

/** How long one worked-out answer serves everybody. */
const SHARE_MS = 250;

type Shared = {
  /** the payload without serverTime, as JSON text after the opening brace */
  rest: string;
  roundId: number;
  status: string;
  crashAt: number;
  /** the answer is good until here: SHARE_MS, or the round's next change */
  until: number;
};

let shared: Shared | null = null;
let working: Promise<Shared> | null = null;

/* Every viewer asks every two seconds, and every one of them used to get the
   round worked out afresh. The round only changes at its own moments —
   betting opens, the plane leaves, it busts, the next one is set — so one
   answer is shared until SHARE_MS passes or the next of those moments
   arrives, whichever is first; the bust is never served late. serverTime is
   stamped per request, so the board's clock stays exact. */
async function sharedState(): Promise<Shared> {
  const now = Date.now();
  if (shared && now < shared.until) return shared;
  working ??= (async () => {
    try {
      const state = await getAviatorSignalState();
      const at = Date.now();
      const round = state.currentRound;
      const crashAt = Date.parse(round.crash_at);
      const moments = [Date.parse(round.betting_at), Date.parse(round.fly_at), crashAt, crashAt + CRASHED_HOLD_MS]
        .filter((t) => Number.isFinite(t) && t > at);
      const { serverTime: _time, ...payload } = publicAviatorState(state);
      shared = {
        rest: JSON.stringify(payload).slice(1),
        roundId: round.round_id,
        status: round.status,
        crashAt,
        until: Math.min(at + SHARE_MS, ...moments),
      };
      return shared;
    } finally {
      working = null;
    }
  })();
  return working;
}

function reply(s: Shared) {
  const body = `{"serverTime":"${new Date().toISOString()}",${s.rest}`;
  return new NextResponse(body, {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
    },
  });
}

/* The board no longer knows where the plane will bust, so it has to be told
   the moment it does. `?wait=<round id>` holds the answer while that round is
   in the air and sends it just after the bust — the reply's timing is the
   bust itself, nothing earlier, so it gives nothing away. */
export async function GET(req: Request) {
  let s = await sharedState();
  const wait = Number(new URL(req.url).searchParams.get('wait'));

  if (wait > 0 && wait === s.roundId && s.status === 'flying') {
    const left = Math.max(0, s.crashAt - Date.now());
    await new Promise((done) => setTimeout(done, Math.min(left + 15, MAX_WAIT_MS)));
    s = await sharedState();
  }

  return reply(s);
}
