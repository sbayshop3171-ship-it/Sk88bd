'use client';

import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from './AuthProvider';
import GameLoading from './GameLoading';
import { toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';
import { t } from '@/lib/strings';

/**
 * Every game is open to look at.
 *
 * A visitor walks into any game and watches it run — the board, the odds, the
 * crowd, the artwork. What needs an account and a balance is *staking money*,
 * so the gate no longer stands in front of the screen. It hands the game a
 * `requireFunds()` to call the moment a bet is attempted, and only then does
 * the login or deposit sheet come up.
 *
 * The gate stays fully open while `backendReady` is false: without Supabase
 * nobody can sign in at all, so prompting would be asking for something that
 * cannot be done.
 */

type Block = 'login' | 'deposit';

const GateCtx = createContext<() => boolean>(() => true);

/** Call this before staking. `true` means go ahead; `false` means the prompt
    has been raised and the bet must not be sent. */
export const useGameGate = () => useContext(GateCtx);

export default function GameGate({ children }: { children: React.ReactNode }) {
  const { ready, backendReady, session, wallet } = useAuth();
  const [prompt, setPrompt] = useState<Block | null>(null);

  /* Session still resolving, or no backend at all: let the tap through rather
     than flash a login sheet at somebody who is in fact signed in. The server
     refuses an unfunded bet anyway — this is the courtesy layer, not the
     defence. */
  const block: Block | null =
    !backendReady || !ready
      ? null
      : !session
        ? 'login'
        : wallet && wallet.balance <= 0
          ? 'deposit'
          : null;

  const requireFunds = useCallback(() => {
    if (!block) return true;
    setPrompt(block);
    return false;
  }, [block]);

  // topping up in another tab shouldn't leave a stale sheet sitting there
  useEffect(() => { if (!block) setPrompt(null); }, [block]);

  return (
    <GateCtx.Provider value={requireFunds}>
      <GameLoading>{children}</GameLoading>
      {prompt && (
        <GateSheet
          kind={prompt}
          balance={wallet ? toTaka(wallet.balance) : 0}
          onClose={() => setPrompt(null)}
        />
      )}
    </GateCtx.Provider>
  );
}

/** The sheet rides over the game. Games ask the browser for real fullscreen,
    and in that mode only the fullscreen element paints — so the sheet moves
    inside it, the same way the loading curtain does. */
function GateSheet({
  kind,
  balance,
  onClose,
}: {
  kind: Block;
  balance: number;
  onClose: () => void;
}) {
  const [host, setHost] = useState<Element | null>(null);

  useEffect(() => {
    const sync = () => setHost(document.fullscreenElement);
    sync();
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sheet = (
    <div className="gsheet" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="gsheet__card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="gsheet__x" aria-label="বন্ধ করুন" onClick={onClose}>×</button>

        {kind === 'login' ? (
          <>
            <span className="gsheet__icon" aria-hidden>🔒</span>
            <h2 className="gsheet__title">বাজি ধরতে লগইন করুন</h2>
            <p className="gsheet__note">
              গেম দেখতে কিছু লাগে না, কিন্তু টাকা দিয়ে খেলতে অ্যাকাউন্ট লাগবে।
              লগইন করলে আপনার ব্যালেন্স নিয়ে সরাসরি খেলতে পারবেন।
            </p>
            <div className="gsheet__acts">
              <Link href="/login" className="btn btn--gold btn--block">{t.login}</Link>
              <Link href="/register" className="btn btn--ghost btn--block">{t.registerNow}</Link>
            </div>
          </>
        ) : (
          <>
            <span className="gsheet__icon" aria-hidden>💰</span>
            <h2 className="gsheet__title">ব্যালেন্স শূন্য</h2>
            <p className="gsheet__note">
              বাজি ধরতে ব্যালেন্সে টাকা থাকতে হবে। ডিপোজিট করলে সাথে সাথেই এই
              গেমেই খেলতে পারবেন।
            </p>
            <p className="gsheet__bal">এখন আছে {money(balance)}</p>
            <div className="gsheet__acts">
              <Link href="/deposit" className="btn btn--gold btn--block">{t.deposit} করুন</Link>
              <button type="button" className="btn btn--ghost btn--block" onClick={onClose}>
                দেখতে থাকি
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return host ? createPortal(sheet, host) : sheet;
}
