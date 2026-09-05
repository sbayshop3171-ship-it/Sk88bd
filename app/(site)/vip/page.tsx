import Image from 'next/image';
import PageHeader from '@/components/PageHeader';
import { money } from '@/lib/brand';
import { VIP_TIERS } from '@/lib/promotions';

export default function VipPage() {
  return (
    <>
      <PageHeader title="ভিআইপি ক্লাব" />
      <div className="vip-hero">
        <Image src="/games/exclusive-vip.webp" alt="" width={112} height={112} priority />
        <div>
          <h1>ভিআইপি ক্লাব</h1>
          <p>যত বেশি খেলবেন, তত বেশি রিবেট ও রিওয়ার্ড</p>
        </div>
      </div>

      <div className="list-card">
        {VIP_TIERS.map((v) => (
          <div key={v.level} style={{ padding: '13px 14px', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <b style={{ color: 'var(--gold)', fontSize: 14 }}>{v.level}</b>
              <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700 }}>{v.gift}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
              প্রয়োজনীয় টার্নওভার {money(v.need)} · রিবেট {v.rebate}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
