import PageHeader from '@/components/PageHeader';
import { BRAND } from '@/lib/brand';

export default function DownloadPage() {
  return (
    <>
      <PageHeader title="অ্যাপ ডাউনলোড" />
      <div className="hero">
        <h1>{BRAND.name} অ্যাপ</h1>
        <p>লাইভ সিগন্যাল টার্মিনাল, অ্যাডমিন কী দিয়ে আনলক হবে</p>
      </div>
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
