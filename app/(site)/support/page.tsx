import PageHeader from '@/components/PageHeader';
import { BRAND } from '@/lib/brand';

const CHANNELS: [string, string, string][] = [
  ['💬', 'লাইভ চ্যাট', '২৪/৭ সরাসরি সাপোর্ট'],
  ['✉️', 'ইমেইল', BRAND.email],
  ['📱', 'WhatsApp', BRAND.social.whatsapp],
  ['✈️', 'Telegram', BRAND.social.telegram],
  ['📘', 'Facebook', BRAND.social.facebook],
];

export default function SupportPage() {
  return (
    <>
      <PageHeader title="কাস্টমার সাপোর্ট" />
      <div className="hero">
        <h1>২৪/৭ সাপোর্ট</h1>
        <p>যেকোনো সমস্যায় আমাদের সাথে যোগাযোগ করুন</p>
      </div>
      <div className="list-card">
        {CHANNELS.map(([e, label, sub]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
            <span className="e" aria-hidden style={{ fontSize: 17 }}>{e}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{label}</span>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="note" style={{ margin: 12 }}>
        সাপোর্ট নাম্বার ও চ্যাট উইজেট অ্যাডমিন প্যানেল থেকে সেট করা যাবে।
      </div>
    </>
  );
}
