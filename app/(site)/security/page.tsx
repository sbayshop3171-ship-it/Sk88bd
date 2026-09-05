import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

const ROWS: [string, string, string][] = [
  ['🔑', 'পাসওয়ার্ড পরিবর্তন', '/forgot-password'],
  ['📱', 'মোবাইল ভেরিফিকেশন', '/my-profile'],
  ['🏦', 'উইথড্র অ্যাকাউন্ট', '/withdraw'],
  ['📜', 'লগইন হিস্টোরি', '/security'],
];

export default function SecurityPage() {
  return (
    <>
      <PageHeader title="সিকিউরিটি সেন্টার" />
      <div className="list-card">
        {ROWS.map(([e, label, href]) => (
          <Link key={label} href={href}>
            <span className="e" aria-hidden>{e}</span>
            {label}
            <span className="arrow" aria-hidden>›</span>
          </Link>
        ))}
      </div>
      <div className="note" style={{ margin: 12 }}>
        অ্যাকাউন্টের নিরাপত্তার জন্য পাসওয়ার্ড কারো সাথে শেয়ার করবেন না।
      </div>
    </>
  );
}
