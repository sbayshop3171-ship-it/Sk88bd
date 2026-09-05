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
    account_no: string;
    state: 'pending' | 'approved' | 'rejected' | 'cancelled';
    admin_note: string | null;
    created_at: string;
    channel: { id: string; name: string } | null;
}

export default function WithdrawHistory({ rows }: { rows: Paginated<Row> }) {
    return (
        <>
            <Head title="উইথড্র হিস্টোরি" />
            <PageHeader title="উইথড্র হিস্টোরি" />

            {rows.data.length === 0 ? (
                <Empty glyph="💸" text="এখনো কোনো উইথড্র রেকর্ড নেই।" />
            ) : (
                <div className="rec">
                    {rows.data.map((r) => (
                        <div className="rec__row" key={r.id}>
                            <div>
                                <div className="rec__ttl">{r.channel?.name ?? r.id}</div>
                                <div className="rec__sub">{r.account_no} · {when(r.created_at)}</div>
                            </div>
                            <div className="rec__amt rec__amt--out">−{taka(r.amount)}</div>
                            <div className="rec__meta">
                                <StateBadge state={r.state} />
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
