import { Head, Link } from '@inertiajs/react';
import DataTable from '../../components/admin/DataTable';
import AdminLayout from '../../layouts/AdminLayout';
import { taka } from '../../lib/brand';

interface Row {
    date: string;
    deposits: number;
    withdrawals: number;
    bonuses: number;
    staked: number;
    paid: number;
    ggr: number;
    rounds: number;
    signups: number;
}

const RANGES = [7, 30, 90];

const day = (iso: string) =>
    new Date(`${iso}T00:00:00+06:00`).toLocaleDateString('en-GB', {
        timeZone: 'Asia/Dhaka',
        weekday: 'short',
        day: '2-digit',
        month: 'short',
    });

export default function Reports({
    rows,
    days,
    totals,
}: {
    rows: Row[];
    days: number;
    totals: Record<string, number>;
}) {
    const net = totals.deposits - totals.withdrawals;

    return (
        <>
            <Head title="অ্যাডমিন — রিপোর্ট" />
            <h1 className="adm__h1">রিপোর্ট</h1>
            <p className="adm__sub">
                দিন ধরে ধরে হিসাব। <b>GGR</b> হলো বেট বাদ জেতা — গেম যা রেখেছে, ক্যাশিয়ার
                কিছু ফেরত দেওয়ার আগে। <b>নিট ক্যাশ</b> হলো অনুমোদিত ডিপোজিট বাদ অনুমোদিত
                উইথড্র, অর্থাৎ সত্যিই কত টাকা ঢুকেছে।
            </p>

            <div className="adm__filters">
                {RANGES.map((d) => (
                    <Link key={d} href={`/admin/reports?days=${d}`} className={days === d ? 'on' : undefined}>
                        শেষ {d} দিন
                    </Link>
                ))}
            </div>

            <div className="adm__tiles" style={{ marginBottom: 14 }}>
                <div className="adm__tile"><b>{taka(totals.deposits)}</b><small>ডিপোজিট</small></div>
                <div className="adm__tile"><b>{taka(totals.withdrawals)}</b><small>উইথড্র</small></div>
                <div className="adm__tile"><b>{taka(net)}</b><small>নিট ক্যাশ</small></div>
                <div className="adm__tile"><b>{taka(totals.staked)}</b><small>মোট বেট</small></div>
                <div className="adm__tile"><b>{taka(totals.ggr)}</b><small>মোট GGR</small></div>
                <div className="adm__tile"><b>{totals.signups}</b><small>নতুন ইউজার</small></div>
            </div>

            <DataTable
                columns={['তারিখ', 'ডিপোজিট', 'উইথড্র', 'নিট', 'বেট', 'জেতা', 'GGR', 'বোনাস', 'রাউন্ড', 'নতুন']}
                rows={rows.map((r) => [
                    day(r.date),
                    taka(r.deposits),
                    taka(r.withdrawals),
                    <span className={r.deposits - r.withdrawals < 0 ? 'adm__miss' : 'adm__ok'}>
                        {taka(r.deposits - r.withdrawals)}
                    </span>,
                    taka(r.staked),
                    taka(r.paid),
                    <span className={r.ggr < 0 ? 'adm__miss' : 'adm__ok'}>{taka(r.ggr)}</span>,
                    taka(r.bonuses),
                    r.rounds,
                    r.signups,
                ])}
                empty="এই সময়ে কোনো হিসাব নেই।"
            />
        </>
    );
}

Reports.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
