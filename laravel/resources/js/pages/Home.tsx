import { Head, Link } from '@inertiajs/react';
import AnnouncementModal from '../components/AnnouncementModal';
import Carousel from '../components/Carousel';
import CategoryTabs from '../components/CategoryTabs';
import DownloadStrip from '../components/DownloadStrip';
import FeaturedGame from '../components/FeaturedGame';
import Footer from '../components/Footer';
import GameSection from '../components/GameSection';
import Header from '../components/Header';
import Jackpot from '../components/Jackpot';
import Winners from '../components/Winners';
import { DepositIcon, SpeakerIcon, WithdrawIcon } from '../components/Icons';
import { HOME_SECTIONS } from '../lib/catalogue';
import { t } from '../lib/strings';
import type { Banner, CategoryKey, Game } from '../types';

export default function Home({
    sections,
    slides,
    announcements,
    featured,
    providers,
}: {
    sections: Record<CategoryKey, Game[]>;
    slides: Banner[];
    announcements: Banner[];
    featured: Game | null;
    providers: string[];
}) {
    return (
        <>
            <Head title="অনলাইন ক্যাসিনো ও ক্রিকেট এক্সচেঞ্জ" />

            <DownloadStrip />
            <Header />

            <div className="notice">
                <i className="notice__ico"><SpeakerIcon /></i>
                <div className="notice__track"><span>{t.welcome}</span></div>
            </div>

            <Carousel slides={slides} />

            <div className="wallet-bar">
                <Link href="/deposit"><DepositIcon />{t.deposit}</Link>
                <Link href="/withdraw"><WithdrawIcon />{t.withdraw}</Link>
            </div>

            <Jackpot />
            <FeaturedGame game={featured} />
            <CategoryTabs />

            {HOME_SECTIONS.map((key) => (
                <GameSection key={key} category={key} games={sections[key] ?? []} />
            ))}

            <Winners />

            <section className="sec">
                <div className="sec__hd"><h2 className="sec__title">{t.ourPartners}</h2></div>
                <div className="scroll-x">
                    <div className="provs">
                        {providers.map((p) => <span className="prov" key={p}>{p}</span>)}
                    </div>
                </div>
            </section>

            <Footer />
            <AnnouncementModal slides={announcements} />
        </>
    );
}
