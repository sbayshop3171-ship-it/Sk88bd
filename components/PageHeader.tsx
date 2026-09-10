'use client';

import { useRouter } from 'next/navigation';
import { LeftIcon } from './Icons';

/** Sticky back-bar used by every sub-page. `action` renders on the right.
    `onBack` replaces the history step for a page whose inner view is state,
    not a route — there the arrow has to close the view, and a fresh tab has
    no history for `router.back()` to use anyway. */
export default function PageHeader({
  title,
  action,
  onBack,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  onBack?: () => void;
}) {
  const router = useRouter();

  return (
    <header className="page-hd">
      <button className="icon-btn" type="button" aria-label="Back" onClick={() => (onBack ? onBack() : router.back())}>
        <LeftIcon />
      </button>
      <h1>{title}</h1>
      {action}
    </header>
  );
}
