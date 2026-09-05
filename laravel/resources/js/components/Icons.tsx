/* Inline SVG icon set — no icon-font dependency, inherits currentColor. */

type P = { className?: string };
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const MenuIcon = (p: P) => (
  <svg {...base} strokeWidth={2.2} {...p}><path d="M4 7h16M4 12h12M4 17h16" /></svg>
);
export const HomeIcon = (p: P) => (
  <svg {...base} {...p}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>
);
export const GiftIcon = (p: P) => (
  <svg {...base} {...p}><path d="M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7S11 3 8.5 3 6 7 12 7zM12 7s1-4 3.5-4S18 7 12 7z" /></svg>
);
export const UsersIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
export const MedalIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="15" r="6" />
    <path d="M8.2 9.6 6 2h12l-2.2 7.6M12 13l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2L9 15.2l2-.3z" />
  </svg>
);
export const UserIcon = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></svg>
);
export const ChatIcon = (p: P) => (
  <svg {...base} {...p}><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z" /></svg>
);
export const UpIcon = (p: P) => (
  <svg {...base} strokeWidth={2.4} {...p}><path d="m6 15 6-6 6 6" /></svg>
);
export const LeftIcon = (p: P) => (
  <svg {...base} strokeWidth={2.4} {...p}><path d="m15 6-6 6 6 6" /></svg>
);
export const RightIcon = (p: P) => (
  <svg {...base} strokeWidth={2.4} {...p}><path d="m9 6 6 6-6 6" /></svg>
);
export const SpeakerIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M3 9v6h4l5 4V5L7 9zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4m-2.5-8v2a6.5 6.5 0 0 1 0 12v2a8.5 8.5 0 0 0 0-16" />
  </svg>
);
export const DepositIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="2" y="6" width="20" height="13" rx="2" /><path d="M2 10h20M12 19v-6M9.5 15.5 12 13l2.5 2.5" />
  </svg>
);
export const WithdrawIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="2" y="6" width="20" height="13" rx="2" /><path d="M2 10h20M12 12v6M9.5 15.5 12 18l2.5-2.5" />
  </svg>
);
export const WhatsAppIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2m0 2a8 8 0 0 1 0 16 8 8 0 0 1-4.1-1.1l-.3-.2-2.5.7.7-2.4-.2-.3A8 8 0 0 1 12 4m-2.7 4c-.2 0-.5.1-.7.3-.3.3-.9.9-.9 2s.9 2.3 1 2.5c.1.2 1.7 2.8 4.3 3.8 2.1.8 2.5.7 3 .6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.6-.3-1.5-.7c-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.1-.2 0-.4.1-.5l.4-.5.3-.5v-.4l-.7-1.6c-.2-.4-.4-.4-.6-.4z" />
  </svg>
);
export const FacebookIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M14 9V7.5c0-.7.3-1 1.1-1H17V3.5h-2.6C11.6 3.5 11 5.2 11 7.2V9H9v3h2v9h3v-9h2.3l.4-3z" />
  </svg>
);
export const TelegramIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M21.5 4.2 3.4 11.1c-.9.3-.9 1.5 0 1.8l4.4 1.5 1.7 5.2c.2.7 1.1.9 1.6.3l2.4-2.5 4.4 3.3c.6.4 1.4.1 1.6-.6l3-14.5c.2-.8-.6-1.5-1.4-1.2M9.6 14.1l8.3-5.6-6.7 6.6-.3 3z" />
  </svg>
);
