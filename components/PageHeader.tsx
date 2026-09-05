'use client';

import { useRouter } from 'next/navigation';
import { LeftIcon } from './Icons';

/** Sticky back-bar used by every sub-page. `action` renders on the right. */
export default function PageHeader({
  title,
  action,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <header className="page-hd">
      <button className="icon-btn" type="button" aria-label="পিছনে" onClick={() => router.back()}>
        <LeftIcon />
      </button>
      <h1>{title}</h1>
      {action}
    </header>
  );
}
