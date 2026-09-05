'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';
import { t } from '@/lib/strings';

/**
 * Games are for signed-in players who have money to play with.
 *
 * The gate stays open while `backendReady` is false: without Supabase nobody
 * can sign in at all, so closing it would lock the whole lobby out rather than
 * ask anyone to log in. Wire the database up and every game screen starts
 * asking for a session — and for a balance — on its own.
 */
export default function GameGate({ children }: { children: React.ReactNode }) {
  const { ready, backendReady, session, wallet } = useAuth();

  if (!backendReady) return <>{children}</>;

  // Session still resolving: hold the screen rather than flash a prompt at a
  // player who is in fact signed in.
  if (!ready) {
    return (
      <div className="gate">
        <span className="gate__spin" aria-hidden />
        <p className="gate__wait">লোড হচ্ছে…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="gate">
        <span className="gate__lock" aria-hidden>🔒</span>
        <h1 className="gate__title">খেলতে হলে লগইন করুন</h1>
        <p className="gate__note">
          গেম খেলতে অ্যাকাউন্ট লাগবে। লগইন করলে আপনার ব্যালেন্স নিয়ে সরাসরি খেলতে
          পারবেন।
        </p>
        <div className="gate__acts">
          <Link href="/login" className="btn btn--gold btn--block">{t.login}</Link>
          <Link href="/register" className="btn btn--ghost btn--block">{t.registerNow}</Link>
        </div>
        <Link href="/" className="gate__back">← হোমে ফিরুন</Link>
      </div>
    );
  }

  // Signed in but broke. The wallet may still be loading, in which case
  // `wallet` is null and this would fire wrongly — so only an actual zero
  // balance closes the gate.
  if (wallet && wallet.balance <= 0) {
    return (
      <div className="gate">
        <span className="gate__lock" aria-hidden>💰</span>
        <h1 className="gate__title">ব্যালেন্স শূন্য</h1>
        <p className="gate__note">
          খেলার জন্য ব্যালেন্সে টাকা থাকতে হবে। ডিপোজিট করলে সাথে সাথেই খেলতে
          পারবেন।
        </p>
        <p className="gate__bal">এখন আছে {money(toTaka(wallet.balance))}</p>
        <div className="gate__acts">
          <Link href="/deposit" className="btn btn--gold btn--block">{t.deposit} করুন</Link>
          <Link href="/member" className="btn btn--ghost btn--block">আমার অ্যাকাউন্ট</Link>
        </div>
        <Link href="/" className="gate__back">← হোমে ফিরুন</Link>
      </div>
    );
  }

  return <>{children}</>;
}
