import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import InstallPrompt from '@/components/InstallPrompt';
import { BRAND } from '@/lib/brand';
import './globals.css';

export const metadata: Metadata = {
  title: `${BRAND.name} — Online Casino & Cricket Exchange`,
  description:
    'Bangladesh’s online gaming platform — live casino, slots, cricket exchange, fishing and lottery.',
  applicationName: BRAND.name,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  // lets iOS run it full-screen once it is on the home screen
  appleWebApp: { capable: true, title: BRAND.name, statusBarStyle: 'black-translucent' },
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

const installPromptCatcher = `
(function () {
  window.addEventListener('beforeinstallprompt', function (event) {
    // stop Chrome's own mini-infobar; the site shows its own sheet instead
    event.preventDefault();
    window.__skInstallEvent = event;
    window.dispatchEvent(new Event('sk:installable'));
  });
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Script
          id="extension-error-guard"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: extensionErrorGuard }}
        />
        <Script
          id="install-prompt-catcher"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: installPromptCatcher }}
        />
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
