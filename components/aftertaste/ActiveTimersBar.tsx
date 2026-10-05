'use client';

// The timers you have running, wherever you are in the app.
//
// Only shows outside cook mode — in there they already have their own strip.
// Its real job is the accidental exit: you swipe back, the timers are still
// counting, and this is both the proof of that and the way back in.

import Link from 'next/link';
import { TimerIcon, BellRingIcon, XIcon } from 'lucide-react';
import { useCookTimers } from './CookTimersProvider';
import { formatClock } from '@/lib/step-timers';
import { cn } from '@/lib/utils';

export function ActiveTimersBar() {
  const { timers, dismiss, remaining, cookModeOpen } = useCookTimers();
  if (cookModeOpen || timers.length === 0) return null;

  return (
    <div
      className={cn(
        'fixed inset-x-0 z-40 px-3',
        // Clear of the mobile tab bar; on desktop there is none.
        'bottom-[76px] md:bottom-4',
      )}
    >
      <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-2 md:justify-end">
        {timers.map((t) => (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-2 rounded-full py-1.5 pl-3 pr-1.5 shadow-lg backdrop-blur',
              t.done
                ? 'animate-pulse bg-primary-500 text-white'
                : 'bg-white/95 text-gray-700 ring-1 ring-gray-200 dark:bg-slate-900/95 dark:text-gray-200 dark:ring-gray-700',
            )}
          >
            <Link
              // A timer started from a party belongs to its run of show, not
              // to a recipe page that does not exist for it.
              href={t.href ?? `/recipes/${t.recipeId}?cook=1`}
              className="flex min-w-0 items-center gap-2"
              title={
                t.href
                  ? `${t.recipeTitle} · ${t.name} · ${t.label} — back to the run of show`
                  : `${t.recipeTitle} · ${t.name} · ${t.label} — back to cooking`
              }
            >
              {t.done ? (
                <BellRingIcon className="h-4 w-4 flex-shrink-0" />
              ) : (
                <TimerIcon className="h-4 w-4 flex-shrink-0" />
              )}
              <span className="flex min-w-0 flex-col leading-tight">
                {/* The recipe, because a timer ringing while you are three
                    screens away is no use if you can't tell what it is for. */}
                <span className="max-w-[10rem] truncate text-[11px] opacity-70">
                  {t.recipeTitle}
                </span>
                <span className="max-w-[10rem] truncate text-sm font-medium tabular-nums">
                  {t.name} · {t.done ? 'done' : formatClock(remaining(t))}
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label={`Dismiss ${t.name} timer`}
              className="rounded-full p-1 opacity-60 transition-opacity hover:opacity-100"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
