import { Head } from '@inertiajs/react';
import Empty from '../../components/Empty';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import { fmtX } from '../../lib/aviator';
import { taka } from '../../lib/brand';
import { when } from '../../lib/date';
import type { Paginated } from '../../types';

interface Row {
    id: number;
    seat: number;
    stake: number;
    cashed_at: number | null;
    payout: number;
    created_at: string;
    round: { id: number; crash_at: number; crashed_at: string | null } | null;
}

export default function BetsHistory({ rows }: { rows: Paginated<Row> }) {
    return (
        <>
            <Head title="বেটিং রেকর্ড" />
            <PageHeader title="বেটিং রেকর্ড" />

            {rows.data.length === 0 ? (
                <Empty glyph="📋" text="এখনো কোনো বেট রেকর্ড নেই।" />
            ) : (
                <div className="rec">
                    {rows.data.map((r) => {
                        const won = r.payout > 0;
                        return (
                            <div className="rec__row" key={r.id}>
                                <div>
                                    <div className="rec__ttl">Aviator · রাউন্ড #{r.round?.id ?? '—'}</div>
                                    <div className="rec__sub">{when(r.created_at)} · বেট {taka(r.stake)}</div>
                                </div>
                                <div className={`rec__amt rec__amt--${won ? 'in' : 'out'}`}>
                                    {won ? `+${taka(r.payout)}` : `−${taka(r.stake)}`}
                                </div>
                                <div className="rec__meta">
                                    <span className="rec__sub">
                                        {r.cashed_at !== null
                                            ? `ক্যাশ আউট ${fmtX(r.cashed_at)}`
                                            : 'ক্যাশ আউট হয়নি'}
                                    </span>
                                    {r.round?.crashed_at && (
                                        <span className="rec__sub">উড়ে গেছে {fmtX(r.round.crash_at)}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Pagination page={rows} />
        </>
    );
}
