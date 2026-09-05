import { Head, Link, useForm } from '@inertiajs/react';
import Field from '../../components/Field';
import PageHeader from '../../components/PageHeader';
import { BRAND } from '../../lib/brand';
import { t } from '../../lib/strings';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        phone: '',
        password: '',
        remember: false,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/login');
    };

    return (
        <>
            <Head title={t.login} />
            <PageHeader title={t.login} />

            <div className="hero">
                <h1>স্বাগতম</h1>
                <p>{BRAND.name} অ্যাকাউন্টে লগইন করুন</p>
            </div>

            <form style={{ margin: 12 }} onSubmit={submit} noValidate>
                <Field label="মোবাইল নাম্বার" error={errors.phone}>
                    <input
                        type="tel" inputMode="numeric" autoComplete="tel" placeholder="01XXXXXXXXX"
                        value={data.phone} onChange={(e) => setData('phone', e.target.value.trim())}
                        disabled={processing}
                    />
                </Field>
                <Field label="পাসওয়ার্ড" error={errors.password}>
                    <input
                        type="password" autoComplete="current-password" placeholder="••••••••"
                        value={data.password} onChange={(e) => setData('password', e.target.value)}
                        disabled={processing}
                    />
                </Field>

                <div style={{ textAlign: 'right', marginBottom: 14 }}>
                    <Link href="/forgot-password" style={{ fontSize: 12, color: 'var(--mint)' }}>
                        পাসওয়ার্ড ভুলে গেছেন?
                    </Link>
                </div>

                <button type="submit" className="btn btn--gold btn--block" disabled={processing}>
                    {processing ? 'অপেক্ষা করুন…' : t.login}
                </button>

                <div className="form-alt">
                    অ্যাকাউন্ট নেই? <Link href="/register"><b>{t.register} করুন</b></Link>
                </div>
            </form>
        </>
    );
}
