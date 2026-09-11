'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useBackLayer } from './useBackLayer';

interface UIState {
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  /** close it because one of its links is taking the player elsewhere */
  leaveDrawer: () => void;
  toast: (msg: string) => void;
}

const Ctx = createContext<UIState | null>(null);

export function useUI() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUI must be used inside <UIProvider>');
  return v;
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(''), 2200);
  }, []);

  // clear the pending timeout if the tree unmounts mid-toast
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // a drawer that stays open behind a route change is disorienting
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);

  // the phone's Back closes the menu rather than leaving the site
  const leave = useBackLayer(drawerOpen, closeDrawer);
  const leaveDrawer = useCallback(() => {
    leave();
    setDrawerOpen(false);
  }, [leave]);

  return (
    <Ctx.Provider value={{ drawerOpen, openDrawer, closeDrawer, leaveDrawer, toast }}>
      {children}
      <div className={`scrim${drawerOpen ? ' on' : ''}`} onClick={closeDrawer} />
      <div className={`toast${msg ? ' on' : ''}`} role="status" aria-live="polite">{msg}</div>
    </Ctx.Provider>
  );
}
