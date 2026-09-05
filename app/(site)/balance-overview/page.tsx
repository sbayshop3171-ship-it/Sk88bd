import PageHeader from '@/components/PageHeader';
import { money } from '@/lib/brand';

const CARDS: [string, number][] = [
  ['মূল ব্যালেন্স', 0],
  ['বোনাস ব্যালেন্স', 0],
  ['মোট ডিপোজিট', 0],
  ['মোট উইথড্র', 0],
  ['মোট বেট', 0],
  ['লাভ / ক্ষতি', 0],
];

export default function BalanceOverviewPage() {
  return (
    <>
      <PageHeader title="ব্যালেন্স ওভারভিউ" />
      <div className="stat" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        {CARDS.map(([label, value]) => (
          <div key={label}>
            <b>{money(value)}</b>
            <small>{label}</small>
          </div>
        ))}
      </div>
    </>
  );
}
