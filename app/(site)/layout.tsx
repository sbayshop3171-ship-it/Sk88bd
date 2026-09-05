import AppShell from '@/components/AppShell';

/** The player-facing shell: phone-width column, bottom nav, drawer, FABs.
    /admin sits outside this group so it gets none of that chrome. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
