import { Head, Link, useForm } from '@inertiajs/react';
import Field from '../../components/Field';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../lib/auth';
import { taka } from '../../lib/brand';
import { t } from '../../lib/strings';
import type { Channel } from '../../types';

export default function Withdraw({
    channels,
    turnoverCleared,
}: {
    channels: Channel[];
    turnoverCleared: boolean;
}) {
    const { wallet } = useAuth();
    const { data, setData, post, processing, errors } = useForm({
        channel_id: channels[0]?.id ?? '',
        account_no: '',
        amount: '',
    });

    const channel = channels.find((c) => c.id === data.channel_id) ?? channels[0];

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/withdraw');
    };

    return (
        <>
            <Head title={t.withdraw} />
            <PageHeader
                title={t.withdraw}
                action={<Link href="/withdraw-history" className="btn btn--ghost" style={{ fontSize: 11, padding: '6px 12px' }}>হিস্টোরি</Link>}
            />

            <div className="profile">
                <i className="profile__av" aria-hidden>👤</i>
                <div>
                    <div className="profile__n">উইথড্রযোগ্য</div>
                    <div className="profile__id">
                        {turnoverCleared ? 'এখনই তোলা যাবে' : 'টার্নওভার সম্পূর্ণ হলে তোলা যাবে'}
                    </div>
                </div>
                <div className="profile__bal">
                    <b>{taka(wallet?.balance ?? 0)}</b>
                    <small>ব্যালেন্স</small>
                </div>
            </div>

            <form style={{ margin: 12 }} onSubmit={submit} noValidate>
                <Field label="পেমেন্ট মেথড" error={errors.channel_id}>
                    <select value={data.channel_id} onChange={(e) => setData('channel_id', e.target.value)} disabled={processing}>
                        {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </Field>
                <Field label="আপনার অ্যাকাউন্ট নাম্বার" error={errors.account_no}>
                    <input type="tel" inputMode="numeric" placeholder="01XXXXXXXXX"
                           value={data.account_no} onChange={(e) => setData('account_no', e.target.value.trim())}
                           disabled={processing} />
                </Field>
                <Field label={`পরিমাণ (সর্বনিম্ন ${taka(channel?.min_amount ?? 0)})`} error={errors.amount}>
                    <input type="number" inputMode="numeric"
                           placeholder={String((channel?.min_amount ?? 0) / 100)}
                           value={data.amount} onChange={(e) => setData('amount', e.target.value)}
                           disabled={processing} />
                </Field>

                <button type="submit" className="btn btn--gold btn--block" disabled={processing}>
                    {processing ? 'অপেক্ষা করুন…' : `${t.withdraw} রিকোয়েস্ট`}
                </button>

                <div className="note">
                    উইথড্র রিকোয়েস্ট অ্যাডমিন প্যানেল থেকে অনুমোদনের পর প্রসেস হবে।
                </div>
            </form>
        </>
    );
}
