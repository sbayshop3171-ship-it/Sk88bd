'use client';

import PageHeader from '@/components/PageHeader';
import { useSiteSettings } from '@/components/useSiteSettings';

export default function SupportPage() {
  const { support } = useSiteSettings();

  // [glyph, label, sub, link] — a blank admin link hides that row
  const channels: [string, string, string, string | null][] = [
    ['💬', 'Live Chat', '24/7 direct support', null],
    ['✉️', 'Email', support.email, support.email ? `mailto:${support.email}` : null],
    ['📱', 'WhatsApp', support.whatsapp, support.whatsapp],
    ['✈️', 'Telegram', support.telegram, support.telegram],
    ['📘', 'Facebook', support.facebook, support.facebook],
  ];

  return (
    <>
      <PageHeader title="Customer Support" />
      <div className="hero">
        <h1>24/7 Support</h1>
        <p>Get in touch with us about anything</p>
      </div>
      <div className="list-card">
        {channels.filter(([, , sub]) => sub).map(([e, label, sub, link]) => {
          const inner = (
            <>
              <span className="e" aria-hidden style={{ fontSize: 17 }}>{e}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{label}</span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>
              </span>
              {link && <span style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 800 }}>Open ›</span>}
            </>
          );
          const style = { display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px', borderBottom: '1px solid rgba(255,255,255,.05)', color: 'inherit' } as const;
          return link
            ? <a key={label} href={link} target={link.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" style={style}>{inner}</a>
            : <div key={label} style={style}>{inner}</div>;
        })}
      </div>
      <div className="note" style={{ margin: 12 }}>
        The support links can be changed from Settings in the admin panel.
      </div>
    </>
  );
}
