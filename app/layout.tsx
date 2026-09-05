import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { BRAND } from '@/lib/brand';
import './globals.css';

export const metadata: Metadata = {
  title: `${BRAND.name} — অনলাইন ক্যাসিনো ও ক্রিকেট এক্সচেঞ্জ`,
  description:
    'বাংলাদেশের অনলাইন গেমিং প্ল্যাটফর্ম — লাইভ ক্যাসিনো, স্লট, ক্রিকেট এক্সচেঞ্জ, ফিশিং ও লটারি।',
  applicationName: BRAND.name,
};

export const viewport: Viewport = {
  themeColor: '#04211f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const extensionErrorGuard = `
(function () {
  function isBrowserExtensionError(eventOrReason) {
    var message = '';
    var source = '';
    var stack = '';

    if (eventOrReason) {
      message = String(eventOrReason.message || '');
      source = String(eventOrReason.filename || eventOrReason.source || '');

      var reason = eventOrReason.reason || eventOrReason.error || eventOrReason;
      if (reason) {
        stack = String(reason.stack || reason.message || reason || '');
      }
    }

    return source.indexOf('chrome-extension://') === 0 ||
      source.indexOf('moz-extension://') === 0 ||
      stack.indexOf('chrome-extension://') !== -1 ||
      stack.indexOf('moz-extension://') !== -1 ||
      message.indexOf("Cannot read properties of undefined (reading 'M_ID')") !== -1;
  }

  window.addEventListener('error', function (event) {
    if (!isBrowserExtensionError(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  window.addEventListener('unhandledrejection', function (event) {
    if (!isBrowserExtensionError(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Script
          id="extension-error-guard"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: extensionErrorGuard }}
        />
        {children}
      </body>
    </html>
  );
}
