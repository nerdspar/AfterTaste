import { ThemeProvider } from 'next-themes';
import { Metadata, Viewport } from 'next';
import {
  accentVarsCss,
  accentInitScript,
  getPreset,
  DEFAULT_ACCENT_ID,
} from '@/lib/accent';
import '@/css/globals.css';

const defaultAccentCss = accentVarsCss(getPreset(DEFAULT_ACCENT_ID));

export const metadata: Metadata = {
  title: {
    default: 'AfterTaste',
    template: '%s | AfterTaste',
  },
  description: 'Your personal recipe box.',
  appleWebApp: { capable: true, title: 'AfterTaste', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#f97316',
  // Deliberately NOT viewportFit: 'cover'. With cover the web view spans the whole
  // screen and iOS 26+/27 paints its uncloseable "Liquid Glass" blur over the top
  // edge of a standalone PWA; without it, iOS keeps content inside the safe area
  // (below the status bar) so the ramp has nothing to fall on. That zeros
  // env(safe-area-inset-bottom), so globals.css reserves the home-indicator height
  // (--sa-bottom) in standalone. The .status-tint strip below is the top insurance.
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <style>{`:root { ${defaultAccentCss} }`}</style>
        <script dangerouslySetInnerHTML={{ __html: accentInitScript() }} />
      </head>
      <body className="bg-white text-black antialiased dark:bg-gray-950 dark:text-white min-h-screen">
        {/* Status-bar tint strip: a fixed opaque element at the very top edge that
            iOS samples as solid chrome to suppress the top blur ramp (standalone +
            portrait only, see globals.css). Background matches the app shell so it
            blends; display:none in a browser tab. */}
        <div
          className="status-tint bg-gray-50 dark:bg-[#0B1220]"
          aria-hidden="true"
        />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
