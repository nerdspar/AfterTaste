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
  // Extend under the notch/home indicator so env(safe-area-inset-*) is
  // non-zero — the bottom tab bar relies on it to clear the home indicator.
  viewportFit: 'cover',
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
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
