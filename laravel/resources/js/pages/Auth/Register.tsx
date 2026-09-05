import { Head, Link, useForm } from '@inertiajs/react';
import Field from '../../components/Field';
import PageHeader from '../../components/PageHeader';
import { BRAND } from '../../lib/brand';
import { t } from '../../lib/strings';

export default function Register() {
    const { data, setData, post, processing, errors } = useForm({
        phone: '',
        password: '',
        password_confirmation: '',
        referral_code: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/register');
    };

    return (
        <>
            <Head title={t.register} />
            <PageHeader title={t.register} />

            <div className="hero">
                <h1>৳১৮ সাইন আপ বোনাস</h1>
                <p>রেজিস্টার করে নাম্বার ভেরিফাই করলেই বোনাস পাবেন</p>
            </div>

            <form style={{ margin: 12 }} onSubmit={submit} noValidate>
                <Field label="মোবাইল নাম্বার" error={errors.phone}>
                    <input type="tel" inputMode="numeric" placeholder="01XXXXXXXXX"
                           value={data.phone} onChange={(e) => setData('phone', e.target.value.trim())}
                           disabled={processing} />
                </Field>
                <Field label="পাসওয়ার্ড" error={errors.password}>
                    <input type="password" autoComplete="new-password" placeholder="••••••••"
                           value={data.password} onChange={(e) => setData('password', e.target.value)}
                           disabled={processing} />
                </Field>
                <Field label="পাসওয়ার্ড নিশ্চিত করুন">
                    <input type="password" autoComplete="new-password" placeholder="••••••••"
                           value={data.password_confirmation}
                           onChange={(e) => setData('password_confirmation', e.target.value)}
                           disabled={processing} />
                </Field>
                <Field label="রেফারেল কোড (ঐচ্ছিক)" error={errors.referral_code}>
                    <input type="text" placeholder={`${BRAND.name.toUpperCase()}XX`}
                           value={data.referral_code}
                           onChange={(e) => setData('referral_code', e.target.value.trim().toUpperCase())}
                           disabled={processing} />
                </Field>

                <button type="submit" className="btn btn--gold btn--block" disabled={processing}>
                    {processing ? 'অপেক্ষা করুন…' : t.registerNow}
                </button>

                <div className="form-alt">
                    আগে থেকেই অ্যাকাউন্ট আছে? <Link href="/login"><b>{t.login}</b></Link>
                </div>

                <div className="note">
                    রেজিস্টার করে আপনি নিশ্চিত করছেন যে আপনার বয়স ১৮ বছরের বেশি।
                </div>
            </form>
        </>
    );
}
