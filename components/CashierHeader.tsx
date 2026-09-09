'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

/** The cashier's own bar: a flat teal band with a centred gold title, a bare
    chevron on the left and the records clipboard on the right. It is not
    `PageHeader` — that one is the lobby's furniture, left-aligned with a
    pill for its action, and the cashier reads as its own place. */
export default function CashierHeader({
  title,
  historyHref,
  direction,
}: {
  title: string;
  historyHref: string;
  /** which way the arrow on the clipboard points: money in, or money out */
  direction: 'in' | 'out';
}) {
  const router = useRouter();

  return (
    <header className="ck-hd">
      <button type="button" className="ck-hd__back" aria-label="পিছনে" onClick={() => router.back()}>
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" aria-hidden>
          <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <h1 className="ck-hd__title">{title}</h1>
      <Link href={historyHref} className="ck-hd__rec" aria-label="রেকর্ড">
        <RecordIcon direction={direction} />
      </Link>
    </header>
  );
}

/** A clipboard whose badge arrow points in for deposit and out for withdraw —
    the same pair the reference uses to tell its two record lists apart. */
function RecordIcon({ direction }: { direction: 'in' | 'out' }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden>
      <path
        d="M8.5 3.5h-2A1.5 1.5 0 0 0 5 5v14a1.5 1.5 0 0 0 1.5 1.5h5"
        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
      />
      <path
        d="M15.5 3.5h2A1.5 1.5 0 0 1 19 5v6"
        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
      />
      <rect x="8.2" y="2" width="7.6" height="3.4" rx="1.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 9h8M8 12.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="17" cy="16.5" r="4.5" stroke="currentColor" strokeWidth="1.7" />
      {direction === 'in' ? (
        <path d="M17 18.8v-4.6M15.1 16l1.9-1.9 1.9 1.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M17 14.2v4.6M15.1 17l1.9 1.9 1.9-1.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}
