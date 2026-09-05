import { Head, Link, router, useForm } from '@inertiajs/react';
import DataTable from '../../components/admin/DataTable';
import AdminLayout from '../../layouts/AdminLayout';
import { taka } from '../../lib/brand';
import { refLabel, when } from '../../lib/date';

interface Player {
    id: number;
    phone: string;
    display_name: string | null;
    role: string;
    vip_level: number;
    is_blocked: boolean;
    referral_code: string;
    referred_by: string | null;
    created_at: string | null;
    last_login_at: string | null;
}

interface Cashier {
    id: number;
    amount: number;
    state: string;
    txn_id?: string | null;
    account_no?: string | null;
    admin_note: string | null;
    created_at: string;
    channel: { id: string; name: string } | null;
}

interface Txn {
    id: number;
    kind: string;
    amount: number;
    balance_after: number;
    ref: string | null;
    created_at: string;
}

interface RoundRow {
    game: string;
    round_id: number;
    cost: number;
    payout: number;
    detail: string | number;
    created_at: string;
}

interface Referral {
    id: number;
    phone: string;
    created_at: string;
    last_login_at: string | null;
    transactions_count: number;
}

interface Action {
    id: number;
    action: string;
    amount: number | null;
    note: string | null;
    created_at: string;
    admin: { phone: string; display_name: string | null } | null;
}

const STATE_LABEL: Record<string, string> = {
    pending: 'অপেক্ষমাণ',
    approved: 'অনুমোদিত',
    rejected: 'বাতিল',
};

/**
 * Hand a player money, either as cash or as a bonus they have to play through.
 *
 * The two are kept apart on purpose: an adjustment is withdrawable the moment
 * it lands, a bonus is not until its turnover is cleared. Putting them in one
 * form with a checkbox is how the wrong one gets used at two in the morning.
 */
function GrantBonus({ userId }: { userId: number }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        amount: '',
        turnover_multiplier: 10,
        note: '',
    });

    return (
        <form
            className="adm__form"
            onSubmit={(e) => {
                e.preventDefault();
                post(`/admin/users/${userId}/bonus`, { preserveScroll: true, onSuccess: () => reset() });
            }}
        >
            <label>বোনাস (৳)
                <input type="number" step="0.01" value={data.amount}
                       onChange={(e) => setData('amount', e.target.value)} placeholder="100" />
                {errors.amount && <span className="adm__err">{errors.amount}</span>}
            </label>
            <label>টার্নওভার গুণক
                <input type="number" value={data.turnover_multiplier}
                       onChange={(e) => setData('turnover_multiplier', Number(e.target.value))} />
                {errors.turnover_multiplier && <span className="adm__err">{errors.turnover_multiplier}</span>}
            </label>
            <label>কারণ
                <input value={data.note} onChange={(e) => setData('note', e.target.value)}
                       placeholder="ঈদ অফার" />
                {errors.note && <span className="adm__err">{errors.note}</span>}
            </label>
            <button className="adm__btn adm__btn--go" type="submit" disabled={processing}>বোনাস দিন</button>
        </form>
    );
}

/** Cash in or out of the wallet, with no turnover attached. */
function Adjust({ userId }: { userId: number }) {
    const { data, setData, post, processing, errors, reset } = useForm({ amount: '', note: '' });

    return (
        <form
            className="adm__form"
            onSubmit={(e) => {
                e.preventDefault();
                post(`/admin/users/${userId}/adjust`, { preserveScroll: true, onSuccess: () => reset() });
            }}
        >
            <label>পরিমাণ (৳, ঋণাত্মক দিলে কাটা যাবে)
                <input type="number" step="0.01" value={data.amount}
                       onChange={(e) => setData('amount', e.target.value)} placeholder="-500" />
                {errors.amount && <span className="adm__err">{errors.amount}</span>}
            </label>
            <label>কারণ
                <input value={data.note} onChange={(e) => setData('note', e.target.value)}
                       placeholder="ভুল ডিপোজিট ফেরত" />
                {errors.note && <span className="adm__err">{errors.note}</span>}
            </label>
            <button className="adm__btn adm__btn--go" type="submit" disabled={processing}>অ্যাডজাস্ট</button>
        </form>
    );
}

export default function UserDetail({
    player,
    wallet,
    totals,
    deposits,
    withdrawals,
    transactions,
    rounds,
    referrals,
    actions,
    games,
}: {
    player: Player;
    wallet: { balance: number; bonus_balance: number; turnover_need: number; turnover_done: number };
    totals: Record<string, number>;
    deposits: Cashier[];
    withdrawals: Cashier[];
    transactions: Txn[];
    rounds: RoundRow[];
    referrals: Referral[];
    actions: Action[];
    games: Record<string, string>;
}) {
    const turnoverLeft = Math.max(0, wallet.turnover_need - wallet.turnover_done);

    return (
        <>
            <Head title={`অ্যাডমিন — ${player.phone}`} />

            <h1 className="adm__h1">
                {player.display_name ?? player.phone}{' '}
                {player.is_blocked && <span className="adm__miss">ব্লকড</span>}
            </h1>
            <p className="adm__sub">
                <Link href="/admin/users">← সব ইউজার</Link> · {player.phone} · রেফার কোড{' '}
                <code>{player.referral_code}</code>
                {player.referred_by && <> · রেফার করেছে {player.referred_by}</>}
                {' '}· যোগ দিয়েছে {when(player.created_at)} · শেষ লগইন {when(player.last_login_at)}
            </p>

            <div className="adm__tiles">
                <div className="adm__tile"><b>{taka(wallet.balance)}</b><small>ব্যালেন্স</small></div>
                <div className="adm__tile"><b>{taka(wallet.bonus_balance)}</b><small>বোনাস</small></div>
                <div className="adm__tile"><b>{taka(totals.deposited)}</b><small>মোট ডিপোজিট</small></div>
                <div className="adm__tile"><b>{taka(totals.withdrawn)}</b><small>মোট উইথড্র</small></div>
                <div className="adm__tile"><b>{taka(totals.staked)}</b><small>মোট বেট</small></div>
                <div className="adm__tile"><b>{taka(totals.won)}</b><small>মোট জেতা</small></div>
                <div className="adm__tile"><b>{taka(totals.ggr)}</b><small>সাইটের লাভ</small></div>
                <div className="adm__tile"><b>{taka(totals.bonus)}</b><small>বোনাস দেওয়া</small></div>
            </div>

            {turnoverLeft > 0 && (
                <p className="adm__sub adm__warn">
                    টার্নওভার বাকি {taka(turnoverLeft)} ({taka(wallet.turnover_done)} /{' '}
                    {taka(wallet.turnover_need)}) — এটা শেষ না হলে প্লেয়ার উইথড্র করতে পারবে না।
                </p>
            )}

            <div className="adm__cols">
                <section>
                    <h2 className="adm__h2">ব্যালেন্স অ্যাডজাস্ট</h2>
                    <Adjust userId={player.id} />
                </section>
                <section>
                    <h2 className="adm__h2">বোনাস দিন</h2>
                    <GrantBonus userId={player.id} />
                </section>
            </div>

            <h2 className="adm__h2">অ্যাকাউন্ট</h2>
            <div className="adm__acts" style={{ marginBottom: 14 }}>
                <button
                    className={`adm__btn ${player.is_blocked ? 'adm__btn--ok' : 'adm__btn--no'}`}
                    type="button"
                    onClick={() => router.patch(`/admin/users/${player.id}`, { is_blocked: !player.is_blocked }, { preserveScroll: true })}
                >
                    {player.is_blocked ? 'আনব্লক করুন' : 'ব্লক করুন'}
                </button>
                <select
                    className="adm__cell-in"
                    style={{ width: 110 }}
                    value={player.vip_level}
                    onChange={(e) => router.patch(`/admin/users/${player.id}`, { vip_level: Number(e.target.value) }, { preserveScroll: true })}
                >
                    {[0, 1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>VIP {v}</option>)}
                </select>
            </div>

            <h2 className="adm__h2">ডিপোজিট</h2>
            <DataTable
                columns={['#', 'চ্যানেল', 'পরিমাণ', 'TxnID', 'অবস্থা', 'সময়']}
                rows={deposits.map((d) => [
                    d.id, d.channel?.name ?? '—', taka(d.amount), d.txn_id ?? '—',
                    STATE_LABEL[d.state] ?? d.state, when(d.created_at),
                ])}
                empty="কোনো ডিপোজিট নেই।"
            />

            <h2 className="adm__h2">উইথড্র</h2>
            <DataTable
                columns={['#', 'চ্যানেল', 'পরিমাণ', 'নাম্বার', 'অবস্থা', 'সময়']}
                rows={withdrawals.map((w) => [
                    w.id, w.channel?.name ?? '—', taka(w.amount), w.account_no ?? '—',
                    STATE_LABEL[w.state] ?? w.state, when(w.created_at),
                ])}
                empty="কোনো উইথড্র নেই।"
            />

            <h2 className="adm__h2">শেষ রাউন্ড</h2>
            <DataTable
                columns={['গেম', 'রাউন্ড', 'বেট', 'ফেরত', 'ফল', 'সময়']}
                rows={rounds.map((r) => [
                    games[r.game] ?? r.game,
                    `#${r.round_id}`,
                    taka(r.cost),
                    r.payout > 0 ? taka(r.payout) : '—',
                    `${Number(r.detail).toFixed(2)}x`,
                    when(r.created_at),
                ])}
                empty="এখনো কোনো রাউন্ড খেলেনি।"
            />

            <h2 className="adm__h2">লেজার</h2>
            <DataTable
                columns={['#', 'ধরন', 'পরিমাণ', 'পরে ব্যালেন্স', 'রেফারেন্স', 'সময়']}
                rows={transactions.map((t) => [
                    t.id, t.kind,
                    <span className={t.amount < 0 ? 'adm__miss' : 'adm__ok'}>{taka(t.amount)}</span>,
                    taka(t.balance_after), refLabel(t.ref) ?? '—', when(t.created_at),
                ])}
                empty="কোনো লেনদেন নেই।"
            />

            <h2 className="adm__h2">রেফার করা ({referrals.length})</h2>
            <DataTable
                columns={['ফোন', 'যোগ দিয়েছে', 'শেষ লগইন', 'লেনদেন']}
                rows={referrals.map((r) => [
                    <Link href={`/admin/users/${r.id}`}>{r.phone}</Link>,
                    when(r.created_at), when(r.last_login_at), r.transactions_count,
                ])}
                empty="কাউকে রেফার করেনি।"
            />

            <h2 className="adm__h2">এই ইউজারে অ্যাডমিনের কাজ</h2>
            <DataTable
                columns={['অ্যাকশন', 'অ্যাডমিন', 'পরিমাণ', 'নোট', 'সময়']}
                rows={actions.map((a) => [
                    a.action,
                    a.admin?.display_name ?? a.admin?.phone ?? '—',
                    a.amount === null ? '—' : taka(a.amount),
                    a.note ?? '—',
                    when(a.created_at),
                ])}
                empty="কোনো রেকর্ড নেই।"
            />
        </>
    );
}

UserDetail.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
