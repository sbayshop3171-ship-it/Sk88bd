'use client';

import PageHeader from '@/components/PageHeader';
import { useUI } from '@/components/UIProvider';
import { BRAND, money } from '@/lib/brand';

const STEPS: [string, string][] = [
  ['১', 'আপনার রেফারেল লিংক বন্ধুদের শেয়ার করুন'],
  ['২', 'বন্ধু রেজিস্টার করে ডিপোজিট করুক'],
  ['৩', 'সে যত খেলবে, আপনি তত কমিশন পাবেন — আজীবন'],
];

export default function ReferPage() {
  const { toast } = useUI();
  const link = `https://${BRAND.domain}/r/XXXXXX`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast('লিংক কপি হয়েছে');
    } catch {
      toast('কপি করা যায়নি — ম্যানুয়ালি কপি করুন');
    }
  };

  return (
    <>
      <PageHeader title="রেফার ও কমিশন" />

      <div className="hero">
        <h1>৪০% পর্যন্ত কমিশন</h1>
        <p>বন্ধু আনুন, আজীবন কমিশন নিন</p>
      </div>

      <div className="stat">
        <div><b>0</b><small>মোট রেফার</small></div>
        <div><b>0</b><small>সক্রিয় রেফার</small></div>
        <div><b>{money(0)}</b><small>মোট কমিশন</small></div>
      </div>

      <div className="field" style={{ margin: 12 }}>
        <label>আপনার রেফারেল লিংক</label>
        <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
        <button className="btn btn--gold btn--block" style={{ marginTop: 10 }} type="button" onClick={copy}>
          লিংক কপি করুন
        </button>
      </div>

      <div className="list-card">
        {STEPS.map(([n, text]) => (
          <div key={n} style={{ display: 'flex', gap: 11, padding: '13px 14px', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,.05)' }}>
            <span className="winners__rank">{n}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>

      <div className="note" style={{ margin: 12 }}>
        রেফারেল লিংক লগইন করার পর আপনার নিজস্ব কোড দিয়ে তৈরি হবে।
      </div>
    </>
  );
}
