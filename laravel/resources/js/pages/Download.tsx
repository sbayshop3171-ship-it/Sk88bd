import { Head } from '@inertiajs/react';
import PageHeader from '../components/PageHeader';
import { BRAND } from '../lib/brand';

export default function Download({ links }: { links: { android: string | null; ios: string | null } }) {
    return (
        <>
            <Head title="অ্যাপ ডাউনলোড" />
            <PageHeader title="অ্যাপ ডাউনলোড" />
            <div className="hero">
                <h1>{BRAND.name} অ্যাপ</h1>
                <p>অ্যাপ ডাউনলোড করলেই ৳১৮ বোনাস</p>
            </div>
            <div className="wallet-bar">
                {links.android
                    ? <a className="btn btn--gold" style={{ padding: 12 }} href={links.android}>Android APK</a>
                    : <span className="btn btn--gold" style={{ padding: 12, opacity: .55 }}>Android APK</span>}
                {links.ios
                    ? <a className="btn btn--ghost" style={{ padding: 12 }} href={links.ios}>iOS</a>
                    : <span className="btn btn--ghost" style={{ padding: 12, opacity: .55 }}>iOS</span>}
            </div>
            {!links.android && !links.ios && (
                <div className="note" style={{ margin: 12 }}>
                    APK বিল্ড তৈরি হলে অ্যাডমিন প্যানেল থেকে লিংক বসানো যাবে।
                </div>
            )}
        </>
    );
}
