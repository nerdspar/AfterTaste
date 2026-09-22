'use client';

// The small shared building blocks of the Settings page: a section sub-heading,
// a switch, and a labelled row. They live here rather than in SettingsClient so
// that blocks rendered *inside* the page (PushSettings) can use them without
// importing the page back, which would be a cycle.

import { cn } from '@/lib/utils';

export function SubHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </p>
      {hint && (
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{hint}</p>
      )}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
        checked ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
          checked && 'translate-x-5',
        )}
      />
    </button>
  );
}

export function SettingRow({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {title}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>
      </div>
      <div className="flex-shrink-0">{action}</div>
    </div>
  );
}
