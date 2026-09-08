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
        বাজি ধরার <b>আগেই</b> সার্ভার একটি গোপন সিড বেছে নেয় আর তার SHA-256
        হ্যাশ আপনাকে দেখায়। ফলাফল বের হয় SHA-256(সার্ভার সিড : আপনার সিড :
        নন্স) থেকে। রাউন্ড শেষ হলে সার্ভার সিডটি খুলে দেওয়া হয় — আপনি নিজে
        হ্যাশ মিলিয়ে দেখতে পারেন ফলাফল আগে থেকেই ঠিক করা ছিল। ঘরের প্রান্ত
        {' '}{Math.round(HOUSE_EDGE * 100)}%, অর্থাৎ RTP {Math.round((1 - HOUSE_EDGE) * 100)}%।
      </p>

      <label className="mg__seed">
        <span>আপনার সিড</span>
        <input value={clientSeed} readOnly />
        <button type="button" onClick={onNewSeed}>নতুন</button>
      </label>

      {fairness ? (
        <dl className="mg__proof">
          <div><dt>সার্ভার সিড হ্যাশ</dt><dd><code>{fairness.serverSeedHash}</code></dd></div>
          {fairness.serverSeed && (
            <div><dt>সার্ভার সিড (প্রকাশিত)</dt><dd><code>{fairness.serverSeed}</code></dd></div>
          )}
          <div><dt>আপনার সিড</dt><dd><code>{fairness.clientSeed}</code></dd></div>
          <div><dt>নন্স</dt><dd><code>{fairness.nonce}</code></dd></div>
        </dl>
      ) : (
        <p className="mg__hint">একটি রাউন্ড খেললে এখানে তার প্রমাণ দেখা যাবে।</p>
      )}

      <p className="mg__hint">
        বাজি {money(MIN_STAKE_PAISA / 100)} — {money(MAX_STAKE_PAISA / 100)} ·
        এক রাউন্ডে সর্বোচ্চ জয় {money(MAX_PAYOUT_PAISA / 100)}
      </p>
    </div>
  );
}
