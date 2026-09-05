'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';

/**
 * The player's wallet balance, shown on game screens so it is always in view
 * while playing. Renders nothing until there is a session — a signed-out
 * visitor has no balance to show, and on a database-less build there is no
 * session at all.
 */
export default function PlayBalance() {
  const { ready, session, wallet } = useAuth();

  if (!ready || !session) return null;

  return (
    <Link href="/deposit" className="bal-pill" title="ডিপোজিট করুন">
      <b>{money(toTaka(wallet?.balance ?? 0))}</b>
      <i className="av" aria-hidden>＋</i>
    </Link>
  );
}
