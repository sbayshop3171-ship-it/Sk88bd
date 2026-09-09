'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import PageHeader from '@/components/PageHeader';
import { CopyIcon, GiftIcon, MedalIcon, PencilIcon, RefreshIcon, UserIcon, UsersIcon } from '@/components/Icons';
import { useUI } from '@/components/UIProvider';
import { toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';

/* ============================================================
   Reward Center.

   The reference's version is a hub, not a list: the same account
   card the member screen carries — with the VIP bar and a way
   into the benefits — over a block of big colour tiles, one per
   thing that pays.

   Three of those five need a payout behind them that we do not
   have yet (a daily check-in, a loss-back fund and a promo code
   to redeem). They are on the board because the board is the
   point, and each says so rather than opening an empty screen:
   a tile that quietly goes nowhere is worse than one that is
   honest about being next.
   ============================================================ */

type Tile = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** the tile's own colour, as the reference gives each one its own */
  tone: string;
  href?: string;
  badge?: number;
};

const TILES: Tile[] = [
  { key: 'bonus',  label: 'Bonus',         icon: GiftIcon,  tone: 'green', href: '/promotions' },
  { key: 'signin', label: 'Sign In',       icon: MedalIcon, tone: 'blue' },
  { key: 'rescue', label: 'Rescue fund',   icon: RefreshIcon, tone: 'amber' },
  { key: 'invite', label: 'Invite Friends', icon: UsersIcon, tone: 'pink', href: '/refer' },
  { key: 'promo',  label: 'Promo Code',    icon: CopyIcon,  tone: 'cyan' },
];

export default function RewardPage() {
  const { ready, session, profile, wallet, refresh } = useAuth();
  const { toast } = useUI();
  const [spinning, setSpinning] = useState(false);

  const signedIn = ready && Boolean(session);
  const userId = profile?.phone ?? '';
  const nickname = profile?.display_name || userId || 'Player';
  const level = profile?.vip_level ?? 0;

  const copyId = async () => {
    if (!userId) return;
    try {
      await navigator.clipboard.writeText(userId);
      toast('ID copied');
    } catch {
      toast('Could not copy');
    }
  };

  const reload = async () => {
    setSpinning(true);
    await refresh();
    setTimeout(() => setSpinning(false), 600);
  };

  return (
    <>
      <PageHeader title="Reward Center" />

      <div className="rc">
        <div className="rc__card">
          <Link href="/member" className="mc__signin">
            <span aria-hidden>☑</span> Sign In <i aria-hidden>›</i>
          </Link>

          <div className="rc__top">
            <span className="mc__av" aria-hidden><UserIcon /></span>
            <div className="rc__who">
              {signedIn ? (
                <>
                  <div className="mc__id">
                    <b>{userId}</b>
                    <button type="button" onClick={copyId} aria-label="Copy ID"><CopyIcon /></button>
                  </div>
                  <div className="mc__meta">
                    <span>Nickname: {nickname}</span>
                    <Link href="/my-profile" aria-label="Change name"><PencilIcon /></Link>
                  </div>
                </>
              ) : (
                <div className="mc__id"><b>Guest</b></div>
              )}
              <div className="rc__balrow">
                <b className="mc__bal">{money(toTaka(wallet?.balance ?? 0), 2)}</b>
                {signedIn && (
                  <button
                    type="button"
                    className={`mc__refresh${spinning ? ' is-spin' : ''}`}
                    onClick={reload}
                    aria-label="Refresh balance"
                  >
                    <RefreshIcon />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="rc__vip">
            <span className="rc__vipname"><MedalIcon /> VIP{level}</span>
            <Link href="/vip" className="rc__benefits">Benefits ›</Link>
          </div>
          <div className="rc__bar"><i style={{ width: `${Math.min(level, 1) * 100}%` }} /></div>
          <div className="rc__barnum">{level} / {Math.max(level + 1, 1)}</div>
        </div>

        <div className="rc__grid">
          {TILES.map((tile) => {
            const inner = (
              <>
                <span className="rc__ico">
                  <tile.icon />
                  {tile.badge ? <i className="rc__badge">{tile.badge}</i> : null}
                </span>
                <b>{tile.label}</b>
                {!tile.href && <small>শীঘ্রই</small>}
              </>
            );
            return tile.href ? (
              <Link key={tile.key} href={tile.href} className={`rc__tile is-${tile.tone}`}>{inner}</Link>
            ) : (
              <button
                key={tile.key}
                type="button"
                className={`rc__tile is-${tile.tone} is-soon`}
                onClick={() => toast('এই অফারটি শীঘ্রই চালু হবে')}
              >
                {inner}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
