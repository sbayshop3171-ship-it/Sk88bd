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
    sender_no: string | null;
    txn_id: string | null;
    state: 'pending' | 'approved' | 'rejected' | 'cancelled';
    created_at: string;
    user: { id: number; phone: string } | null;
    channel: { id: string; name: string } | null;
}

export default function Deposits({ rows, state }: { rows: Paginated<Row>; state: string }) {
    return (
        <>
            <Head title="অ্যাডমিন — ডিপোজিট" />
            <h1 className="adm__h1">ডিপোজিট রিকোয়েস্ট</h1>
            <p className="adm__sub">
                অনুমোদন করলে প্লেয়ারের ওয়ালেটে টাকা যোগ হবে এবং লেজারে এন্ট্রি হবে।
            </p>

            <StateFilter base="/admin/deposits" active={state} />

            <DataTable
                columns={['#', 'ইউজার', 'চ্যানেল', 'পরিমাণ', 'সেন্ডার', 'TxnID', 'সময়', 'স্ট্যাটাস', '']}
                rows={rows.data.map((r) => [
                    r.id,
                    r.user?.phone ?? '—',
                    r.channel?.name ?? '—',
                    taka(r.amount),
                    r.sender_no ?? '—',
                    r.txn_id ?? '—',
                    when(r.created_at),
                    <StateBadge state={r.state} />,
                    <ReviewActions url={`/admin/deposits/${r.id}`} state={r.state} />,
                ])}
                empty="কোনো ডিপোজিট রিকোয়েস্ট নেই।"
            />

            <Pagination page={rows} />
        </>
    );
}

Deposits.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
