import { NextResponse } from 'next/server';
import { getAviatorSignalState, publicAviatorState } from '@/lib/aviator-signal-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Longest a `?wait=` request is held. Well under Cloudflare's 100s; a round
    still flying when it runs out simply asks again. */
const MAX_WAIT_MS = 25_000;

/* The board no longer knows where the plane will bust, so it has to be told
   the moment it does. `?wait=<round id>` holds the answer while that round is
   in the air and sends it just after the bust — the reply's timing is the
   bust itself, nothing earlier, so it gives nothing away. */
export async function GET(req: Request) {
  let state = await getAviatorSignalState();
  const wait = Number(new URL(req.url).searchParams.get('wait'));
  const round = state.currentRound;

  if (wait > 0 && wait === round.round_id && round.status === 'flying') {
    const left = Math.max(0, Date.parse(round.crash_at) - Date.now());
    await new Promise((done) => setTimeout(done, Math.min(left + 15, MAX_WAIT_MS)));
    state = await getAviatorSignalState();
  }

  return NextResponse.json(publicAviatorState(state), {
    headers: {
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
    },
  });
}
