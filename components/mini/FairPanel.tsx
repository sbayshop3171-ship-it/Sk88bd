'use client';

import { money } from '@/lib/brand';
import {
  HOUSE_EDGE,
  MAX_PAYOUT_PAISA,
  MAX_STAKE_PAISA,
  MIN_STAKE_PAISA,
  type FairnessInfo,
} from '@/lib/mini-games';

/**
 * The commit–reveal receipt: how the draw works, the player's own seed, and
 * the proof for the round just settled. GameShell folds it away under a
 * strip; JetX gives it a tab of its own, so the body lives here rather than
 * being written twice.
 */
export default function FairPanel({
  fairness,
  clientSeed,
  onNewSeed,
}: {
  fairness: FairnessInfo | null;
  clientSeed: string;
  onNewSeed: () => void;
}) {
  return (
    <div className="mg__fair">
      <p>
        <b>Before</b> you bet, the server picks a secret seed and shows you its
        SHA-256 hash. The result comes from SHA-256(server seed : your seed :
        nonce). When the round ends the server seed is revealed — check the hash
        yourself and you can see the result was fixed before you played. The house
        edge is{' '}{Math.round(HOUSE_EDGE * 100)}%, so the RTP is {Math.round((1 - HOUSE_EDGE) * 100)}%.
      </p>

      <label className="mg__seed">
        <span>Your seed</span>
        <input value={clientSeed} readOnly />
        <button type="button" onClick={onNewSeed}>New</button>
      </label>

      {fairness ? (
        <dl className="mg__proof">
          <div><dt>Server seed hash</dt><dd><code>{fairness.serverSeedHash}</code></dd></div>
          {fairness.serverSeed && (
            <div><dt>Server seed (revealed)</dt><dd><code>{fairness.serverSeed}</code></dd></div>
          )}
          <div><dt>Your seed</dt><dd><code>{fairness.clientSeed}</code></dd></div>
          <div><dt>Nonce</dt><dd><code>{fairness.nonce}</code></dd></div>
        </dl>
      ) : (
        <p className="mg__hint">Play a round and the proof for it shows up here.</p>
      )}

      <p className="mg__hint">
        Stake {money(MIN_STAKE_PAISA / 100)} — {money(MAX_STAKE_PAISA / 100)} ·
        max win per round {money(MAX_PAYOUT_PAISA / 100)}
      </p>
    </div>
  );
}
