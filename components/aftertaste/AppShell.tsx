'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { SidebarNav } from './SidebarNav';
import { HeaderBar } from './HeaderBar';
import { MobileTabBar } from './MobileTabBar';
import { initInstallCapture } from '@/lib/pwa-install';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  useEffect(() => {
    initInstallCapture();
    // Register the service worker (PWA install + offline). Production only —
    // a runtime cache fights with dev HMR.
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50 dark:bg-[#0B1220] transition-colors">
      {/* Desktop sidebar (fixed). On mobile, navigation lives in the bottom bar
          + More sheet, so there's no drawer/hamburger. */}
      <aside
        className={cn(
          'hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0',
          'w-[280px] bg-white dark:bg-slate-900',
          'border-r border-gray-200 dark:border-gray-800 z-30',
        )}
      >
        <SidebarNav />
      </aside>

      <div className="relative z-30 flex min-h-screen min-w-0 flex-col bg-gray-50 dark:bg-[#0B1220] md:ml-[280px]">
        <HeaderBar />
        {/* Bottom padding on mobile so content clears the fixed tab bar
            (56px band + 16px pad = 72px, plus an 8px breathing gap). */}
        <main className="flex-1 px-4 pb-20 md:px-5 md:pb-6">
          {children}
        </main>
      </div>

      <MobileTabBar />
    </div>
  );
}
