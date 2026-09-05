'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { t } from '@/lib/strings';

/**
 * Games are for signed-in players only.
 *
 * The gate stays open while `backendReady` is false: without Supabase nobody
 * can sign in at all, so closing it would lock the whole lobby out rather
 * than ask anyone to log in. Wire the database up and every game screen
 * starts asking for a session on its own — no further change needed here.
 */
export default function GameGate({ children }: { children: React.ReactNode }) {
  const { ready, backendReady, session } = useAuth();

  if (!backendReady || session) return <>{children}</>;

  // Session still resolving: hold the screen rather than flash the prompt at
  // a player who is in fact signed in.
  if (!ready) {
    return (
      <div className="gate">
        <span className="gate__spin" aria-hidden />
        <p className="gate__wait">লোড হচ্ছে…</p>
      </div>
    );
  }

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
