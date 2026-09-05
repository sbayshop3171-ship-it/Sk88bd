import { Head, router, useForm } from '@inertiajs/react';
import DataTable from '../../components/admin/DataTable';
import AdminLayout from '../../layouts/AdminLayout';
import type { Banner } from '../../types';

interface Row extends Banner {
    placement: 'home' | 'announcement';
    is_active: boolean;
    sort_order: number;
}

export default function Banners({ rows }: { rows: Row[] }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
        subtitle: '',
        kicker: '',
        amount: '',
        emoji: '',
        cta: '',
        art: 'a1',
        href: '',
        placement: 'home',
        is_active: true,
        sort_order: 0,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/banners', { preserveScroll: true, onSuccess: () => reset() });
    };

    return (
        <>
            <Head title="অ্যাডমিন — ব্যানার" />
            <h1 className="adm__h1">ব্যানার ও ঘোষণা</h1>
            <p className="adm__sub">
                হোম পেজের স্লাইডার (<code>home</code>) ও শুরুতে দেখানো ঘোষণা পপআপ
                (<code>announcement</code>) এখান থেকে বদলানো যাবে। ছবি না দিলে{' '}
                <code>art</code> ক্লাসের গ্রেডিয়েন্ট ব্যবহার হবে — <code>a1</code> থেকে{' '}
                <code>a8</code>।
            </p>

            <h2 className="adm__h2">নতুন ব্যানার</h2>
            <form className="adm__form" onSubmit={submit}>
                <label>শিরোনাম
                    <input value={data.title} onChange={(e) => setData('title', e.target.value)} />
                    {errors.title && <span className="adm__err">{errors.title}</span>}
                </label>
                <label>কিকার
                    <input value={data.kicker} onChange={(e) => setData('kicker', e.target.value)} />
                </label>
                <label>সাবটাইটেল
                    <input value={data.subtitle} onChange={(e) => setData('subtitle', e.target.value)} />
                </label>
                <label>পরিমাণ
                    <input value={data.amount} onChange={(e) => setData('amount', e.target.value)} placeholder="৳১৮" />
                </label>
                <label>ইমোজি
                    <input value={data.emoji} onChange={(e) => setData('emoji', e.target.value)} placeholder="🎁" />
                </label>
                <label>বাটন লেখা
                    <input value={data.cta} onChange={(e) => setData('cta', e.target.value)} placeholder="এখনই নিন" />
                </label>
                <label>লিংক
                    <input value={data.href} onChange={(e) => setData('href', e.target.value)} placeholder="/register" />
                </label>
                <label>আর্ট ক্লাস
                    <select value={data.art} onChange={(e) => setData('art', e.target.value)}>
                        {['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'].map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                </label>
                <label>অবস্থান
                    <select value={data.placement} onChange={(e) => setData('placement', e.target.value)}>
                        <option value="home">home</option>
                        <option value="announcement">announcement</option>
                    </select>
                </label>
                <label>ক্রম
                    <input type="number" value={data.sort_order} onChange={(e) => setData('sort_order', Number(e.target.value))} />
                </label>
                <button className="adm__btn adm__btn--go" type="submit" disabled={processing}>যোগ করুন</button>
            </form>

            <h2 className="adm__h2">তালিকা</h2>
            <DataTable
                columns={['শিরোনাম', 'অবস্থান', 'আর্ট', 'লিংক', 'সক্রিয়', 'ক্রম', '']}
                rows={rows.map((b) => [
                    b.title,
                    b.placement,
                    b.image_url ?? b.art ?? '—',
                    b.href ?? '—',
                    b.is_active ? <span className="adm__ok">হ্যাঁ</span> : <span className="adm__miss">না</span>,
                    b.sort_order,
                    <div className="adm__acts">
                        <button
                            className="adm__btn"
                            type="button"
                            onClick={() => router.patch(`/admin/banners/${b.id}`, {
                                title: b.title, subtitle: b.subtitle, kicker: b.kicker,
                                amount: b.amount, emoji: b.emoji, cta: b.cta, art: b.art,
                                image_url: b.image_url, href: b.href, placement: b.placement,
                                is_active: !b.is_active, sort_order: b.sort_order,
                            }, { preserveScroll: true })}
                        >
                            {b.is_active ? 'লুকান' : 'দেখান'}
                        </button>
                        <button
                            className="adm__btn adm__btn--no"
                            type="button"
                            onClick={() => router.delete(`/admin/banners/${b.id}`, { preserveScroll: true })}
                        >
                            মুছুন
                        </button>
                    </div>,
                ])}
                empty="কোনো ব্যানার নেই।"
            />
        </>
    );
}

Banners.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
