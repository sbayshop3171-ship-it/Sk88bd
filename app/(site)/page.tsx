import AnnouncementModal from '@/components/AnnouncementModal';
import Carousel from '@/components/Carousel';
import CategoryTabs from '@/components/CategoryTabs';
import DownloadStrip from '@/components/DownloadStrip';
import FavouriteGames from '@/components/FavouriteGames';
import FeaturedGame from '@/components/FeaturedGame';
import Footer from '@/components/Footer';
import GameSection from '@/components/GameSection';
import Header from '@/components/Header';
import Jackpot from '@/components/Jackpot';
import Winners from '@/components/Winners';
import NoticeBar from '@/components/NoticeBar';
import { HOME_SECTIONS, PROVIDERS, demoGames } from '@/lib/catalogue';
import { t } from '@/lib/strings';
import Link from 'next/link';
import { DepositIcon, WithdrawIcon } from '@/components/Icons';

export default function HomePage() {
  return (
    <>
      <DownloadStrip />
      <Header />

      <NoticeBar />

      <Carousel />

      <div className="wallet-bar">
        <Link href="/deposit"><DepositIcon />{t.deposit}</Link>
        <Link href="/withdraw"><WithdrawIcon />{t.withdraw}</Link>
      </div>

      <Jackpot />
      <FeaturedGame />
      <CategoryTabs />

      {/* Everything a visitor can actually open — provider demos and the
          gameplay previews — floated to the top; the rest sit in their
          categories below with a "coming soon" placeholder. */}
      <GameSection games={demoGames()} title="জনপ্রিয় গেম" />

      {/* only rendered once the visitor has starred a tile */}
      <FavouriteGames />

      {HOME_SECTIONS.map((key) => <GameSection key={key} category={key} />)}

      <Winners />

      <section className="sec">
        <div className="sec__hd"><h2 className="sec__title">{t.ourPartners}</h2></div>
        <div className="scroll-x">
          <div className="provs">
            {PROVIDERS.map((p) => <span className="prov" key={p}>{p}</span>)}
          </div>
        </div>
      </section>

      <Footer />
      <AnnouncementModal />
    </>
  );
}
