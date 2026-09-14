import { AuthProvider } from './AuthProvider';
import BottomNav from './BottomNav';
import Drawer from './Drawer';
import PasswordResetGate from './PasswordResetGate';
import SideFabs from './SideFabs';
import SpinWheel from './SpinWheel';
import { UIProvider } from './UIProvider';

/** Phone-width column plus the chrome every player-facing page shares. */
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <UIProvider>
        <PasswordResetGate />
        <div className="app">
          {children}
          <BottomNav />
        </div>
        <Drawer />
        <SideFabs />
        <SpinWheel />
      </UIProvider>
    </AuthProvider>
  );
}
