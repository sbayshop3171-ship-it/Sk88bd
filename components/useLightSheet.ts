'use client';

import { useEffect } from 'react';

/** The member area and the cashier are the site's white screens.

    The lobby is dark; deposit, withdraw and everything behind My Account
    are not — that is the sheet players arrive from other books expecting,
    and it is what makes a record or a receipt readable. The palette is a
    body class (`cz-light` in globals.css) rather than a per-page stylesheet,
    so it flips the shared furniture too, and it is held only while the page
    is mounted so the lobby stays dark. */
export function useLightSheet() {
  useEffect(() => {
    document.body.classList.add('cz-light');
    return () => document.body.classList.remove('cz-light');
  }, []);
}
