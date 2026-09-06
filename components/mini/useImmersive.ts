'use client';

import { useEffect } from 'react';

/** While one of the house's games is open the site chrome (bottom nav,
    floating buttons) steps out of the way, the same way Aviator opens. */
export function useImmersive() {
  useEffect(() => {
    document.body.classList.add('game-immersive');
    return () => document.body.classList.remove('game-immersive');
  }, []);
}
