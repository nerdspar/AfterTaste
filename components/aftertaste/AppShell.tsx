'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { SidebarNav } from './SidebarNav';
import { HeaderBar } from './HeaderBar';
import { initInstallCapture } from '@/lib/pwa-install';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      {/* Desktop sidebar (fixed) */}
      <aside
        className={cn(
          'hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0',
          'w-[280px] bg-white dark:bg-slate-900',
          'border-r border-gray-200 dark:border-gray-800 z-30',
        )}
      >
        <SidebarNav />
      </aside>

      {/* Mobile sidebar — sits behind the content and is revealed when the
          content slides right (push), instead of overlaying it. */}
      <aside
        aria-hidden={!sidebarOpen}
        className={cn(
          'md:hidden fixed inset-y-0 left-0 w-[280px] z-20',
          'bg-white dark:bg-slate-900',
          'border-r border-gray-200 dark:border-gray-800',
        )}
      >
        <SidebarNav onNavigate={() => setSidebarOpen(false)} />
      </aside>

      {/* Main area. On mobile it slides right by the sidebar width when the menu
          is open. The transform is only applied while open, so it doesn't create
          a containing block that would break fixed children the rest of the time.
          min-w-0 lets wide content (e.g. the meal planner) scroll in its own
          container instead of widening the page. */}
      <div
        className={cn(
          'relative z-30 min-h-screen flex flex-col min-w-0',
          'bg-gray-50 dark:bg-[#0B1220]',
          'md:ml-[280px]',
          'transition-transform duration-200 ease-out',
          sidebarOpen && 'translate-x-[280px] md:translate-x-0',
        )}
      >
        <HeaderBar onMenuToggle={() => setSidebarOpen((o) => !o)} />

        <main className="flex-1 px-4 md:px-5 pb-6">{children}</main>

        {/* Tap the pushed-aside content to close the menu (mobile only). */}
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden absolute inset-0 z-40 cursor-default"
          />
        )}
      </div>
    </div>
  );
}
