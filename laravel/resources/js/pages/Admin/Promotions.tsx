import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import DataTable from '../../components/admin/DataTable';
import AdminLayout from '../../layouts/AdminLayout';
import { when } from '../../lib/date';

interface Row {
    id: string;
    title: string;
    body: string;
    glyph: string | null;
    art: string | null;
    badge: string | null;
    image_url: string | null;
    is_active: boolean;
    sort_order: number;
    updated_at: string;
}

/** Edit in place: the body is long enough that a modal would hide the list. */
function EditRow({ row }: { row: Row }) {
    const [open, setOpen] = useState(false);
    const { data, setData, patch, processing } = useForm({
        title: row.title,
        body: row.body,
        glyph: row.glyph ?? '',
        art: row.art ?? '',
        badge: row.badge ?? '',
        image_url: row.image_url ?? '',
        is_active: row.is_active,
        sort_order: row.sort_order,
    });

    if (!open) {
        return (
            <div className="adm__acts">
                <button className="adm__btn" type="button" onClick={() => setOpen(true)}>এডিট</button>
                <button
                    className={`adm__btn ${row.is_active ? 'adm__btn--no' : 'adm__btn--ok'}`}
                    type="button"
                    onClick={() => router.patch(`/admin/promotions/${row.id}`, {
                        ...row, is_active: !row.is_active,
                    }, { preserveScroll: true })}
                >
                    {row.is_active ? 'বন্ধ' : 'চালু'}
                </button>
                <button
                    className="adm__btn adm__btn--no"
                    type="button"
                    onClick={() => router.delete(`/admin/promotions/${row.id}`, { preserveScroll: true })}
                >
                    মুছুন
                </button>
            </div>
        );
    }

    return (
        <form
            className="adm__form"
            onSubmit={(e) => {
                e.preventDefault();
                patch(`/admin/promotions/${row.id}`, { preserveScroll: true, onSuccess: () => setOpen(false) });
            }}
        >
            <label>শিরোনাম
                <input value={data.title} onChange={(e) => setData('title', e.target.value)} />
            </label>
            <label>বিবরণ
                <textarea rows={3} value={data.body} onChange={(e) => setData('body', e.target.value)} />
            </label>
            <label>গ্লিফ
                <input value={data.glyph} onChange={(e) => setData('glyph', e.target.value)} placeholder="🎁" />
            </label>
            <label>আর্ট ক্লাস
                <input value={data.art} onChange={(e) => setData('art', e.target.value)} placeholder="a1" />
            </label>
            <label>ব্যাজ
                <input value={data.badge} onChange={(e) => setData('badge', e.target.value)} placeholder="নতুন" />
            </label>
            <label>ছবির URL
                <input value={data.image_url} onChange={(e) => setData('image_url', e.target.value)} />
            </label>
            <label>ক্রম
                <input type="number" value={data.sort_order}
                       onChange={(e) => setData('sort_order', Number(e.target.value))} />
            </label>
            <div className="adm__acts">
                <button className="adm__btn adm__btn--go" type="submit" disabled={processing}>সেভ</button>
                <button className="adm__btn" type="button" onClick={() => setOpen(false)}>বাদ</button>
            </div>
        </form>
    );
}

export default function Promotions({ rows }: { rows: Row[] }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        id: '',
        title: '',
        body: '',
        glyph: '',
        art: 'a1',
        badge: '',
        image_url: '',
        is_active: true,
        sort_order: 0,
    });

    return (
        <>
            <Head title="অ্যাডমিন — প্রোমোশন" />
            <h1 className="adm__h1">প্রোমোশন</h1>
            <p className="adm__sub">
                <code>/promotions</code> পেজে যে অফারগুলো দেখা যায়। আইডিটাই অফারের স্থায়ী নাম —
                পরে সাপোর্টে এই আইডি ধরেই কথা হবে, তাই একবার দিলে আর বদলানো যায় না।
                বোনাসের টাকা এখান থেকে দেওয়া হয় না; সেটা <code>সেটিংস</code> (সাইনআপ/চেক-ইন)
                অথবা ইউজার পেজ থেকে দিতে হয়।
            </p>

            <h2 className="adm__h2">নতুন প্রোমোশন</h2>
            <form
                className="adm__form"
                onSubmit={(e) => {
                    e.preventDefault();
                    post('/admin/promotions', { preserveScroll: true, onSuccess: () => reset() });
                }}
            >
                <label>আইডি
                    <input value={data.id} onChange={(e) => setData('id', e.target.value)} placeholder="welcome-100" />
                    {errors.id && <span className="adm__err">{errors.id}</span>}
                </label>
                <label>শিরোনাম
                    <input value={data.title} onChange={(e) => setData('title', e.target.value)} placeholder="প্রথম ডিপোজিটে ১০০% বোনাস" />
                    {errors.title && <span className="adm__err">{errors.title}</span>}
                </label>
                <label>বিবরণ
                    <textarea rows={3} value={data.body} onChange={(e) => setData('body', e.target.value)} />
                    {errors.body && <span className="adm__err">{errors.body}</span>}
                </label>
                <label>গ্লিফ
                    <input value={data.glyph} onChange={(e) => setData('glyph', e.target.value)} placeholder="🎁" />
                </label>
                <label>আর্ট ক্লাস
                    <input value={data.art} onChange={(e) => setData('art', e.target.value)} placeholder="a1" />
                </label>
                <label>ব্যাজ
                    <input value={data.badge} onChange={(e) => setData('badge', e.target.value)} placeholder="নতুন" />
                </label>
                <label>ক্রম
                    <input type="number" value={data.sort_order}
                           onChange={(e) => setData('sort_order', Number(e.target.value))} />
                </label>
                <button className="adm__btn adm__btn--go" type="submit" disabled={processing}>যোগ করুন</button>
            </form>

            <DataTable
                columns={['আইডি', 'শিরোনাম', 'ব্যাজ', 'ক্রম', 'অবস্থা', 'আপডেট', '']}
                rows={rows.map((r) => [
                    <code>{r.id}</code>,
                    <>{r.glyph} {r.title}</>,
                    r.badge ?? '—',
                    r.sort_order,
                    r.is_active ? <span className="adm__ok">চালু</span> : <span className="adm__miss">বন্ধ</span>,
                    when(r.updated_at),
                    <EditRow row={r} />,
                ])}
                empty="কোনো প্রোমোশন নেই।"
            />
        </>
    );
}

Promotions.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
