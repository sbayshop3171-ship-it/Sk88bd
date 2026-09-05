import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import DataTable from '../../components/admin/DataTable';
import Pagination from '../../components/Pagination';
import AdminLayout from '../../layouts/AdminLayout';
import { taka } from '../../lib/brand';
import { when } from '../../lib/date';
import type { Paginated } from '../../types';

interface Row {
    game: string;
    user_id: number;
    round_id: number;
    cost: number;
    payout: number;
    detail: string | number;
    created_at: string;
    phone: string | null;
}

export default function Bets({
    rows,
    game,
    q,
    games,
    totals,
}: {
    rows: Paginated<Row>;
    game: string;
    q: string;
    games: Record<string, string>;
    totals: { rounds: number; staked: number; paid: number };
}) {
    const [search, setSearch] = useState(q);
    const ggr = totals.staked - totals.paid;

    return (
        <>
            <Head title="অ্যাডমিন — বেট" />
            <h1 className="adm__h1">বেট</h1>
            <p className="adm__sub">
                সাইটের নিজস্ব ইঞ্জিনে খেলা প্রতিটি রাউন্ড। প্রোভাইডারের গেম এখানে আসে না —
                ওগুলোর হিসাব অ্যাগ্রিগেটরের রিপোর্টে থাকে।{' '}
                <b>ফল</b> কলামে Aviator-এর ক্র‍্যাশ পয়েন্ট আর Zeus Gate-এর জেতা গুণক দেখায়।
            </p>

            <div className="adm__tiles" style={{ marginBottom: 14 }}>
                <div className="adm__tile"><b>{totals.rounds.toLocaleString('en-IN')}</b><small>রাউন্ড</small></div>
                <div className="adm__tile"><b>{taka(totals.staked)}</b><small>মোট বেট</small></div>
                <div className="adm__tile"><b>{taka(totals.paid)}</b><small>মোট ফেরত</small></div>
                <div className="adm__tile"><b>{taka(ggr)}</b><small>সাইটের লাভ</small></div>
                <div className="adm__tile">
                    <b>{totals.staked > 0 ? `${((100 * totals.paid) / totals.staked).toFixed(1)}%` : '—'}</b>
                    <small>ফেরতের হার</small>
                </div>
            </div>

            <div className="adm__filters">
                <Link href="/admin/bets" className={game === '' ? 'on' : undefined}>সব গেম</Link>
                {Object.entries(games).map(([key, label]) => (
                    <Link key={key} href={`/admin/bets?game=${key}`} className={game === key ? 'on' : undefined}>
                        {label}
                    </Link>
                ))}
            </div>

            <form
                className="adm__filters"
                onSubmit={(e) => {
                    e.preventDefault();
                    router.get('/admin/bets', { game, q: search }, { preserveState: true });
                }}
            >
                <input className="adm__cell-in" style={{ width: 220 }} placeholder="প্লেয়ারের ফোন"
                       value={search} onChange={(e) => setSearch(e.target.value)} />
                <button className="adm__btn adm__btn--go" type="submit">খুঁজুন</button>
            </form>

            <DataTable
                columns={['গেম', 'প্লেয়ার', 'রাউন্ড', 'বেট', 'ফেরত', 'লাভ', 'ফল', 'সময়']}
                rows={rows.data.map((r) => {
                    const net = r.cost - r.payout;

                    return [
                        games[r.game] ?? r.game,
                        r.phone ? <Link href={`/admin/users/${r.user_id}`}>{r.phone}</Link> : `#${r.user_id}`,
                        `#${r.round_id}`,
                        taka(r.cost),
                        r.payout > 0 ? taka(r.payout) : '—',
                        <span className={net < 0 ? 'adm__miss' : 'adm__ok'}>{taka(net)}</span>,
                        `${Number(r.detail).toFixed(2)}x`,
                        when(r.created_at),
                    ];
                })}
                empty="কোনো রাউন্ড খেলা হয়নি।"
            />

            <Pagination page={rows} />
        </>
    );
}

Bets.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
