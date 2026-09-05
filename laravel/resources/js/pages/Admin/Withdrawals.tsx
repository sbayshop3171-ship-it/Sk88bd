import { Head } from '@inertiajs/react';
import DataTable from '../../components/admin/DataTable';
import ReviewActions from '../../components/admin/ReviewActions';
import StateFilter from '../../components/admin/StateFilter';
import Pagination from '../../components/Pagination';
import StateBadge from '../../components/StateBadge';
import AdminLayout from '../../layouts/AdminLayout';
import { taka } from '../../lib/brand';
import { when } from '../../lib/date';
import type { Paginated } from '../../types';

interface Row {
    id: number;
    amount: number;
    account_no: string;
    state: 'pending' | 'approved' | 'rejected' | 'cancelled';
    created_at: string;
    user: {
        id: number;
        phone: string;
        wallet: { balance: number; turnover_need: number; turnover_done: number } | null;
    } | null;
    channel: { id: string; name: string } | null;
}

export default function Withdrawals({ rows, state }: { rows: Paginated<Row>; state: string }) {
    return (
        <>
            <Head title="অ্যাডমিন — উইথড্র" />
            <h1 className="adm__h1">উইথড্র রিকোয়েস্ট</h1>
            <p className="adm__sub">
                অনুমোদনের আগে টার্নওভার সম্পূর্ণ হয়েছে কিনা দেখে নিন। অনুমোদন করলে
                ব্যালেন্স থেকে টাকা কেটে নেওয়া হবে।
            </p>

            <StateFilter base="/admin/withdrawals" active={state} />

            <DataTable
                columns={['#', 'ইউজার', 'চ্যানেল', 'পরিমাণ', 'অ্যাকাউন্ট', 'ব্যালেন্স', 'টার্নওভার', 'সময়', 'স্ট্যাটাস', '']}
                rows={rows.data.map((r) => {
                    const w = r.user?.wallet;
                    const cleared = !w || w.turnover_done >= w.turnover_need;
                    return [
                        r.id,
                        r.user?.phone ?? '—',
                        r.channel?.name ?? '—',
                        taka(r.amount),
                        r.account_no,
                        taka(w?.balance ?? 0),
                        cleared
                            ? <span className="adm__ok">সম্পূর্ণ</span>
                            : <span className="adm__miss">{taka(w!.turnover_done)} / {taka(w!.turnover_need)}</span>,
                        when(r.created_at),
                        <StateBadge state={r.state} />,
                        <ReviewActions url={`/admin/withdrawals/${r.id}`} state={r.state} />,
                    ];
                })}
                empty="কোনো উইথড্র রিকোয়েস্ট নেই।"
            />

            <Pagination page={rows} />
        </>
    );
}

Withdrawals.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
