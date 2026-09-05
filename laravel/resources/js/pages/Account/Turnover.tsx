import { Head } from '@inertiajs/react';
import Empty from '../../components/Empty';
import PageHeader from '../../components/PageHeader';
import { taka } from '../../lib/brand';

export default function Turnover({ turnover }: { turnover: { need: number; done: number } }) {
    const { need, done } = turnover;
    const pct = need > 0 ? Math.min(100, (done / need) * 100) : 100;

    return (
        <>
            <Head title="টার্নওভার" />
            <PageHeader title="টার্নওভার" />

            <div className="note" style={{ margin: 12 }}>
                বোনাস নেওয়ার পর নির্দিষ্ট টার্নওভার সম্পূর্ণ করলে ব্যালেন্স উইথড্র করা যাবে।
            </div>

            {need === 0 ? (
                <Empty glyph="🔄" text="এখনো কোনো চলমান টার্নওভার নেই।" />
            ) : (
                <div className="turn">
                    <div className="turn__row"><span>অগ্রগতি</span><b>{pct.toFixed(1)}%</b></div>
                    <div className="turn__bar"><i style={{ width: `${pct}%` }} /></div>
                    <div className="turn__row"><span>সম্পূর্ণ হয়েছে</span><b>{taka(done)}</b></div>
                    <div className="turn__row"><span>প্রয়োজন</span><b>{taka(need)}</b></div>
                    <div className="turn__row"><span>বাকি</span><b>{taka(Math.max(0, need - done))}</b></div>
                </div>
            )}
        </>
    );
}
