'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDownIcon, LogOutIcon, SettingsIcon } from 'lucide-react';
import { Avatar } from './Avatar';
import { logout } from '@/app/(auth)/actions';

export interface AccountUser {
  name: string;
  email: string;
  image: string | null;
}

export function AccountMenu({ user }: { user: AccountUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const firstName = user.name.split(' ')[0] || user.name;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative ml-2" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 h-9 pl-1 pr-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar src={user.image ?? undefined} alt={user.name} size="sm" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block">
          {firstName}
        </span>
        <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 shadow-lg py-1 z-50"
        >
          <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-800">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user.email}
            </p>
          </div>

          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            role="menuitem"
          >
            <SettingsIcon className="w-4 h-4 text-gray-400" />
            Settings
          </Link>

          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              role="menuitem"
            >
              <LogOutIcon className="w-4 h-4 text-gray-400" />
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
