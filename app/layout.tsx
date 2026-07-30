import { ThemeProvider } from 'next-themes';
import { Metadata } from 'next';
import { colors } from '@/data/config/colors.js';
import '@/css/globals.css';

const colorMap = colors as Record<string, Record<string, string>>;
const style: string[] = [];
Object.keys(colorMap).forEach((variant) => {
  Object.keys(colorMap[variant]).forEach((shade) => {
    style.push(`--${variant}-${shade}: ${colorMap[variant][shade]}`);
  });
});

export const metadata: Metadata = {
  title: {
    default: 'AfterTaste',
    template: '%s | AfterTaste',
  },
  description: 'Recipe management app',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <style>{`:root, :before, :after { ${style.join(';')} }`}</style>
      </head>
      <body className="bg-white text-black antialiased dark:bg-gray-950 dark:text-white min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
