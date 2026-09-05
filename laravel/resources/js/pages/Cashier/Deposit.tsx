import { Head, Link, useForm } from '@inertiajs/react';
import Field from '../../components/Field';
import PageHeader from '../../components/PageHeader';
import { useUI } from '../../providers/UIProvider';
import { taka } from '../../lib/brand';
import { t } from '../../lib/strings';
import type { Channel } from '../../types';

export default function Deposit({
    channels,
    quickAmounts,
}: {
    channels: Channel[];
    quickAmounts: number[];
}) {
    const { toast } = useUI();
    const { data, setData, post, processing, errors } = useForm({
        channel_id: channels[0]?.id ?? '',
        amount: '',
        sender_no: '',
        txn_id: '',
    });

    const channel = channels.find((c) => c.id === data.channel_id) ?? channels[0];

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/deposit');
    };

    const copyAccount = async () => {
        if (!channel?.account_no) {
            return;
        }
        try {
            await navigator.clipboard.writeText(channel.account_no);
            toast('নাম্বার কপি হয়েছে');
        } catch {
            toast('কপি করা যায়নি — ম্যানুয়ালি লিখে নিন');
        }
    };

    return (
        <>
            <Head title={t.deposit} />
            <PageHeader
                title={t.deposit}
                action={<Link href="/deposit-history" className="btn btn--ghost" style={{ fontSize: 11, padding: '6px 12px' }}>হিস্টোরি</Link>}
            />

            <form style={{ margin: 12 }} onSubmit={submit} noValidate>
                <div className="field">
                    <label>পেমেন্ট মেথড</label>
                    <div className="grid grid--2" style={{ gap: 8 }}>
                        {channels.map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => setData('channel_id', c.id)}
                                className="game"
                                style={{
                                    padding: '10px 8px',
                                    display: 'flex', alignItems: 'center', gap: 9,
                                    borderColor: c.id === data.channel_id ? 'var(--gold)' : 'var(--line)',
                                    background: c.id === data.channel_id ? 'rgba(255,196,46,.12)' : undefined,
                                }}
                                aria-pressed={c.id === data.channel_id}
                            >
                                <span className={c.art ?? 'a1'} style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', fontSize: 15, flex: '0 0 30px' }}>
                                    {c.glyph}
                                </span>
                                <span style={{ fontSize: 12, fontWeight: 700 }}>{c.name}</span>
                            </button>
                        ))}
                    </div>
                    {errors.channel_id && <div className="field__err">{errors.channel_id}</div>}
                </div>

                {/* Without the operator's receiving number there is nowhere to send
                    the money, so this sits above the amount box rather than below. */}
                {channel?.account_no ? (
                    <div className="payto">
                        <span className="payto__lbl">এই {channel.name} নাম্বারে টাকা পাঠান</span>
                        <div className="payto__row">
                            <b className="payto__no">{channel.account_no}</b>
                            <button type="button" className="btn btn--ghost payto__copy" onClick={copyAccount}>
                                কপি
                            </button>
                        </div>
                        {channel.account_name && (
                            <span className="payto__name">অ্যাকাউন্টের নাম: {channel.account_name}</span>
                        )}
                        <span className="payto__hint">
                            টাকা পাঠানোর পর নিচের ফর্মে পরিমাণ ও ট্রানজেকশন আইডি দিয়ে রিকোয়েস্ট জমা দিন।
                        </span>
                    </div>
                ) : (
                    <div className="payto payto--missing">
                        {channel?.name} এর রিসিভিং নাম্বার এখনো সেট করা হয়নি। অন্য মেথড বেছে নিন
                        অথবা লাইভ চ্যাটে যোগাযোগ করুন।
                    </div>
                )}

                <div className="field">
                    <label>দ্রুত সিলেক্ট</label>
                    <div className="scroll-x">
                        <div className="provs">
                            {quickAmounts.map((a) => (
                                <button key={a} type="button" className="prov" onClick={() => setData('amount', String(a))}>
                                    {taka(a * 100)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <Field label={`পরিমাণ (সর্বনিম্ন ${taka(channel?.min_amount ?? 0)})`} error={errors.amount}>
                    <input
                        type="number" inputMode="numeric"
                        placeholder={String((channel?.min_amount ?? 0) / 100)}
                        value={data.amount} onChange={(e) => setData('amount', e.target.value)}
                        disabled={processing}
                    />
                </Field>

                <Field label="যে নাম্বার থেকে পাঠিয়েছেন (ঐচ্ছিক)" error={errors.sender_no}>
                    <input type="tel" inputMode="numeric" placeholder="01XXXXXXXXX"
                           value={data.sender_no} onChange={(e) => setData('sender_no', e.target.value.trim())}
                           disabled={processing} />
                </Field>

                <Field label="ট্রানজেকশন আইডি (ঐচ্ছিক)" error={errors.txn_id}>
                    <input type="text" placeholder="TXN123456"
                           value={data.txn_id} onChange={(e) => setData('txn_id', e.target.value.trim())}
                           disabled={processing} />
                </Field>

                <button type="submit" className="btn btn--gold btn--block" disabled={processing}>
                    {processing ? 'অপেক্ষা করুন…' : `${t.deposit} করুন`}
                </button>

                <div className="note">
                    ডিপোজিট লিমিট: {taka(channel?.min_amount ?? 0)} — {taka(channel?.max_amount ?? 0)}।
                    রিকোয়েস্ট জমা দিলে অ্যাডমিন যাচাই করে ব্যালেন্সে যোগ করবেন।
                </div>
            </form>
        </>
    );
}
