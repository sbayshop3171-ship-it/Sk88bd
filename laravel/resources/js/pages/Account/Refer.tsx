import { Head } from '@inertiajs/react';
import PageHeader from '../../components/PageHeader';
import { useUI } from '../../providers/UIProvider';
import { BRAND, taka } from '../../lib/brand';

const STEPS: [string, string][] = [
    ['১', 'আপনার রেফারেল লিংক বন্ধুদের শেয়ার করুন'],
    ['২', 'বন্ধু রেজিস্টার করে ডিপোজিট করুক'],
    ['৩', 'সে যত খেলবে, আপনি তত কমিশন পাবেন — আজীবন'],
];

export default function Refer({
    referralCode,
    ratePercent,
    stats,
}: {
    referralCode: string | null;
    /** what the nightly settlement actually pays; 0 until an operator sets it */
    ratePercent: number;
    stats: { total: number; active: number; commission: number };
}) {
    const { toast } = useUI();
    const link = referralCode
        ? `https://${BRAND.domain}/register?referral_code=${referralCode}`
        : `https://${BRAND.domain}/register`;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(link);
            toast('লিংক কপি হয়েছে');
        } catch {
            toast('কপি করা যায়নি — ম্যানুয়ালি কপি করুন');
        }
    };

    return (
        <>
            <Head title="রেফার ও কমিশন" />
            <PageHeader title="রেফার ও কমিশন" />

            <div className="hero">
                <h1>{ratePercent > 0 ? `${ratePercent}% কমিশন` : 'রেফার করুন'}</h1>
                <p>
                    {ratePercent > 0
                        ? 'বন্ধু আনুন, আজীবন কমিশন নিন'
                        : 'কমিশন চালু হলে এখানেই হার দেখা যাবে'}
                </p>
            </div>

            <div className="stat">
                <div><b>{stats.total}</b><small>মোট রেফার</small></div>
                <div><b>{stats.active}</b><small>সক্রিয় রেফার</small></div>
                <div><b>{taka(stats.commission)}</b><small>মোট কমিশন</small></div>
            </div>

            <div className="field" style={{ margin: 12 }}>
                <label>আপনার রেফারেল লিংক</label>
                <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
                <button className="btn btn--gold btn--block" style={{ marginTop: 10 }} type="button" onClick={copy}>
                    লিংক কপি করুন
                </button>
            </div>

            <div className="list-card">
                {STEPS.map(([n, text]) => (
                    <div key={n} style={{ display: 'flex', gap: 11, padding: '13px 14px', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                        <span className="winners__rank">{n}</span>
                        <span>{text}</span>
                    </div>
                ))}
            </div>

            {!referralCode && (
                <div className="note" style={{ margin: 12 }}>
                    লগইন করলে আপনার নিজস্ব কোড দিয়ে লিংক তৈরি হবে।
                </div>
            )}
        </>
    );
}
