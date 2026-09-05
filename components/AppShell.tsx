import { AuthProvider } from './AuthProvider';
import BottomNav from './BottomNav';
import Drawer from './Drawer';
import SideFabs from './SideFabs';
import { UIProvider } from './UIProvider';

/** Phone-width column plus the chrome every player-facing page shares. */
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <UIProvider>
        <div className="app">
          {children}
          <BottomNav />
        </div>
        <Drawer />
        <SideFabs />
      </UIProvider>
    </AuthProvider>
  );
}
