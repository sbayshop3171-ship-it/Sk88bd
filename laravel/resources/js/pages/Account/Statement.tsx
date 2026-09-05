import { Head } from '@inertiajs/react';
import Empty from '../../components/Empty';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import { taka } from '../../lib/brand';
import { refLabel, when } from '../../lib/date';
import type { Paginated } from '../../types';

type Kind = 'deposit' | 'withdraw' | 'bet' | 'win' | 'bonus' | 'rebate' | 'adjust';

const KIND_LABEL: Record<Kind, string> = {
    deposit: 'ডিপোজিট',
    withdraw: 'উইথড্র',
    bet: 'বেট',
    win: 'জয়',
    bonus: 'বোনাস',
    rebate: 'রিবেট',
    adjust: 'অ্যাডজাস্ট',
};

interface Row {
    id: number;
    kind: Kind;
    amount: number;
    balance_after: number;
    ref: string | null;
    created_at: string;
}

export default function Statement({ rows }: { rows: Paginated<Row> }) {
    return (
        <>
            <Head title="অ্যাকাউন্ট স্টেটমেন্ট" />
            <PageHeader title="অ্যাকাউন্ট স্টেটমেন্ট" />

            {rows.data.length === 0 ? (
                <Empty glyph="🧾" text="এই সময়ের জন্য কোনো লেনদেন নেই।" />
            ) : (
                <div className="rec">
                    {rows.data.map((r) => (
                        <div className="rec__row" key={r.id}>
                            <div>
                                <div className="rec__ttl">{KIND_LABEL[r.kind]}</div>
                                <div className="rec__sub">{when(r.created_at)}</div>
                            </div>
                            <div className={`rec__amt rec__amt--${r.amount >= 0 ? 'in' : 'out'}`}>
                                {r.amount >= 0 ? '+' : '−'}{taka(Math.abs(r.amount), 2)}
                            </div>
                            <div className="rec__meta">
                                <span className="rec__sub">ব্যালেন্স: {taka(r.balance_after, 2)}</span>
                                {refLabel(r.ref) && <span className="rec__sub">{refLabel(r.ref)}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Pagination page={rows} />
        </>
    );
}
