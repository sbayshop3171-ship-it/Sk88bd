import PageHeader from '@/components/PageHeader';
import { BRAND } from '@/lib/brand';

export default function DownloadPage() {
  return (
    <>
      <PageHeader title="অ্যাপ ডাউনলোড" />
      <div className="hero">
        <h1>{BRAND.name} অ্যাপ</h1>
        <p>অ্যাপ ডাউনলোড করলেই ৳১৮ বোনাস</p>
      </div>
      <div className="wallet-bar">
        <span className="btn btn--gold" style={{ padding: 12, opacity: .55 }}>Android APK</span>
        <span className="btn btn--ghost" style={{ padding: 12, opacity: .55 }}>iOS</span>
      </div>
      <div className="note" style={{ margin: 12 }}>
        APK বিল্ড তৈরি হলে এখানে ডাউনলোড লিংক বসবে।
      </div>
    </>
  );
}
