import PageHeader from '@/components/PageHeader';

/** Sample fixtures. Replaced by the exchange/sportsbook feed once licensed. */
const MATCHES = [
  { league: 'BPL T20', live: true, a: 'ঢাকা ক্যাপিটালস', b: 'চট্টগ্রাম কিংস', as: '142/4 (16.2)', bs: '—', o: ['1.72', '—', '2.15'] },
  { league: 'IPL', live: true, a: 'মুম্বাই', b: 'চেন্নাই', as: '88/2 (10.4)', bs: '—', o: ['1.95', '—', '1.88'] },
  { league: 'Premier League', live: false, a: 'আর্সেনাল', b: 'লিভারপুল', as: '', bs: '', o: ['2.40', '3.30', '2.75'] },
  { league: 'La Liga', live: false, a: 'বার্সেলোনা', b: 'রিয়াল মাদ্রিদ', as: '', bs: '', o: ['2.10', '3.50', '3.10'] },
];

export default function SportsPage() {
  return (
    <>
      <PageHeader title="স্পোর্টস" />

      <section className="sec">
        <div className="sec__hd"><h2 className="sec__title">ক্রিকেট ও স্পোর্টস</h2></div>
        <div style={{ display: 'grid', gap: 9 }}>
          {MATCHES.map((m) => (
            <div className="match" key={`${m.a}-${m.b}`}>
              <div className="match__top">
                <span>{m.league}</span>
                {m.live ? <span className="match__live">LIVE</span> : <span>আজ ২১:০০</span>}
              </div>
              <div className="match__teams">
                <div className="match__team"><span>{m.a}</span><b>{m.as || '-'}</b></div>
                <div className="match__team"><span>{m.b}</span><b>{m.bs || '-'}</b></div>
              </div>
              <div className="odds">
                {m.o.map((odd, i) => (
                  <button key={i} type="button">
                    {['1', 'X', '2'][i]}<small>{odd}</small>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="note" style={{ margin: 12 }}>
        লাইভ অডস ফিড এখনো যুক্ত হয়নি — এক্সচেঞ্জ প্রোভাইডার লাইসেন্স পেলে আসল
        ম্যাচ ও অডস দেখা যাবে।
      </div>
    </>
  );
}
