import { Head } from '@inertiajs/react';
import Empty from '../../components/Empty';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import StateBadge from '../../components/StateBadge';
import { taka } from '../../lib/brand';
import { when } from '../../lib/date';
import type { Paginated } from '../../types';

interface Row {
    id: number;
    amount: number;
    state: 'pending' | 'approved' | 'rejected' | 'cancelled';
    txn_id: string | null;
    admin_note: string | null;
    created_at: string;
    channel: { id: string; name: string } | null;
}

export default function DepositHistory({ rows }: { rows: Paginated<Row> }) {
    return (
        <>
            <Head title="ডিপোজিট হিস্টোরি" />
            <PageHeader title="ডিপোজিট হিস্টোরি" />

            {rows.data.length === 0 ? (
                <Empty glyph="💰" text="এখনো কোনো ডিপোজিট রেকর্ড নেই।" />
            ) : (
                <div className="rec">
                    {rows.data.map((r) => (
                        <div className="rec__row" key={r.id}>
                            <div>
                                <div className="rec__ttl">{r.channel?.name ?? r.id}</div>
                                <div className="rec__sub">{when(r.created_at)}</div>
                            </div>
                            <div className="rec__amt rec__amt--in">+{taka(r.amount)}</div>
                            <div className="rec__meta">
                                <StateBadge state={r.state} />
                                {r.txn_id && <span className="rec__sub">TxnID: {r.txn_id}</span>}
                                {r.admin_note && <span className="rec__sub">{r.admin_note}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Pagination page={rows} />
        </>
    );
}
