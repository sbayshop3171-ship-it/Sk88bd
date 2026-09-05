import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import DataTable from '../../components/admin/DataTable';
import Pagination from '../../components/Pagination';
import AdminLayout from '../../layouts/AdminLayout';
import { taka } from '../../lib/brand';
import { when } from '../../lib/date';
import type { Paginated } from '../../types';

interface Row {
    id: number;
    phone: string;
    display_name: string | null;
    role: string;
    vip_level: number;
    referral_code: string;
    is_blocked: boolean;
    created_at: string;
    wallet: { balance: number } | null;
}

/** Manual credit or debit. Always leaves a ledger entry carrying the reason. */
function AdjustBalance({ userId }: { userId: number }) {
    const [open, setOpen] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({ amount: '', note: '' });

    if (!open) {
        return (
            <button className="adm__btn" type="button" onClick={() => setOpen(true)}>ব্যালেন্স</button>
        );
    }

    const submit = () => {
        post(`/admin/users/${userId}/adjust`, {
            preserveScroll: true,
            onSuccess: () => { reset(); setOpen(false); },
        });
    };

    return (
        <div className="adm__acts">
            <input className="adm__cell-in" style={{ width: 90 }} type="number" placeholder="৳ ±"
                   value={data.amount} onChange={(e) => setData('amount', e.target.value)} />
            <input className="adm__cell-in" style={{ width: 110 }} placeholder="কারণ"
                   value={data.note} onChange={(e) => setData('note', e.target.value)} />
            <button className="adm__btn adm__btn--go" type="button" disabled={processing} onClick={submit}>ঠিক আছে</button>
            <button className="adm__btn" type="button" onClick={() => { reset(); setOpen(false); }}>বাদ</button>
            {(errors.amount || errors.note) && <div className="adm__err">{errors.amount ?? errors.note}</div>}
        </div>
    );
}

export default function Users({ rows, q }: { rows: Paginated<Row>; q: string }) {
    const [search, setSearch] = useState(q);

    const toggleBlock = (u: Row) => {
        router.patch(`/admin/users/${u.id}`, { is_blocked: !u.is_blocked }, { preserveScroll: true });
    };

    return (
        <>
            <Head title="অ্যাডমিন — ইউজার" />
            <h1 className="adm__h1">ইউজার</h1>
            <p className="adm__sub">
                ব্যালেন্স অ্যাডজাস্ট, ব্লক/আনব্লক ও VIP লেভেল এখান থেকেই করা যায়। নামে বা
                ফোনে ক্লিক করলে ওই প্লেয়ারের পুরো হিসাব — ডিপোজিট, উইথড্র, বেট, টার্নওভার
                আর রেফারেল — এক পাতায় দেখা যাবে।
            </p>

            <form
                className="adm__filters"
                onSubmit={(e) => { e.preventDefault(); router.get('/admin/users', { q: search }, { preserveState: true }); }}
            >
                <input className="adm__cell-in" style={{ width: 220 }} placeholder="ফোন বা রেফারেল কোড"
                       value={search} onChange={(e) => setSearch(e.target.value)} />
                <button className="adm__btn adm__btn--go" type="submit">খুঁজুন</button>
            </form>

            <DataTable
                columns={['ইউজার', 'ফোন', 'ব্যালেন্স', 'VIP', 'রেফার কোড', 'রেজিস্ট্রেশন', 'স্ট্যাটাস', '']}
                rows={rows.data.map((u) => [
                    <Link href={`/admin/users/${u.id}`}>{u.display_name ?? `#${u.id}`}</Link>,
                    <Link href={`/admin/users/${u.id}`}>{u.phone}</Link>,
                    taka(u.wallet?.balance ?? 0),
                    <select
                        className="adm__cell-in"
                        style={{ width: 62 }}
                        value={u.vip_level}
                        onChange={(e) => router.patch(`/admin/users/${u.id}`, { vip_level: Number(e.target.value) }, { preserveScroll: true })}
                    >
                        {[0, 1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>,
                    u.referral_code,
                    when(u.created_at),
                    u.is_blocked
                        ? <span className="adm__miss">ব্লকড</span>
                        : <span className="adm__ok">সক্রিয়</span>,
                    <div className="adm__acts">
                        <button
                            className={`adm__btn ${u.is_blocked ? 'adm__btn--ok' : 'adm__btn--no'}`}
                            type="button"
                            onClick={() => toggleBlock(u)}
                        >
                            {u.is_blocked ? 'আনব্লক' : 'ব্লক'}
                        </button>
                        <AdjustBalance userId={u.id} />
                    </div>,
                ])}
                empty="কোনো ইউজার নেই।"
            />

            <Pagination page={rows} />
        </>
    );
}

Users.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
