import type { ReactNode } from 'react';
import BottomNav from '../components/BottomNav';
import Drawer from '../components/Drawer';
import SideFabs from '../components/SideFabs';
import { UIProvider } from '../providers/UIProvider';

/** Phone-width column plus the chrome every player-facing page shares. */
export default function SiteLayout({ children }: { children: ReactNode }) {
    return (
        <UIProvider>
            <div className="app">
                {children}
                <BottomNav />
            </div>
            <Drawer />
            <SideFabs />
        </UIProvider>
    );
}
