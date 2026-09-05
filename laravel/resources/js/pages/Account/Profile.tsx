import { Head } from '@inertiajs/react';
import PageHeader from '../../components/PageHeader';
import type { Profile as ProfileData } from '../../types';

export default function Profile({ profile }: { profile: ProfileData }) {
    const rows: [string, string][] = [
        ['ইউজার আইডি', String(profile.id)],
        ['মোবাইল নাম্বার', profile.phone],
        ['নাম', profile.display_name ?? '—'],
        ['ভিআইপি লেভেল', `VIP ${profile.vip_level}`],
        ['রেফারেল কোড', profile.referral_code],
        ['রেজিস্ট্রেশন তারিখ', profile.created_at ?? '—'],
    ];

    return (
        <>
            <Head title="আমার প্রোফাইল" />
            <PageHeader title="আমার প্রোফাইল" />

            <div className="profile">
                <i className="profile__av" aria-hidden>👤</i>
                <div>
                    <div className="profile__n">{profile.display_name || profile.phone}</div>
                    <div className="profile__id">VIP {profile.vip_level}</div>
                </div>
            </div>

            <div className="list-card">
                {rows.map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', padding: '13px 14px', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                        <span style={{ color: 'var(--muted)' }}>{k}</span>
                        <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{v}</span>
                    </div>
                ))}
            </div>
        </>
    );
}
