import { Head, Link } from '@inertiajs/react';
import DataTable from '../../components/admin/DataTable';
import Pagination from '../../components/Pagination';
import AdminLayout from '../../layouts/AdminLayout';
import { taka } from '../../lib/brand';
import { when } from '../../lib/date';
import type { Paginated } from '../../types';

interface Row {
    id: number;
    action: string;
    subject_type: string | null;
    subject_id: string | null;
    amount: number | null;
    note: string | null;
    ip: string | null;
    created_at: string;
    admin: { id: number; phone: string; display_name: string | null } | null;
    target_user: { id: number; phone: string } | null;
}

const ACTION_LABEL: Record<string, string> = {
    'deposit.approved': 'ডিপোজিট অনুমোদন',
    'deposit.rejected': 'ডিপোজিট বাতিল',
    'withdrawal.approved': 'উইথড্র অনুমোদন',
    'withdrawal.rejected': 'উইথড্র বাতিল',
    'user.adjust': 'ব্যালেন্স অ্যাডজাস্ট',
    'user.update': 'ইউজার আপডেট',
    'channel.update': 'চ্যানেল আপডেট',
    'settings.site': 'সাইট সেটিংস',
};

export default function Audit({
    rows,
    action,
    actions,
}: {
    rows: Paginated<Row>;
    action: string;
    actions: string[];
}) {
    return (
        <>
            <Head title="অ্যাডমিন — অডিট লগ" />
            <h1 className="adm__h1">অডিট লগ</h1>
            <p className="adm__sub">
                কোন অ্যাডমিন কখন কী করেছে তার স্থায়ী রেকর্ড। এখান থেকে কিছু মুছে
                ফেলা বা বদলানো যায় না — সেটাই এই লগের কাজ।
            </p>

            <div className="adm__filters">
                <Link href="/admin/audit" className={action === '' ? 'on' : undefined}>সব</Link>
                {actions.map((a) => (
                    <Link
                        key={a}
                        href={`/admin/audit?action=${encodeURIComponent(a)}`}
                        className={action === a ? 'on' : undefined}
                    >
                        {ACTION_LABEL[a] ?? a}
                    </Link>
                ))}
            </div>

            <DataTable
                columns={['#', 'অ্যাডমিন', 'কাজ', 'যাকে', 'পরিমাণ', 'নোট', 'IP', 'সময়']}
                rows={rows.data.map((r) => [
                    r.id,
                    r.admin?.display_name || r.admin?.phone || '—',
                    ACTION_LABEL[r.action] ?? r.action,
                    r.target_user?.phone ?? (r.subject_id ? `${r.subject_type}#${r.subject_id}` : '—'),
                    r.amount === null
                        ? '—'
                        : (
                            <span className={r.amount < 0 ? 'adm__err' : 'adm__ok'}>
                                {r.amount < 0 ? '−' : '+'}{taka(Math.abs(r.amount))}
                            </span>
                        ),
                    <span className="adm__muted">{r.note ?? '—'}</span>,
                    <span className="adm__muted">{r.ip ?? '—'}</span>,
                    when(r.created_at),
                ])}
                empty="এখনো কোনো অ্যাডমিন কাজ রেকর্ড হয়নি।"
            />

            <Pagination page={rows} />
        </>
    );
}

Audit.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
