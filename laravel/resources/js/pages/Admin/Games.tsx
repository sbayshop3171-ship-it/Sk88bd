import { Head, router, useForm } from '@inertiajs/react';
import DataTable from '../../components/admin/DataTable';
import AdminLayout from '../../layouts/AdminLayout';
import { CATEGORY_LABEL } from '../../lib/strings';
import type { CategoryKey, Game } from '../../types';

export default function Games({
    rows,
    categories,
    stats,
}: {
    rows: Game[];
    categories: CategoryKey[];
    stats: { total: number; withArt: number; withDemo: number; playable: number };
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        slug: '',
        name: '',
        provider: '',
        category: categories[0] ?? 'hot',
        glyph: '',
        thumb_url: '',
        demo_url: '',
        tag: '',
        is_playable: false,
        is_active: true,
        sort_order: 0,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/games', { preserveScroll: true, onSuccess: () => reset() });
    };

    return (
        <>
            <Head title="অ্যাডমিন — গেম" />
            <h1 className="adm__h1">গেম</h1>
            <p className="adm__sub">
                আর্ট বসাতে ফাইলগুলো <code>public/games/</code> এ রাখুন, তারপর নিচে
                সেই গেমের <code>thumb_url</code> সেট করুন (যেমন <code>/games/aviator.webp</code>)।
                একই গেম একাধিক ক্যাটাগরিতে রাখতে একই স্লাগ দিয়ে আলাদা সারি যোগ করুন।
            </p>
            <p className="adm__sub">
                <b>ডেমো URL</b> — অ্যাগ্রিগেটরের দেওয়া fun-mode লিংক (অবশ্যই{' '}
                <code>https://</code>)। বসালে <code>/casino/&lt;স্লাগ&gt;</code> পেজে আসল গেমটি
                খেলার টাকায় চলবে, প্লেয়ারের ব্যালেন্স ছোঁবে না। খালি রাখলে আগের মতো
                &ldquo;প্রোভাইডার যুক্ত হয়নি&rdquo; প্লেসহোল্ডার থাকবে। রিয়েল টাকার মোড আলাদা —
                ওটার জন্য অ্যাগ্রিগেটর থেকে প্রতি সেশনে টোকেন নিতে হয়।
            </p>

            <div className="adm__tiles" style={{ marginBottom: 14 }}>
                <div className="adm__tile"><b>{stats.total}</b><small>মোট প্লেসমেন্ট</small></div>
                <div className="adm__tile"><b>{stats.withArt}</b><small>আর্ট বসানো</small></div>
                <div className="adm__tile"><b>{stats.withDemo}</b><small>ডেমো যুক্ত</small></div>
                <div className="adm__tile"><b>{stats.playable}</b><small>নিজস্ব ইঞ্জিন</small></div>
            </div>

            <h2 className="adm__h2">নতুন গেম</h2>
            <form className="adm__form" onSubmit={submit}>
                <label>স্লাগ
                    <input value={data.slug} onChange={(e) => setData('slug', e.target.value)} placeholder="aviator" />
                    {errors.slug && <span className="adm__err">{errors.slug}</span>}
                </label>
                <label>নাম
                    <input value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Aviator" />
                    {errors.name && <span className="adm__err">{errors.name}</span>}
                </label>
                <label>প্রোভাইডার
                    <input value={data.provider} onChange={(e) => setData('provider', e.target.value)} placeholder="Spribe" />
                    {errors.provider && <span className="adm__err">{errors.provider}</span>}
                </label>
                <label>ক্যাটাগরি
                    <select value={data.category} onChange={(e) => setData('category', e.target.value as CategoryKey)}>
                        {categories.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                    </select>
                    {errors.category && <span className="adm__err">{errors.category}</span>}
                </label>
                <label>গ্লিফ
                    <input value={data.glyph} onChange={(e) => setData('glyph', e.target.value)} placeholder="✈️" />
                </label>
                <label>আর্ট URL
                    <input value={data.thumb_url} onChange={(e) => setData('thumb_url', e.target.value)} placeholder="/games/aviator.webp" />
                </label>
                <label>ডেমো URL
                    <input value={data.demo_url} onChange={(e) => setData('demo_url', e.target.value)} placeholder="https://demo.provider.com/…" />
                    {errors.demo_url && <span className="adm__err">{errors.demo_url}</span>}
                </label>
                <label>ট্যাগ
                    <select value={data.tag} onChange={(e) => setData('tag', e.target.value)}>
                        <option value="">—</option>
                        <option value="hot">hot</option>
                        <option value="new">new</option>
                        <option value="top">top</option>
                    </select>
                </label>
                <label>ক্রম
                    <input type="number" value={data.sort_order} onChange={(e) => setData('sort_order', Number(e.target.value))} />
                </label>
                <label>চালু গেম
                    <input type="checkbox" checked={data.is_playable} onChange={(e) => setData('is_playable', e.target.checked)} />
                </label>
                <button className="adm__btn adm__btn--go" type="submit" disabled={processing}>যোগ করুন</button>
            </form>

            <h2 className="adm__h2">তালিকা</h2>
            <DataTable
                columns={['গেম', 'স্লাগ', 'প্রোভাইডার', 'ক্যাটাগরি', 'আর্ট', 'ডেমো', 'অবস্থা', 'ট্যাগ', '']}
                rows={rows.map((g) => [
                    g.name,
                    g.slug,
                    g.provider,
                    CATEGORY_LABEL[g.category] ?? g.category,
                    g.thumb_url
                        ? <span className="adm__ok">আছে</span>
                        : <span className="adm__miss">জেনারেটেড আর্ট</span>,
                    g.demo_url
                        ? <span className="adm__ok">যুক্ত</span>
                        : <span className="adm__muted">নেই</span>,
                    g.is_playable
                        ? <span className="adm__ok">চালু</span>
                        : <span className="adm__muted">শুধু তালিকায়</span>,
                    g.tag ?? '—',
                    <div className="adm__acts">
                        <button
                            className="adm__btn"
                            type="button"
                            onClick={() => router.patch(`/admin/games/${g.id}`, {
                                slug: g.slug, name: g.name, provider: g.provider,
                                category: g.category, glyph: g.glyph, thumb_url: g.thumb_url,
                                demo_url: g.demo_url,
                                tag: g.tag, is_playable: g.is_playable, is_active: !g.is_active,
                            }, { preserveScroll: true })}
                        >
                            {g.is_active ? 'লুকান' : 'দেখান'}
                        </button>
                        <button
                            className="adm__btn adm__btn--no"
                            type="button"
                            onClick={() => router.delete(`/admin/games/${g.id}`, { preserveScroll: true })}
                        >
                            মুছুন
                        </button>
                    </div>,
                ])}
                empty="কোনো গেম নেই।"
            />
        </>
    );
}

Games.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
