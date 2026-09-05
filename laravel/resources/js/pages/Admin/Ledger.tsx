import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import DataTable from '../../components/admin/DataTable';
import Pagination from '../../components/Pagination';
import AdminLayout from '../../layouts/AdminLayout';
import { taka } from '../../lib/brand';
import { when } from '../../lib/date';
import type { Paginated } from '../../types';

interface Row {
    id: number;
    kind: string;
    amount: number;
    balance_after: number;
    ref: string | null;
    created_at: string;
    user: { id: number; phone: string; display_name: string | null } | null;
}

const KIND_LABEL: Record<string, string> = {
    deposit: 'ডিপোজিট',
    withdraw: 'উইথড্র',
    bet: 'বেট',
    win: 'জয়',
    bonus: 'বোনাস',
    rebate: 'রিবেট',
    adjust: 'অ্যাডজাস্ট',
};

export default function Ledger({
    rows,
    kind,
    q,
    kinds,
    totals,
}: {
    rows: Paginated<Row>;
    kind: string;
    q: string;
    kinds: string[];
    totals: { credits: number; debits: number };
}) {
    const [search, setSearch] = useState(q);

    const go = (next: { kind?: string; q?: string }) => {
        router.get('/admin/ledger', { kind, q: search, ...next }, {
            preserveState: true,
            replace: true,
        });
    };

    return (
        <>
            <Head title="অ্যাডমিন — লেজার" />
            <h1 className="adm__h1">লেজার</h1>
            <p className="adm__sub">
                প্রতিটি ব্যালেন্স পরিবর্তনের স্থায়ী রেকর্ড। ওয়ালেটের ব্যালেন্স এই
                এন্ট্রিগুলোরই যোগফল — কোনো ব্যালেন্স ভুল মনে হলে উত্তর এখানে।
            </p>

            <div className="adm__tiles">
                <div className="adm__tile"><b>{taka(totals.credits)}</b><small>মোট ক্রেডিট</small></div>
                <div className="adm__tile"><b>{taka(Math.abs(totals.debits))}</b><small>মোট ডেবিট</small></div>
                <div className="adm__tile"><b>{taka(totals.credits + totals.debits)}</b><small>নিট</small></div>
                <div className="adm__tile"><b>{rows.total}</b><small>এন্ট্রি</small></div>
            </div>

            <div className="adm__filters">
                <Link href="/admin/ledger" className={kind === '' ? 'on' : undefined}>সব</Link>
                {kinds.map((k) => (
                    <Link
                        key={k}
                        href={`/admin/ledger?kind=${k}`}
                        className={kind === k ? 'on' : undefined}
                    >
                        {KIND_LABEL[k] ?? k}
                    </Link>
                ))}
            </div>

            <form
                className="adm__form"
                onSubmit={(e) => { e.preventDefault(); go({ q: search }); }}
            >
                <label>ফোন নাম্বার
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="01XXXXXXXXX"
                    />
                </label>
                <button className="adm__btn adm__btn--go" type="submit">খুঁজুন</button>
            </form>

            <DataTable
                columns={['#', 'ইউজার', 'ধরন', 'পরিমাণ', 'ব্যালেন্স', 'রেফারেন্স', 'সময়']}
                rows={rows.data.map((r) => [
                    r.id,
                    r.user?.phone ?? '—',
                    KIND_LABEL[r.kind] ?? r.kind,
                    <span className={r.amount < 0 ? 'adm__err' : 'adm__ok'}>
                        {r.amount < 0 ? '−' : '+'}{taka(Math.abs(r.amount))}
                    </span>,
                    taka(r.balance_after),
                    <span className="adm__muted">{r.ref ?? '—'}</span>,
                    when(r.created_at),
                ])}
                empty="কোনো লেজার এন্ট্রি নেই।"
            />

            <Pagination page={rows} />
        </>
    );
}

Ledger.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
