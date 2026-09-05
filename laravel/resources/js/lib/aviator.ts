/* ============================================================
   Aviator — the browser half.

   This file draws the curve and nothing else. The seed, the crash point and
   every payout are decided by the server (app/Support/CrashEngine.php and
   AviatorController); the constants below only have to match so the animation
   lands where the server says the round ended.

   Fairness model (commit–reveal):
     1. Before betting opens the server generates the round's serverSeed and
        publishes only its SHA-256 hash.
     2. The player's clientSeed is mixed into the draw.
     3. The crash point is derived from SHA-256(serverSeed:clientSeed:nonce).
     4. After the bust the serverSeed is published. Anyone can re-hash it,
        check it matches the committed hash and recompute the crash point —
        proving the round was fixed before any bet was placed.
   ============================================================ */

export type Phase = 'betting' | 'flying' | 'crashed';

/** Must match App\Support\CrashEngine. */
export const GROWTH = 0.0625;

/** Only the signed-out preview draws its own crash point; see useAviatorRound. */
export const HOUSE_EDGE = 0.03;

/** Multiplier as a function of elapsed flight time. 2x lands near 11s. */
export const multiplierAt = (elapsedMs: number) => Math.exp(GROWTH * (elapsedMs / 1000));

/** Inverse: flight time needed to reach a multiplier. */
export const timeToReach = (m: number) => (Math.log(m) / GROWTH) * 1000;

export function bandFor(m: number): 'low' | 'mid' | 'high' {
    if (m < 2) return 'low';
    if (m < 10) return 'mid';
    return 'high';
}

export const fmtX = (m: number) => `${m.toFixed(2)}x`;

export interface HistoryEntry {
    id: number;
    nonce: number;
    crash_at: number;
}

/** What POST /game/aviator/rounds hands back. */
export interface OpenRound {
    round_id: number;
    nonce: number;
    server_seed_hash: string;
    client_seed: string;
    /** epoch ms — take-off, i.e. when the betting window closes */
    starts_at: number;
    /** the server's clock at the moment it answered, for drift correction */
    server_now: number;
    balance: number;
}

/** What POST /game/aviator/rounds/{id}/settle hands back. */
export interface SettledRound {
    round_id: number;
    nonce: number;
    crash_at: number;
    server_seed: string;
    server_seed_hash: string;
    client_seed: string;
    balance: number;
    history: HistoryEntry[];
}
