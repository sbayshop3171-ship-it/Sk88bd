import { Head, Link } from '@inertiajs/react';
import AdminLayout from '../../layouts/AdminLayout';
import { taka } from '../../lib/brand';

interface Tile {
    label: string;
    value: number;
    money?: boolean;
}

export default function Dashboard({
    tiles,
    channelsMissingAccount,
}: {
    tiles: Tile[];
    channelsMissingAccount: string[];
}) {
    return (
        <>
            <Head title="অ্যাডমিন — ড্যাশবোর্ড" />
            <h1 className="adm__h1">ড্যাশবোর্ড</h1>

            {channelsMissingAccount.length > 0 && (
                <div className="adm__warn">
                    এই ডিপোজিট চ্যানেলগুলোর রিসিভিং নাম্বার সেট করা হয়নি:{' '}
                    <b>{channelsMissingAccount.join(', ')}</b>। প্লেয়ার কোথায় টাকা পাঠাবে
                    দেখতে পাচ্ছে না — <Link href="/admin/settings">সেটিংসে</Link> নাম্বার বসান।
                </div>
            )}

            <div className="adm__tiles">
                {tiles.map((t) => (
                    <div className="adm__tile" key={t.label}>
                        <b>{t.money ? taka(t.value) : t.value.toLocaleString('en-IN')}</b>
                        <small>{t.label}</small>
                    </div>
                ))}
            </div>
        </>
    );
}

Dashboard.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
