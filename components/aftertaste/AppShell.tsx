'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { XIcon } from 'lucide-react';
import { SidebarNav } from './SidebarNav';
import { HeaderBar } from './HeaderBar';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B1220] transition-colors">
      <div className="flex">
        {/* Sidebar - desktop */}
        <aside
          className={cn(
            'hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0',
            'w-[280px] bg-white dark:bg-slate-900',
            'border-r border-gray-200 dark:border-gray-800',
            'z-30',
          )}
        >
          <SidebarNav />
        </aside>

        {/* Sidebar - mobile drawer */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <aside
              className={cn(
                'fixed inset-y-0 left-0 z-50 w-[280px]',
                'bg-white dark:bg-slate-900',
                'shadow-xl md:hidden',
                'animate-in slide-in-from-left duration-200',
              )}
            >
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Close sidebar"
              >
                <XIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
              <SidebarNav onNavigate={() => setSidebarOpen(false)} />
            </aside>
          </>
        )}

        {/* Main area */}
        <div className="flex-1 md:ml-[280px] min-h-screen flex flex-col">
          <HeaderBar onMenuToggle={() => setSidebarOpen(true)} />

          <main className="flex-1 px-4 md:px-5 pb-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
