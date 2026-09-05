import { Head, useForm } from '@inertiajs/react';
import Field from '../../components/Field';
import PageHeader from '../../components/PageHeader';

export default function ForgotPassword() {
    const { data, setData, post, processing, errors } = useForm({ phone: '' });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/forgot-password');
    };

    return (
        <>
            <Head title="পাসওয়ার্ড রিসেট" />
            <PageHeader title="পাসওয়ার্ড রিসেট" />

            <div className="hero">
                <h1>পাসওয়ার্ড ভুলে গেছেন?</h1>
                <p>রেজিস্টার করা মোবাইল নাম্বারে OTP পাঠানো হবে</p>
            </div>

            <form style={{ margin: 12 }} onSubmit={submit} noValidate>
                <Field label="মোবাইল নাম্বার" error={errors.phone}>
                    <input type="tel" inputMode="numeric" placeholder="01XXXXXXXXX"
                           value={data.phone} onChange={(e) => setData('phone', e.target.value.trim())}
                           disabled={processing} />
                </Field>
                <button type="submit" className="btn btn--gold btn--block" disabled={processing}>
                    OTP পাঠান
                </button>
            </form>
        </>
    );
}
