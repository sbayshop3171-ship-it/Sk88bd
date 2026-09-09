import PageHeader from '@/components/PageHeader';

/** Sample fixtures. Replaced by the exchange/sportsbook feed once licensed. */
const MATCHES = [
  { league: 'BPL T20', live: true, a: 'Dhaka Capitals', b: 'Chattogram Kings', as: '142/4 (16.2)', bs: '—', o: ['1.72', '—', '2.15'] },
  { league: 'IPL', live: true, a: 'Mumbai', b: 'Chennai', as: '88/2 (10.4)', bs: '—', o: ['1.95', '—', '1.88'] },
  { league: 'Premier League', live: false, a: 'Arsenal', b: 'Liverpool', as: '', bs: '', o: ['2.40', '3.30', '2.75'] },
  { league: 'La Liga', live: false, a: 'Barcelona', b: 'Real Madrid', as: '', bs: '', o: ['2.10', '3.50', '3.10'] },
];

export default function SportsPage() {
  return (
    <>
      <PageHeader title="Sports" />

      <section className="sec">
        <div className="sec__hd"><h2 className="sec__title">Cricket &amp; Sports</h2></div>
        <div style={{ display: 'grid', gap: 9 }}>
          {MATCHES.map((m) => (
            <div className="match" key={`${m.a}-${m.b}`}>
              <div className="match__top">
                <span>{m.league}</span>
                {m.live ? <span className="match__live">LIVE</span> : <span>Today 21:00</span>}
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
        The live odds feed is not connected yet — real matches and odds appear once an
        exchange provider licence is in place.
      </div>
    </>
  );
}
