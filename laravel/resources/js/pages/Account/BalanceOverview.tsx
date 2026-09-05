import { Head } from '@inertiajs/react';
import PageHeader from '../../components/PageHeader';
import { taka } from '../../lib/brand';

export default function BalanceOverview({ cards }: { cards: { label: string; value: number }[] }) {
    return (
        <>
            <Head title="ব্যালেন্স ওভারভিউ" />
            <PageHeader title="ব্যালেন্স ওভারভিউ" />
            <div className="stat" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
                {cards.map(({ label, value }) => (
                    <div key={label}>
                        <b>{taka(value)}</b>
                        <small>{label}</small>
                    </div>
                ))}
            </div>
        </>
    );
}
