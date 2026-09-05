import { router } from '@inertiajs/react';
import { useState } from 'react';

/**
 * Approve / reject a cashier request. Approving is what actually moves money,
 * so the note is required on a rejection — the player sees it on their history
 * screen and would otherwise have no idea why.
 */
export default function ReviewActions({
    url,
    state,
}: {
    url: string;
    state: 'pending' | 'approved' | 'rejected' | 'cancelled';
}) {
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');

    if (state !== 'pending') {
        return <span className="adm__muted">রিভিউ হয়ে গেছে</span>;
    }

    const review = (next: 'approved' | 'rejected') => {
        if (next === 'rejected' && note.trim() === '') {
            setErr('বাতিলের কারণ লিখুন');
            return;
        }
        setErr('');
        setBusy(true);
        router.patch(url, { state: next, admin_note: note || null }, {
            preserveScroll: true,
            onFinish: () => setBusy(false),
        });
    };

    return (
        <div className="adm__acts">
            <input
                className="adm__cell-in"
                style={{ minWidth: 120 }}
                placeholder="নোট"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={busy}
            />
            <button className="adm__btn adm__btn--ok" type="button" disabled={busy} onClick={() => review('approved')}>
                অনুমোদন
            </button>
            <button className="adm__btn adm__btn--no" type="button" disabled={busy} onClick={() => review('rejected')}>
                বাতিল
            </button>
            {err && <div className="adm__err">{err}</div>}
        </div>
    );
}
