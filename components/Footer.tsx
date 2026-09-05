import { BRAND } from '@/lib/brand';
import { PAYMENT_METHODS } from '@/lib/catalogue';
import { t } from '@/lib/strings';

const GAME_CHIPS = ['স্লট', 'লাইভ ক্যাসিনো', 'পোকার', 'ফিশিং', 'স্পোর্টস', 'ই-স্পোর্টস', 'লটারি'];
const SOCIAL_CHIPS = ['Telegram', 'Facebook', 'WhatsApp', 'YouTube'];

function Group({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div className="ftr__grp">
      <div className="ftr__ttl">{title}</div>
      <div className="ftr__row">
        {items.map((i) => <span className="chip" key={i}>{i}</span>)}
      </div>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="ftr">
      <Group title={t.paymentMethods} items={PAYMENT_METHODS} />
      <Group title={t.gameCenter} items={GAME_CHIPS} />
      <Group title={t.followUs} items={SOCIAL_CHIPS} />
      <div className="ftr__grp">
        <div className="ftr__ttl">যোগাযোগ</div>
        <div className="ftr__row">
          <a className="chip" href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
        </div>
      </div>
      <p className="ftr__legal">
        {BRAND.name} — এই সাইটে এখনো কোনো রিয়েল পেমেন্ট,
        রিয়েল অ্যাকাউন্ট বা রিয়েল গেম যুক্ত নেই; সব সংখ্যা ও নাম নমুনা ডেটা।
        {' '}{t.ageNote}
      </p>
      <div className="ftr__age">18+</div>
    </footer>
  );
}
