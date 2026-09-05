import { BRAND } from '../lib/brand';
import { PAYMENT_METHODS } from '../lib/catalogue';
import { t } from '../lib/strings';

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
                {BRAND.name} — ক্লায়েন্ট প্রিভিউ বিল্ড। গেম প্রোভাইডার ও পেমেন্ট গেটওয়ে
                এখনো যুক্ত হয়নি; ডিপোজিট ও উইথড্র অ্যাডমিন প্যানেল থেকে ম্যানুয়ালি
                অনুমোদন হয়।
                {' '}{t.ageNote}
            </p>
            <div className="ftr__age">18+</div>
        </footer>
    );
}
