/* ============================================================
   Game launch.

   This mirrors how the reference lobby does it, because there is
   only one way it can be done. A tile carries an aggregator game
   code; opening it calls the aggregator's launch API with that
   code and a mode, and the aggregator answers with a one-shot,
   tokenised URL on the provider's own host, which the page frames:

     JDB   agg.jdb711.com/?...&gameType=9&mType=9004&x=<token>
     JILI  casino-wbgame.jiligames.com/tcb/?ssoKey=<token>&gameId=460
           &loginFrom=trial&demo=true

   The token is minted against an OPERATOR ACCOUNT. That is the
   whole of it: there is no public URL for these games, in demo
   mode or otherwise, and a token lifted from another operator is
   their credential, expires in minutes, and bills their contract.
   So this module has two paths:

   • AGGREGATOR_LAUNCH_URL + AGGREGATOR_KEY set → ask the
     aggregator, server-side, so the key never reaches a browser.
     This is the path that lights up all 200 games.
   • nothing set → fall back to the handful of provider demo pages
     that need no operator at all (lib/catalogue DEMOS), so the
     flow is real and testable today.
   ============================================================ */

import { demoUrl, type Game } from './catalogue';

export type LaunchMode = 'demo' | 'real';

export type LaunchResult =
  | { ok: true; url: string; mode: LaunchMode }
  | { ok: false; reason: 'no-aggregator' | 'no-demo' | 'upstream' };

const ENDPOINT = process.env.AGGREGATOR_LAUNCH_URL;
const KEY = process.env.AGGREGATOR_KEY;

/** True once an aggregator contract is wired up. */
export const hasAggregator = Boolean(ENDPOINT && KEY);

/**
 * Resolve a playable URL for one game.
 *
 * Server-side only — it reads the aggregator key. Never import this
 * from a client component; go through /api/launch instead.
 */
export async function resolveLaunch(game: Game, mode: LaunchMode = 'demo'): Promise<LaunchResult> {
  /* A provider's own public fun-mode page beats a minted token when we have
     one: it never expires and costs no operator call. */
  const publicDemo = demoUrl(game.id);
  if (mode === 'demo' && publicDemo) return { ok: true, url: publicDemo, mode };

  if (!hasAggregator) return { ok: false, reason: 'no-aggregator' };
  if (!game.code) return { ok: false, reason: 'no-demo' };
  if (mode === 'demo' && !game.demo) return { ok: false, reason: 'no-demo' };

  try {
    const res = await fetch(ENDPOINT!, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
      /* The shape most aggregators expect: the game code, the mode, and the
         provider id (Evolution is 59, JILI 49, JDB 50 … — the same ids the
         catalogue carries in `providerId`). An Evolution table is launched by
         its own code the same way a slot is; the aggregator maps code+provider
         to the right host (evo-games.com for Evolution) and mints the session.
         Adjust the field names here to the aggregator's docs once chosen — the
         rest of the app is already downstream of the URL this returns. */
      body: JSON.stringify({
        gameCode: game.code,
        provider: game.provider,
        mode,
        lang: 'en',
        currency: 'BDT',
      }),
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, reason: 'upstream' };
    /* Accept the field an aggregator is most likely to name the launch URL. */
    const data = (await res.json()) as { url?: string; launchUrl?: string; gameUrl?: string };
    const url = data.url ?? data.launchUrl ?? data.gameUrl;
    return url ? { ok: true, url, mode } : { ok: false, reason: 'upstream' };
  } catch {
    return { ok: false, reason: 'upstream' };
  }
}

/** Can this game open at all right now, aggregator or not? */
export const canLaunch = (game: Game): boolean =>
  Boolean(demoUrl(game.id)) || (hasAggregator && Boolean(game.code) && Boolean(game.demo));
