import { Head, Link, useForm } from '@inertiajs/react';
import PageHeader from '../../components/PageHeader';
import Field from '../../components/Field';
import { when } from '../../lib/date';

export default function Security({ lastLoginAt }: { lastLoginAt: string | null }) {
    const { data, setData, patch, processing, errors, reset } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        patch('/security/password', {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    return (
        <>
            <Head title="সিকিউরিটি সেন্টার" />
            <PageHeader title="সিকিউরিটি সেন্টার" />

            <form style={{ margin: 12 }} onSubmit={submit} noValidate>
                <h2 className="sec__h">পাসওয়ার্ড পরিবর্তন</h2>

                <Field label="বর্তমান পাসওয়ার্ড" error={errors.current_password}>
                    <input
                        type="password" autoComplete="current-password" placeholder="••••••••"
                        value={data.current_password}
                        onChange={(e) => setData('current_password', e.target.value)}
                        disabled={processing}
                    />
                </Field>

                <Field label="নতুন পাসওয়ার্ড" error={errors.password}>
                    <input
                        type="password" autoComplete="new-password" placeholder="••••••••"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        disabled={processing}
                    />
                </Field>

                <Field label="নতুন পাসওয়ার্ড আবার লিখুন">
                    <input
                        type="password" autoComplete="new-password" placeholder="••••••••"
                        value={data.password_confirmation}
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        disabled={processing}
                    />
                </Field>

                <button type="submit" className="btn btn--gold btn--block" disabled={processing}>
                    {processing ? 'অপেক্ষা করুন…' : 'পাসওয়ার্ড আপডেট করুন'}
                </button>

                <div className="note">
                    পাসওয়ার্ড বদলালে অন্য সব ডিভাইস থেকে অটোমেটিক লগআউট হয়ে যাবে।
                </div>
            </form>

            <div className="list-card">
                <Link href="/withdraw">
                    <span className="e" aria-hidden>🏦</span>
                    উইথড্র অ্যাকাউন্ট
                    <span className="arrow" aria-hidden>›</span>
                </Link>
                {/* No SMS provider is connected yet, so this states the position
                    rather than linking to a screen that cannot verify anything. */}
                <div className="sec__row">
                    <span className="e" aria-hidden>📱</span>
                    মোবাইল ভেরিফিকেশন
                    <span className="sec__val">যুক্ত হয়নি</span>
                </div>
                <div className="sec__row">
                    <span className="e" aria-hidden>📜</span>
                    সর্বশেষ লগইন
                    <span className="sec__val">{lastLoginAt ? when(lastLoginAt) : '—'}</span>
                </div>
            </div>

            <div className="note" style={{ margin: 12 }}>
                অ্যাকাউন্টের নিরাপত্তার জন্য পাসওয়ার্ড কারো সাথে শেয়ার করবেন না।
            </div>
        </>
    );
}
