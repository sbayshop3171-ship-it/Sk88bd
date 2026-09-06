'use client';

import PageHeader from '@/components/PageHeader';
import { usePwaInstall } from '@/components/usePwaInstall';
import { BRAND } from '@/lib/brand';

/** Two things live here: the web app (installed straight from the browser,
    no store, always the current build) and the separate signal APK. */
export default function DownloadPage() {
  const { canInstall, installed, needsIosSteps, install } = usePwaInstall();

  return (
    <>
      <PageHeader title="অ্যাপ ডাউনলোড" />
      <div className="hero">
        <h1>{BRAND.name} অ্যাপ</h1>
        <p>ইনস্টল করলে হোম স্ক্রিন থেকে সরাসরি খুলবে</p>
      </div>

      <div className="dl-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="dl-card__icon" src="/icons/icon-192.png" alt="" width={64} height={64} />
        <div className="dl-card__b">
          <b>{BRAND.name} ওয়েব অ্যাপ</b>
          <small>ফুল স্ক্রিন · সবসময় আপডেটেড · ইনস্টল করলেই ৳১৮ বোনাস</small>
        </div>
      </div>

      <div style={{ margin: 12 }}>
        {installed ? (
          <div className="note" style={{ margin: 0 }}>
            ✓ অ্যাপটি ইতিমধ্যে ইনস্টল করা আছে — আপনি এখন অ্যাপেই আছেন।
          </div>
        ) : canInstall ? (
          <button className="btn btn--gold btn--block" type="button" onClick={() => void install()}>
            অ্যাপ ইনস্টল করুন
          </button>
        ) : needsIosSteps ? (
          <ol className="pwa__ios" style={{ margin: 0 }}>
            <li>নিচের <b>শেয়ার</b> বাটনে ট্যাপ করুন <span aria-hidden>⬆️</span></li>
            <li><b>Add to Home Screen</b> বেছে নিন</li>
            <li><b>Add</b> চাপুন — হয়ে গেল</li>
          </ol>
        ) : (
          <div className="note" style={{ margin: 0 }}>
            ব্রাউজারের মেনু (⋮) খুলে <b>Install app</b> অথবা <b>Add to Home screen</b> বেছে
            নিন। Chrome দিয়ে খুললে বাটনটি এখানেই চলে আসবে।
          </div>
        )}
      </div>

      <h2 className="sec__title" style={{ margin: '22px 12px 10px' }}>সিগন্যাল অ্যাপ</h2>
      <div className="wallet-bar">
        <a className="btn btn--gold" href="/downloads/prime-signal-app.apk" download style={{ padding: 12 }}>
          Android APK
        </a>
        <span className="btn btn--ghost" style={{ padding: 12, opacity: .55 }}>iOS</span>
      </div>
      <div className="note" style={{ margin: 12 }}>
        APK ইনস্টল করার পর অ্যাডমিন প্যানেলের <b>App Keys</b> থেকে access key
        generate করে app unlock করুন। App live server থেকে signal data নেবে।
      </div>
    </>
  );
}
