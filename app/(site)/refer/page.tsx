'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { CopyIcon, FacebookIcon, TelegramIcon, WhatsAppIcon } from '@/components/Icons';
import PageHeader from '@/components/PageHeader';
import { useLedger } from '@/components/useLedger';
import { useLightSheet } from '@/components/useLightSheet';
import { useUI } from '@/components/UIProvider';
import { toTaka } from '@/lib/auth';
import { BRAND, money } from '@/lib/brand';
import { VIP_TIERS } from '@/lib/promotions';
import { t } from '@/lib/strings';

/* ============================================================
   Invite Friends.

   The reference opens on four figures, the link with the ways to
   send it, and the table of what each VIP level is paid — in that
   order, because that is the order somebody deciding whether to
   share it reads them in.

   The two income figures are the wallet's bonus and rebate
   credits for those days. That is how a referrer is actually
   paid here, so it is the true answer to "what did this earn me
   today" — and it is read from the ledger rather than kept
   anywhere, so it cannot disagree with the statement.
   ============================================================ */

type Stats = { total: number; active: number; commission: number };

type Tab = 'overview' | 'rewards';

const dayOf = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

const shift = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dayOf(d);
};

export default function ReferPage() {
  useLightSheet();
  const { toast } = useUI();
  const { ready, session, profile } = useAuth();
  const { rows } = useLedger(500);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<Tab>('overview');

  const signedIn = ready && Boolean(session);
  const code = profile?.referral_code ?? '';
  // the domain the player is actually on, so the link works on every mirror;
  // read after mount so server and client render the same first frame
  const [origin, setOrigin] = useState(`https://${BRAND.domain}`);
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const link = code ? `${origin}/register?ref=${code}` : '';

  useEffect(() => {
    if (!session) return;
    let live = true;
    fetch('/api/me/referrals', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: ({ ok: true } & Stats) | { ok: false }) => { if (live && d.ok) setStats(d); })
      .catch(() => { /* keep zeros */ });
    return () => { live = false; };
  }, [session]);

  const income = useMemo(() => {
    const on = (day: string) => (rows ?? [])
      .filter((r) => (r.kind === 'bonus' || r.kind === 'rebate') && r.created_at.slice(0, 10) === day)
      .reduce((n, r) => n + r.amount, 0);
    return { today: on(dayOf(new Date())), yesterday: on(shift(-1)) };
  }, [rows]);

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${what} copied`);
    } catch {
      toast('Could not copy — copy it by hand');
    }
  };

  const share = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');
  const msg = encodeURIComponent(`Play on ${BRAND.name} — sign up with my link: ${link}`);

  return (
    <>
      <PageHeader title="Invite Friends" />

      <div className="iv__tabs">
        <button type="button" className={tab === 'overview' ? 'on' : ''} onClick={() => setTab('overview')}>Overview</button>
        <button type="button" className={tab === 'rewards' ? 'on' : ''} onClick={() => setTab('rewards')}>Rewards</button>
      </div>

      {tab === 'overview' ? (
        <div className="iv">
          <div className="iv__tiles">
            <div className="is-blue"><small>Today&apos;s Income</small><b>{money(toTaka(income.today))}</b></div>
            <div className="is-violet"><small>Yesterday&apos;s Income</small><b>{money(toTaka(income.yesterday))}</b></div>
            <div className="is-violet"><small>Registers</small><b>{stats?.total ?? 0}</b></div>
            <div className="is-blue"><small>Valid Referral</small><b>{stats?.active ?? 0}</b></div>
          </div>

          {signedIn ? (
            <div className="iv__share">
              <b>Share with your friends</b>
              <div className="iv__link">
                <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
                <button type="button" onClick={() => copy(link, 'Link')} aria-label="Copy link"><CopyIcon /></button>
              </div>
              <div className="iv__btns">
                <button type="button" className="is-fb" onClick={() => share(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`)} aria-label="Facebook"><FacebookIcon /></button>
                <button type="button" className="is-tg" onClick={() => share(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${msg}`)} aria-label="Telegram"><TelegramIcon /></button>
                <button type="button" className="is-wa" onClick={() => share(`https://wa.me/?text=${msg}`)} aria-label="WhatsApp"><WhatsAppIcon /></button>
                <button type="button" className="is-code" onClick={() => copy(code, 'Code')}>{code || '—'}</button>
              </div>
            </div>
          ) : ready && (
            <div className="wallet-bar">
              <Link href="/login" className="btn btn--ghost" style={{ padding: 12 }}>{t.login}</Link>
              <Link href="/register" className="btn btn--gold" style={{ padding: 12 }}>{t.register}</Link>
            </div>
          )}

          <p className="iv__head">Earn up to <b>৳{VIP_TIERS.length * 200}</b> for each friend you bring</p>
          <p className="iv__line">Earn <b>2.2%</b> on your downline&apos;s deposits</p>
          <p className="iv__line">Earn <b>1%</b> on every bet your downline places</p>
        </div>
      ) : (
        <div className="iv">
          <table className="iv__table">
            <thead>
              <tr>
                <th>Inviter VIP level</th>
                <th>Referral bonus/person</th>
                <th>How to get it?</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>VIP0</td>
                <td>৳100</td>
                <td>Deposit ৳100 and bet ৳2,000</td>
              </tr>
              {VIP_TIERS.map((v, i) => (
                <tr key={v.level}>
                  <td>{v.level.replace(' ', '')}</td>
                  <td>৳{(150 + i * 50).toLocaleString('en-IN')}</td>
                  <td>Deposit ৳100 and bet ৳2,000</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="iv__note">
            Once your friend signs up and meets the terms above, the bonus goes into your wallet.
          </p>
        </div>
      )}
    </>
  );
}
