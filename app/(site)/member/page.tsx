'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import PageHeader from '@/components/PageHeader';
import { useUI } from '@/components/UIProvider';
import {
  BankIcon, ChatIcon, CopyIcon, DepositIcon, DownloadIcon, GiftIcon, LedgerIcon,
  LogoutIcon, MedalIcon, PencilIcon, RebateIcon, RecordIcon, RefreshIcon,
  ShieldIcon, TargetIcon, TrendIcon, UserIcon, UsersIcon, WithdrawIcon,
} from '@/components/Icons';
import { toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';
import { t } from '@/lib/strings';

type Tile = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  /** small count bubble on the icon */
  badge?: number;
};

const TILES: Tile[] = [
  { icon: GiftIcon,     label: 'Reward Center',     href: '/reward' },
  { icon: RecordIcon,   label: 'Betting Record',    href: '/bets-history' },
  { icon: TrendIcon,    label: 'Profit & Loss',     href: '/balance-overview' },
  { icon: DepositIcon,  label: 'Deposit Record',    href: '/deposit-history' },
  { icon: WithdrawIcon, label: 'Withdraw Record',   href: '/withdraw-history' },
  { icon: LedgerIcon,   label: 'Account Record',    href: '/account-statement' },
  { icon: UserIcon,     label: 'My Account',        href: '/my-profile' },
  { icon: ShieldIcon,   label: 'Security Center',   href: '/security' },
  { icon: UsersIcon,    label: 'Invite a Friend',   href: '/refer' },
  { icon: TargetIcon,   label: 'Mission',           href: '/promotions' },
  { icon: RebateIcon,   label: 'Rebate',            href: '/turnover' },
  { icon: MedalIcon,    label: 'VIP Club',          href: '/vip' },
  { icon: DownloadIcon, label: 'App Download',      href: '/download' },
  { icon: ChatIcon,     label: 'Customer Service',  href: '/support' },
];

export default function MemberPage() {
  const router = useRouter();
  const { toast } = useUI();
  const { ready, session, profile, wallet, signOut, refresh } = useAuth();
  const [spinning, setSpinning] = useState(false);

  const signedIn = ready && Boolean(session);
  const userId = profile?.phone ?? '';
  const nickname = profile?.display_name || userId || 'Player';

  /* Supabase stamps the auth row, and that is the account's real birthday —
     `profiles` has its own created_at but the provider does not load it. */
  const joined = session?.user.created_at
    ? new Date(session.user.created_at).toLocaleDateString('en-CA')
    : null;

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
    // let the turn finish even when the request comes back instantly
    setTimeout(() => setSpinning(false), 600);
  };

  return (
    <>
      <PageHeader title="My Account" />

      <div className="mc">
        <div className="mc__card">
          <div className="mc__top">
            <span className="mc__av" aria-hidden><UserIcon /></span>

            <div className="mc__who">
              <span className="mc__vip">★ VIP{profile?.vip_level ?? 0}</span>

              {signedIn ? (
                <>
                  <div className="mc__id">
                    <b>{userId}</b>
                    <button type="button" onClick={copyId} aria-label="Copy ID">
                      <CopyIcon />
                    </button>
                  </div>
                  <div className="mc__meta">
                    <span>Name: {nickname}</span>
                    <Link href="/my-profile" aria-label="Change name"><PencilIcon /></Link>
                  </div>
                  {joined && <div className="mc__meta">Joined: {joined}</div>}
                </>
              ) : (
                <>
                  <div className="mc__id"><b>Guest</b></div>
                  <div className="mc__meta">Log in to play</div>
                </>
              )}
            </div>
          </div>

          <div className="mc__balrow">
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

          {signedIn ? (
            <div className="mc__acts">
              <Link href="/deposit"><DepositIcon />{t.deposit}</Link>
              <Link href="/withdraw"><WithdrawIcon />{t.withdraw}</Link>
              <Link href="/withdraw"><BankIcon />Bank Account</Link>
            </div>
          ) : (
            <div className="mc__acts">
              <Link href="/login">{t.login}</Link>
              <Link href="/register" className="is-gold">{t.registerNow}</Link>
            </div>
          )}
        </div>

        <div className="mc__sechd">
              <span>Member Center</span>
          <i aria-hidden />
        </div>

        <div className="mc__grid">
          {TILES.map((tile) => (
            <Link className="mc__tile" key={tile.href + tile.label} href={tile.href}>
              <span className="mc__ico">
                <tile.icon />
                {tile.badge ? <i className="mc__badge">{tile.badge}</i> : null}
              </span>
              <span className="mc__lbl">{tile.label}</span>
            </Link>
          ))}

          {signedIn && (
            <button
              type="button"
              className="mc__tile"
              onClick={async () => { await signOut(); toast('Logged out'); router.push('/'); }}
            >
              <span className="mc__ico"><LogoutIcon /></span>
              <span className="mc__lbl">{t.logout}</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
