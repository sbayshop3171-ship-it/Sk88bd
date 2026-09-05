import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { BRAND } from '../../lib/brand';

interface Bonus {
    amount?: number;
    turnover_multiplier?: number;
}

interface Channel {
    id: string;
    name: string;
    account_no: string | null;
    account_name: string | null;
    min_amount: number;
    max_amount: number;
    supports_deposit: boolean;
    supports_withdraw: boolean;
    is_active: boolean;
}

/** One channel's own row-form: the operator's receiving account lives here and
    nowhere else — it is never sent to a player-facing page. */
function ChannelForm({ channel }: { channel: Channel }) {
    const { data, setData, patch, processing, errors } = useForm({
        account_no: channel.account_no ?? '',
        account_name: channel.account_name ?? '',
        min_amount: channel.min_amount / 100,
        max_amount: channel.max_amount / 100,
        supports_deposit: channel.supports_deposit,
        supports_withdraw: channel.supports_withdraw,
        is_active: channel.is_active,
    });

    // A channel players can deposit into is useless until the operator's own
    // receiving number is set — there is nowhere to send the money.
    const missingAccount = channel.supports_deposit && !channel.account_no?.trim();

    return (
        <form
            className="adm__form"
            onSubmit={(e) => { e.preventDefault(); patch(`/admin/settings/channels/${channel.id}`, { preserveScroll: true }); }}
        >
            <label>চ্যানেল
                <input value={channel.name} readOnly />
            </label>
            {missingAccount && (
                <div className="adm__warn" style={{ flexBasis: '100%' }}>
                    রিসিভিং নাম্বার সেট করা হয়নি — ডিপোজিট পেজে প্লেয়ার কোথায় টাকা
                    পাঠাবে দেখতে পাবে না। নাম্বার বসিয়ে সেভ করুন।
                </div>
            )}
            <label>অ্যাকাউন্ট নাম্বার
                <input value={data.account_no} onChange={(e) => setData('account_no', e.target.value)} placeholder="01XXXXXXXXX" />
                {errors.account_no && <span className="adm__err">{errors.account_no}</span>}
            </label>
            <label>অ্যাকাউন্টের নাম
                <input value={data.account_name} onChange={(e) => setData('account_name', e.target.value)} />
            </label>
            <label>সর্বনিম্ন ({BRAND.currency})
                <input type="number" value={data.min_amount} onChange={(e) => setData('min_amount', Number(e.target.value))} />
                {errors.min_amount && <span className="adm__err">{errors.min_amount}</span>}
            </label>
            <label>সর্বোচ্চ ({BRAND.currency})
                <input type="number" value={data.max_amount} onChange={(e) => setData('max_amount', Number(e.target.value))} />
                {errors.max_amount && <span className="adm__err">{errors.max_amount}</span>}
            </label>
            <label>ডিপোজিট
                <input type="checkbox" checked={data.supports_deposit} onChange={(e) => setData('supports_deposit', e.target.checked)} />
            </label>
            <label>উইথড্র
                <input type="checkbox" checked={data.supports_withdraw} onChange={(e) => setData('supports_withdraw', e.target.checked)} />
            </label>
            <label>সক্রিয়
                <input type="checkbox" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />
            </label>
            <div className="adm__acts">
                <button className="adm__btn adm__btn--go" type="submit" disabled={processing}>সেভ</button>
                <button
                    className="adm__btn adm__btn--no"
                    type="button"
                    onClick={() => router.delete(`/admin/settings/channels/${channel.id}`, { preserveScroll: true })}
                >
                    মুছুন
                </button>
            </div>
        </form>
    );
}

/**
 * A new cashier channel.
 *
 * Folded away by default: adding one is rare, and the six that ship cover
 * every way money moves in Bangladesh today.
 */
function NewChannel() {
    const [open, setOpen] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        id: '',
        name: '',
        kind: 'mobile',
        glyph: '',
        account_no: '',
        account_name: '',
        min_amount: 300,
        max_amount: 30000,
        supports_deposit: true,
        supports_withdraw: true,
        is_active: true,
    });

    if (!open) {
        return (
            <button className="adm__btn" type="button" onClick={() => setOpen(true)}>+ নতুন চ্যানেল</button>
        );
    }

    return (
        <form
            className="adm__form"
            onSubmit={(e) => {
                e.preventDefault();
                post('/admin/settings/channels', { preserveScroll: true, onSuccess: () => { reset(); setOpen(false); } });
            }}
        >
            <label>আইডি
                <input value={data.id} onChange={(e) => setData('id', e.target.value)} placeholder="tap" />
                {errors.id && <span className="adm__err">{errors.id}</span>}
            </label>
            <label>নাম
                <input value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="TAP" />
                {errors.name && <span className="adm__err">{errors.name}</span>}
            </label>
            <label>ধরন
                <select value={data.kind} onChange={(e) => setData('kind', e.target.value)}>
                    <option value="mobile">মোবাইল ব্যাংকিং</option>
                    <option value="bank">ব্যাংক</option>
                    <option value="crypto">ক্রিপ্টো</option>
                </select>
            </label>
            <label>গ্লিফ
                <input value={data.glyph} onChange={(e) => setData('glyph', e.target.value)} placeholder="💳" />
            </label>
            <label>অ্যাকাউন্ট নাম্বার
                <input value={data.account_no} onChange={(e) => setData('account_no', e.target.value)} placeholder="01XXXXXXXXX" />
            </label>
            <label>অ্যাকাউন্টের নাম
                <input value={data.account_name} onChange={(e) => setData('account_name', e.target.value)} />
            </label>
            <label>সর্বনিম্ন ({BRAND.currency})
                <input type="number" value={data.min_amount} onChange={(e) => setData('min_amount', Number(e.target.value))} />
            </label>
            <label>সর্বোচ্চ ({BRAND.currency})
                <input type="number" value={data.max_amount} onChange={(e) => setData('max_amount', Number(e.target.value))} />
                {errors.max_amount && <span className="adm__err">{errors.max_amount}</span>}
            </label>
            <div className="adm__acts">
                <button className="adm__btn adm__btn--go" type="submit" disabled={processing}>যোগ করুন</button>
                <button className="adm__btn" type="button" onClick={() => { reset(); setOpen(false); }}>বাদ</button>
            </div>
        </form>
    );
}

/**
 * What the site gives away by itself.
 *
 * The turnover multiplier is the half that matters: at 0 a bonus is cash the
 * player can withdraw immediately, which turns a welcome offer into a way to
 * empty the account.
 */
function Bonuses({
    signupBonus,
    checkinBonus,
    appLinks,
    referral,
}: {
    signupBonus: Bonus;
    checkinBonus: Bonus;
    appLinks: { android?: string | null; ios?: string | null };
    referral: { rate_bp?: number };
}) {
    const { data, setData, patch, processing, errors } = useForm({
        signup_amount: (signupBonus.amount ?? 0) / 100,
        signup_turnover: signupBonus.turnover_multiplier ?? 10,
        checkin_amount: (checkinBonus.amount ?? 0) / 100,
        checkin_turnover: checkinBonus.turnover_multiplier ?? 10,
        referral_rate: (referral.rate_bp ?? 0) / 100,
        android: appLinks.android ?? '',
        ios: appLinks.ios ?? '',
    });

    return (
        <form
            className="adm__form"
            onSubmit={(e) => { e.preventDefault(); patch('/admin/settings/bonus', { preserveScroll: true }); }}
        >
            <label>সাইনআপ বোনাস ({BRAND.currency})
                <input type="number" step="0.01" value={data.signup_amount}
                       onChange={(e) => setData('signup_amount', Number(e.target.value))} />
                {errors.signup_amount && <span className="adm__err">{errors.signup_amount}</span>}
            </label>
            <label>সাইনআপ টার্নওভার গুণক
                <input type="number" value={data.signup_turnover}
                       onChange={(e) => setData('signup_turnover', Number(e.target.value))} />
                {errors.signup_turnover && <span className="adm__err">{errors.signup_turnover}</span>}
            </label>
            <label>দৈনিক চেক-ইন বোনাস ({BRAND.currency})
                <input type="number" step="0.01" value={data.checkin_amount}
                       onChange={(e) => setData('checkin_amount', Number(e.target.value))} />
            </label>
            <label>চেক-ইন টার্নওভার গুণক
                <input type="number" value={data.checkin_turnover}
                       onChange={(e) => setData('checkin_turnover', Number(e.target.value))} />
            </label>
            <label>রেফারেল কমিশন (%)
                <input type="number" step="0.5" value={data.referral_rate}
                       onChange={(e) => setData('referral_rate', Number(e.target.value))} />
                {errors.referral_rate && <span className="adm__err">{errors.referral_rate}</span>}
            </label>
            <label>Android অ্যাপ লিংক
                <input value={data.android} onChange={(e) => setData('android', e.target.value)} placeholder="https://…" />
                {errors.android && <span className="adm__err">{errors.android}</span>}
            </label>
            <label>iOS অ্যাপ লিংক
                <input value={data.ios} onChange={(e) => setData('ios', e.target.value)} placeholder="https://…" />
                {errors.ios && <span className="adm__err">{errors.ios}</span>}
            </label>
            <button className="adm__btn adm__btn--go" type="submit" disabled={processing}>সেভ</button>
        </form>
    );
}

export default function Settings({
    site,
    support,
    channels,
    signupBonus,
    checkinBonus,
    appLinks,
    referral,
}: {
    site: { name?: string; domain?: string; currency?: string };
    support: { email?: string; whatsapp?: string; telegram?: string; facebook?: string };
    channels: Channel[];
    signupBonus: Bonus;
    checkinBonus: Bonus;
    appLinks: { android?: string | null; ios?: string | null };
    referral: { rate_bp?: number };
}) {
    const { data, setData, patch, processing, errors } = useForm({
        name: site.name ?? BRAND.name,
        domain: site.domain ?? BRAND.domain,
        currency: site.currency ?? 'BDT',
        email: support.email ?? BRAND.email,
        whatsapp: support.whatsapp ?? '',
        telegram: support.telegram ?? '',
        facebook: support.facebook ?? '',
    });

    return (
        <>
            <Head title="অ্যাডমিন — সেটিংস" />
            <h1 className="adm__h1">সেটিংস</h1>

            <h2 className="adm__h2">সাইট</h2>
            <form
                className="adm__form"
                onSubmit={(e) => { e.preventDefault(); patch('/admin/settings/site', { preserveScroll: true }); }}
            >
                <label>সাইটের নাম
                    <input value={data.name} onChange={(e) => setData('name', e.target.value)} />
                    {errors.name && <span className="adm__err">{errors.name}</span>}
                </label>
                <label>ডোমেইন
                    <input value={data.domain} onChange={(e) => setData('domain', e.target.value)} />
                </label>
                <label>কারেন্সি
                    <input value={data.currency} onChange={(e) => setData('currency', e.target.value)} />
                </label>
                <label>সাপোর্ট ইমেইল
                    <input value={data.email} onChange={(e) => setData('email', e.target.value)} />
                    {errors.email && <span className="adm__err">{errors.email}</span>}
                </label>
                <label>WhatsApp
                    <input value={data.whatsapp} onChange={(e) => setData('whatsapp', e.target.value)} />
                </label>
                <label>Telegram
                    <input value={data.telegram} onChange={(e) => setData('telegram', e.target.value)} />
                </label>
                <label>Facebook
                    <input value={data.facebook} onChange={(e) => setData('facebook', e.target.value)} />
                </label>
                <button className="adm__btn adm__btn--go" type="submit" disabled={processing}>সেভ</button>
            </form>

            <h2 className="adm__h2">বোনাস ও অ্যাপ</h2>
            <p className="adm__sub">
                সাইনআপ বোনাস ০ থাকলে নতুন ইউজার কিছুই পায় না। টার্নওভার গুণক মানে —
                বোনাসের টাকা তোলার আগে তার কত গুণ বেট করতে হবে। ০ দিলে বোনাসটা সরাসরি
                তোলা যাবে, তাই ওটা দেবেন না।
                {' '}<b>রেফারেল কমিশন</b> — যে প্লেয়ারকে রেফার করা হয়েছে সে যত হারবে তার
                এই শতাংশ প্রতি রাতে রেফারারের ব্যালেন্সে যোগ হবে। ০ থাকলে কিছুই দেওয়া হয় না,
                আর রেফার পেজেও ০% দেখাবে।
            </p>
            <Bonuses signupBonus={signupBonus} checkinBonus={checkinBonus} appLinks={appLinks} referral={referral} />

            <h2 className="adm__h2">পেমেন্ট চ্যানেল</h2>
            <p className="adm__sub">
                অপারেটরের রিসিভিং অ্যাকাউন্ট নাম্বার কখনো ফ্রন্ট-এন্ড কোডে রাখা হয় না —
                সেগুলো ডেটাবেসে থাকে এবং শুধু এই স্ক্রিন থেকে সেট হয়।
            </p>
            {channels.map((c) => <ChannelForm key={c.id} channel={c} />)}
            <NewChannel />
        </>
    );
}

Settings.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
