/** The pale card-on-a-hill the cashier shows before a wallet is linked. It is
    drawn rather than shipped as an image: at this weight (everything is a
    shade of #f0f1f3) a PNG would band, and the whole thing is 2KB of paths. */
export default function EmptyWalletArt() {
  return (
    <svg className="ck-empty__art" viewBox="0 0 300 200" role="img" aria-label="No wallet added">
      {/* the hill the card stands on */}
      <ellipse cx="150" cy="212" rx="132" ry="52" fill="#f7f8f9" />
      {/* clouds */}
      <g fill="#f1f2f4">
        <circle cx="46" cy="142" r="18" />
        <circle cx="70" cy="148" r="12" />
        <circle cx="252" cy="132" r="19" />
        <circle cx="232" cy="140" r="12" />
      </g>
      {/* the card behind, peeking out at the top */}
      <rect x="60" y="42" width="180" height="104" rx="10" fill="#f3f4f6" />
      {/* the card itself */}
      <rect x="52" y="50" width="180" height="104" rx="10" fill="#eceef0" />
      {/* the three lines and the two-circle mark, the way a card carries them */}
      <g fill="#dfe1e5">
        <rect x="68" y="68" width="46" height="7" rx="3.5" />
        <rect x="68" y="82" width="52" height="7" rx="3.5" />
        <rect x="68" y="96" width="26" height="7" rx="3.5" />
        <rect x="76" y="128" width="38" height="7" rx="3.5" />
        <rect x="124" y="128" width="30" height="7" rx="3.5" />
        <rect x="164" y="128" width="34" height="7" rx="3.5" />
      </g>
      <g fill="#dfe1e5">
        <circle cx="196" cy="76" r="13" />
        <circle cx="212" cy="76" r="13" />
      </g>
      {/* trees on the slope */}
      <g fill="#eceef0">
        <path d="M92 152c0-9 5-16 8-16s8 7 8 16-3 11-8 11-8-2-8-11Z" />
        <rect x="98.6" y="160" width="2.8" height="18" rx="1.4" />
        <path d="M212 148c0-8 4.4-14 7-14s7 6 7 14-2.6 9.7-7 9.7-7-1.7-7-9.7Z" />
        <rect x="217.8" y="155" width="2.4" height="16" rx="1.2" />
        <path d="M244 164c0-6 3.2-10.5 5-10.5s5 4.5 5 10.5-1.8 7.2-5 7.2-5-1.2-5-7.2Z" />
        <rect x="247.8" y="169" width="2.4" height="13" rx="1.2" />
      </g>
    </svg>
  );
}
