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
  { icon: GiftIcon,     label: 'রিওয়ার্ড সেন্টার',   href: '/reward' },
  { icon: RecordIcon,   label: 'বেটিং রেকর্ড',       href: '/bets-history' },
  { icon: TrendIcon,    label: 'লাভ ও ক্ষতি',        href: '/balance-overview' },
  { icon: DepositIcon,  label: 'ডিপোজিট রেকর্ড',     href: '/deposit-history' },
  { icon: WithdrawIcon, label: 'উইথড্র রেকর্ড',      href: '/withdraw-history' },
  { icon: LedgerIcon,   label: 'অ্যাকাউন্ট রেকর্ড',  href: '/account-statement' },
  { icon: UserIcon,     label: 'আমার অ্যাকাউন্ট',    href: '/my-profile' },
  { icon: ShieldIcon,   label: 'সিকিউরিটি সেন্টার',  href: '/security' },
  { icon: UsersIcon,    label: 'বন্ধুকে আমন্ত্রণ',    href: '/refer' },
  { icon: TargetIcon,   label: 'মিশন',               href: '/promotions' },
  { icon: RebateIcon,   label: 'রিবেট',              href: '/turnover' },
  { icon: MedalIcon,    label: 'ভিআইপি ক্লাব',       href: '/vip' },
  { icon: DownloadIcon, label: 'অ্যাপ ডাউনলোড',      href: '/download' },
  { icon: ChatIcon,     label: 'কাস্টমার সার্ভিস',   href: '/support' },
];

export default function MemberPage() {
  const router = useRouter();
  const { toast } = useUI();
  const { ready, session, profile, wallet, signOut, refresh } = useAuth();
  const [spinning, setSpinning] = useState(false);

  const signedIn = ready && Boolean(session);
  const userId = profile?.phone ?? '';
  const nickname = profile?.display_name || userId || 'প্লেয়ার';

  /* Supabase stamps the auth row, and that is the account's real birthday —
     `profiles` has its own created_at but the provider does not load it. */
  const joined = session?.user.created_at
    ? new Date(session.user.created_at).toLocaleDateString('en-CA')
    : null;

  const copyId = async () => {
    if (!userId) return;
    try {
      await navigator.clipboard.writeText(userId);
      toast('আইডি কপি হয়েছে');
    } catch {
      toast('কপি করা গেল না');
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
      <PageHeader title="আমার অ্যাকাউন্ট" />

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
                    <button type="button" onClick={copyId} aria-label="আইডি কপি করুন">
                      <CopyIcon />
                    </button>
                  </div>
                  <div className="mc__meta">
                    <span>নাম: {nickname}</span>
                    <Link href="/my-profile" aria-label="নাম বদলান"><PencilIcon /></Link>
                  </div>
                  {joined && <div className="mc__meta">যোগ দিয়েছেন: {joined}</div>}
                </>
              ) : (
                <>
                  <div className="mc__id"><b>গেস্ট</b></div>
                  <div className="mc__meta">খেলতে হলে লগইন করুন</div>
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
                aria-label="ব্যালেন্স রিফ্রেশ করুন"
              >
                <RefreshIcon />
              </button>
            )}
          </div>

          {signedIn ? (
            <div className="mc__acts">
              <Link href="/deposit"><DepositIcon />{t.deposit}</Link>
              <Link href="/withdraw"><WithdrawIcon />{t.withdraw}</Link>
              <Link href="/withdraw"><BankIcon />ব্যাংক অ্যাকাউন্ট</Link>
            </div>
          ) : (
            <div className="mc__acts">
              <Link href="/login">{t.login}</Link>
              <Link href="/register" className="is-gold">{t.registerNow}</Link>
            </div>
          )}
        </div>

        <div className="mc__sechd">
          <span>মেম্বার সেন্টার</span>
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
              onClick={async () => { await signOut(); toast('লগআউট হয়েছে'); router.push('/'); }}
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
