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
export const FlameIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);
export const HeartIcon = ({ filled, ...p }: P & { filled?: boolean }) => (
  <svg {...base} fill={filled ? 'currentColor' : 'none'} {...p}>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z" />
  </svg>
);

/* --- member centre ---------------------------------------------------- */
export const CopyIcon = (p: P) => (
  <svg {...base} {...p}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></svg>
);
export const PencilIcon = (p: P) => (
  <svg {...base} {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
);
export const RefreshIcon = (p: P) => (
  <svg {...base} {...p}><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></svg>
);
export const BankIcon = (p: P) => (
  <svg {...base} {...p}><path d="M3 10 12 4l9 6" /><path d="M5 10v8M10 10v8M14 10v8M19 10v8" /><path d="M3 20h18" /></svg>
);
export const RecordIcon = (p: P) => (
  <svg {...base} {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
);
export const TrendIcon = (p: P) => (
  <svg {...base} {...p}><path d="M3 17l6-6 4 4 7-7" /><path d="M14 8h6v6" /></svg>
);
export const LedgerIcon = (p: P) => (
  <svg {...base} {...p}><path d="M6 3h10l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M15 3v5h5" /><path d="M9 13h6M9 17h4" /></svg>
);
export const ShieldIcon = (p: P) => (
  <svg {...base} {...p}><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6z" /><path d="m9 12 2 2 4-4" /></svg>
);
export const TargetIcon = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" fill="currentColor" /></svg>
);
export const RebateIcon = (p: P) => (
  <svg {...base} {...p}><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" /><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></svg>
);
export const DownloadIcon = (p: P) => (
  <svg {...base} {...p}><path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M4 20h16" /></svg>
);
export const LogoutIcon = (p: P) => (
  <svg {...base} {...p}><path d="M15 3h4a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-4" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /></svg>
);
/** the @ in a ring the reference uses for its internal mailbox */
export const MailIcon = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="4" /><path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1" /></svg>
);
/** a speech bubble with a star: the complaint / suggestion form */
export const SuggestIcon = (p: P) => (
  <svg {...base} {...p}><path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z" /><path d="m12.5 8 .9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2L9.6 10.2l2-.3z" /></svg>
);

/* ------------------------------------------------------------------
   Member screens — the Security Center's row art and the field marks
   on My Account and the two password forms.

   The reference draws the five Security Center icons as one outline
   stroked with a cyan-to-purple gradient, so these take no colour of
   their own: they paint with `url(#mi-grad)`, and MemberIconDefs has
   to be on the page once for that to resolve.
   ------------------------------------------------------------------ */

const line = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'url(#mi-grad)',
  strokeWidth: 1.3,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/** The gradient every member-screen icon strokes with. Render once per page. */
export const MemberIconDefs = () => (
  <svg width="0" height="0" aria-hidden style={{ position: 'absolute' }}>
    <defs>
      {/* userSpaceOnUse, not the default objectBoundingBox: a straight
          vertical stroke — the power bar, the lock's keyhole tail — has a
          zero-width box, and a bounding-box gradient cannot resolve on one,
          so those paths silently do not paint at all. */}
      <linearGradient id="mi-grad" gradientUnits="userSpaceOnUse" x1="12" y1="2" x2="12" y2="22">
        <stop offset="0%" stopColor="#43c6f0" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>
    </defs>
  </svg>
);

export const PersonLineIcon = (p: P) => (
  <svg {...line} {...p}><circle cx="12" cy="7.5" r="4.2" /><path d="M4.6 20a7.4 7.4 0 0 1 14.8 0z" /></svg>
);
export const EWalletLineIcon = (p: P) => (
  <svg {...line} {...p}>
    <rect x="3" y="6.6" width="18" height="13.4" rx="2.6" />
    <path d="M6.2 6.6V5.4a1.4 1.4 0 0 1 1.4-1.4h9.2" />
    <path d="M14.4 11.4a2.4 2.4 0 1 0 0 4.4M12 13.6h4.4" />
    <circle cx="19" cy="13.6" r="1.1" />
  </svg>
);
export const PadlockLineIcon = (p: P) => (
  <svg {...line} {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.2" />
    <path d="M7.8 10.5V7.8a4.2 4.2 0 0 1 8.4 0v2.7" />
    <circle cx="12" cy="14.6" r="1.4" /><path d="M12 16v1.8" />
  </svg>
);
/** a strongbox with a dial — the reference's mark for the fund password */
export const VaultLineIcon = (p: P) => (
  <svg {...line} {...p}>
    <rect x="3.4" y="5" width="17.2" height="14" rx="2.4" />
    <circle cx="12" cy="12" r="3.4" /><path d="M12 8.6V7M12 17v-1.6" />
    <path d="M6.4 19v1.6M17.6 19v1.6" />
  </svg>
);
export const PowerLineIcon = (p: P) => (
  <svg {...line} {...p}><path d="M12 3.6v8" /><path d="M17.5 6.6a7.6 7.6 0 1 1-11 0" /></svg>
);

/* ---- the small grey marks in front of a field ---- */
const mark = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const IdCardIcon = (p: P) => (
  <svg {...mark} {...p}>
    <rect x="2.5" y="5" width="19" height="14" rx="2.2" />
    <circle cx="8.2" cy="11" r="2" /><path d="M5 16.2a3.4 3.4 0 0 1 6.4 0" />
    <path d="M14.5 10h4M14.5 13.4h4" />
  </svg>
);
export const NickIcon = (p: P) => (
  <svg {...mark} {...p}>
    <circle cx="10" cy="7.6" r="3.4" /><path d="M3.6 19.4a6.4 6.4 0 0 1 9.8-5.4" />
    <path d="M20.6 12.2 15 17.8l-2.6.7.7-2.6 5.6-5.6a1.35 1.35 0 0 1 1.9 1.9z" />
  </svg>
);
export const EnvelopeIcon = (p: P) => (
  <svg {...mark} {...p}><rect x="2.5" y="5.5" width="19" height="13" rx="2.2" /><path d="m3.4 7.2 8.6 6 8.6-6" /></svg>
);
export const PhoneLineIcon = (p: P) => (
  <svg {...mark} {...p}><rect x="6.5" y="2.5" width="11" height="19" rx="2.4" /><path d="M11 18.6h2" /></svg>
);
export const CardLineIcon = (p: P) => (
  <svg {...mark} {...p}><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M2.5 10h19" strokeWidth={2.6} /></svg>
);
export const LockMarkIcon = (p: P) => (
  <svg {...mark} {...p}><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" /><circle cx="12" cy="15" r="1.2" /></svg>
);
export const LockPlusIcon = (p: P) => (
  <svg {...mark} {...p}>
    <path d="M5 20v-7.5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2V14" />
    <path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" />
    <path d="M5 20h9" /><circle cx="18.4" cy="18" r="3.4" /><path d="M18.4 16.4v3.2M16.8 18h3.2" />
  </svg>
);
export const CardCheckIcon = (p: P) => (
  <svg {...mark} {...p}>
    <rect x="2.5" y="6" width="15" height="10.5" rx="2" />
    <path d="M2.5 9.6h15" /><path d="M5.6 13h3" />
    <circle cx="18.4" cy="17.4" r="3.6" /><path d="m16.8 17.4 1.2 1.2 2.2-2.4" />
  </svg>
);
/** the heavy slashed eye the reference puts at the end of a password field */
export const EyeOffIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.8 11.8 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78 3.15 3.15.02-.16c0-1.66-1.34-3-3-3z" />
  </svg>
);
export const EyeOnIcon = (p: P) => (
  <svg {...mark} {...p}><path d="M3 12s3.6-6.2 9-6.2S21 12 21 12s-3.6 6.2-9 6.2S3 12 3 12z" /><circle cx="12" cy="12" r="3" /></svg>
);
/** the small pencil the reference puts after an editable row's title */
export const EditMarkIcon = (p: P) => (
  <svg {...mark} strokeWidth={1.5} {...p}>
    <path d="M18.6 4.6a1.9 1.9 0 0 1 2.7 2.7L9.6 19H6.9v-2.7z" /><path d="M5 21.4h14" />
  </svg>
);
export const ChevronRightIcon = (p: P) => (
  <svg {...mark} strokeWidth={1.9} {...p}><path d="m9 5 7 7-7 7" /></svg>
);
/** the reference's row chevron: tall and thin, 11 by 19 */
export const ChevronThinIcon = (p: P) => (
  <svg viewBox="0 0 11 19" fill="none" stroke="currentColor" strokeWidth={1.4}
       strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
    <path d="M1.2 1.2 9.8 9.5l-8.6 8.3" />
  </svg>
);
/** the Facebook mark in a rounded box, as the reference draws it */
export const FacebookBoxIcon = (p: P) => (
  <svg {...mark} {...p}>
    <rect x="3" y="3" width="18" height="18" rx="3.4" />
    <path d="M15.4 7.6h-1.6a2.3 2.3 0 0 0-2.3 2.3V21M9.4 13h5.4" />
  </svg>
);
export const WhatsAppLineIcon = (p: P) => (
  <svg {...mark} {...p}>
    <path d="M12 3.2a8.8 8.8 0 0 0-7.6 13.2L3.2 20.8l4.5-1.2A8.8 8.8 0 1 0 12 3.2z" />
    <path d="M9.1 8.2c.3-.3.7-.3.9 0l.9 1.6c.1.3 0 .6-.2.8l-.5.5c.6 1.3 1.6 2.3 2.9 2.9l.5-.5c.2-.2.5-.3.8-.2l1.6.9c.3.2.3.6 0 .9l-.6.7c-.5.5-1.3.6-2 .3-2.2-1-3.9-2.7-4.9-4.9-.3-.7-.2-1.5.3-2z" />
  </svg>
);

/* ---- the filled grey marks on the two password screens ---- */
const fill = { viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true };

export const LockFillIcon = (p: P) => (
  <svg {...fill} {...p}>
    <path d="M12 2.2a5 5 0 0 0-5 5v2.6H6.2a1.9 1.9 0 0 0-1.9 1.9v8.4c0 1 .9 1.9 1.9 1.9h11.6c1 0 1.9-.9 1.9-1.9v-8.4c0-1-.9-1.9-1.9-1.9H17V7.2a5 5 0 0 0-5-5zm0 1.9a3.1 3.1 0 0 1 3.1 3.1v2.6H8.9V7.2A3.1 3.1 0 0 1 12 4.1zm0 9.4a1.6 1.6 0 0 1 .8 3v1.9h-1.6v-1.9a1.6 1.6 0 0 1 .8-3z" />
  </svg>
);
export const LockPlusFillIcon = (p: P) => (
  <svg {...fill} {...p}>
    <path d="M10.4 2.6a4.5 4.5 0 0 0-4.5 4.5v2.3h-.8A1.7 1.7 0 0 0 3.4 11v7.6c0 .9.8 1.7 1.7 1.7h8.2a6 6 0 0 1 3.3-7.7V11c0-.9-.8-1.7-1.7-1.7h-.8V7.1a4.5 4.5 0 0 0-3.7-4.5zm0 1.8a2.7 2.7 0 0 1 2.7 2.7v2.3H7.7V7.1a2.7 2.7 0 0 1 2.7-2.7z" />
    <circle cx="18.2" cy="17.9" r="4.4" />
    <path d="M18.2 15.7v4.4M16 17.9h4.4" stroke="#efefef" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
export const CardCheckFillIcon = (p: P) => (
  <svg {...fill} {...p}>
    <path d="M3.6 5.2A1.8 1.8 0 0 0 1.8 7v8.6c0 1 .8 1.8 1.8 1.8h9.6a6 6 0 0 1 8.6-6.9V7a1.8 1.8 0 0 0-1.8-1.8zm2.2 3.9a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6zm4 0a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6zm4 0a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6z" />
    <circle cx="18.2" cy="17.4" r="4.4" />
    <path d="m16.2 17.5 1.4 1.4 2.6-2.8" fill="none" stroke="#efefef" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ---- the Security Center's small marks ---- */
export const BadgeOkIcon = (p: P) => (
  <svg viewBox="0 0 18 18" aria-hidden {...p}>
    <circle cx="9" cy="9" r="9" fill="#25c85b" />
    <path d="m5 9.3 2.7 2.7L13 6.6" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const BadgeTodoIcon = (p: P) => (
  <svg viewBox="0 0 18 18" aria-hidden {...p}>
    <circle cx="9" cy="9" r="9" fill="#f4231d" />
    <path d="M9 4.4v6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="9" cy="13.3" r="1.25" fill="#fff" />
  </svg>
);
export const BoltIcon = (p: P) => (
  <svg viewBox="0 0 13 17" aria-hidden {...p}><path d="M8.6 0 1 9.6h4.6L3.8 17 12 6.8H7.2z" /></svg>
);
export const PlusThinIcon = (p: P) => (
  <svg viewBox="0 0 17 17" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden {...p}>
    <path d="M8.5 1v15M1 8.5h15" />
  </svg>
);
export const CloseThinIcon = (p: P) => (
  <svg viewBox="0 0 17 17" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden {...p}>
    <path d="m2 2 13 13M15 2 2 15" />
  </svg>
);
