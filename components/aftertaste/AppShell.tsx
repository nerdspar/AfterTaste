'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { SidebarNav } from './SidebarNav';
import { HeaderBar } from './HeaderBar';
import { MobileTabBar } from './MobileTabBar';
import { PullToRefresh } from './PullToRefresh';
import { initInstallCapture } from '@/lib/pwa-install';
import { NotificationRouter } from './NotificationRouter';

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

    // Cold-launch only: iOS composites its top "Liquid Glass" scroll-edge ramp
    // over the first painted frame before the no-cover/tint suppression settles,
    // so the header/search bar looks faintly blurred until the first navigation
    // forces a recompute. The scroll-edge effect is scroll-driven, so nudge the
    // window 1px and back (across two frames, position restored) to make iOS
    // recompute immediately instead of leaving it blurred until the user moves.
    const raf1 = requestAnimationFrame(() => {
      const y = window.scrollY;
      window.scrollTo(0, y + 1);
      requestAnimationFrame(() => window.scrollTo(0, y));
    });
    return () => cancelAnimationFrame(raf1);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50 dark:bg-[#0B1220] transition-colors">
      {/* Listens for a tapped notification and routes the app there. */}
      <NotificationRouter />
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

      {/* Pull-to-refresh moves this content column down as you pull (mobile PWA). */}
      <PullToRefresh>
        <div className="relative z-30 flex min-h-screen min-w-0 flex-col bg-gray-50 dark:bg-[#0B1220] md:ml-[280px]">
          <HeaderBar />
          {/* Bottom padding on mobile so content clears the fixed tab bar. Tracks
              the bar's real footprint (band + home-indicator cushion) + a breathing
              gap via --content-pad-b (globals.css), so it stays right whether or not
              the home indicator is present. */}
          <main className="flex-1 px-4 pb-[var(--content-pad-b)] md:px-5 md:pb-6">
            {children}
          </main>
        </div>
      </PullToRefresh>

      <MobileTabBar />
    </div>
  );
}
