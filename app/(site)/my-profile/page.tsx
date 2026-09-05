import PageHeader from '@/components/PageHeader';

const ROWS: [string, string][] = [
  ['ইউজার আইডি', '—'],
  ['মোবাইল নাম্বার', '—'],
  ['নাম', '—'],
  ['ভিআইপি লেভেল', 'VIP 0'],
  ['রেফারেল কোড', '—'],
  ['রেজিস্ট্রেশন তারিখ', '—'],
];

export default function MyProfilePage() {
  return (
    <>
      <PageHeader title="আমার প্রোফাইল" />

      <div className="profile">
        <i className="profile__av" aria-hidden>👤</i>
        <div>
          <div className="profile__n">গেস্ট</div>
          <div className="profile__id">লগইন করলে তথ্য দেখা যাবে</div>
        </div>
      </div>

      <div className="list-card">
        {ROWS.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', padding: '13px 14px', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,.05)' }}>
            <span style={{ color: 'var(--muted)' }}>{k}</span>
            <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{v}</span>
          </div>
        ))}
      </div>
    </>
  );
}
