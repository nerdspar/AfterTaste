'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  SunIcon,
  MoonIcon,
  MonitorIcon,
  DownloadIcon,
  UploadIcon,
  CheckIcon,
  SmartphoneIcon,
  ClipboardIcon,
  BellIcon,
  Share2Icon,
} from 'lucide-react';
import { Card } from '@/components/aftertaste/Card';
import { HouseholdManager } from '@/components/aftertaste/HouseholdManager';
import { cn } from '@/lib/utils';
import { useRecipeStore } from '@/components/aftertaste/RecipeStoreProvider';
import { ImportRecipeModal } from '@/components/aftertaste/ImportRecipeModal';
import { exportRecipesJson } from '@/lib/recipe-export';
import { ACCENT_PRESETS, applyAccent } from '@/lib/accent';
import {
  usePref,
  setPref,
  PREF_CLIPBOARD,
  PREF_NOTIFICATIONS,
} from '@/lib/prefs';
import { useInstallAvailable, promptInstall } from '@/lib/pwa-install';
import { useCurrentUser } from '@/components/aftertaste/CurrentUserProvider';
import {
  updateUserPrefs,
  type UserPrefsInput,
} from '@/app/(app)/user-actions';
import type { HouseholdView } from '@/app/(app)/household-actions';

const UNIT_OPTIONS = [
  { key: 'imperial', label: 'Imperial' },
  { key: 'metric', label: 'Metric' },
];

function persistPrefs(input: UserPrefsInput) {
  updateUserPrefs(input).catch((err) =>
    console.error('[settings] save prefs failed', err),
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">
        {title}
      </h2>
      {description && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
          {description}
        </p>
      )}
      {!description && <div className="mb-3" />}
      <Card>{children}</Card>
    </section>
  );
}

function Toggle({
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

const THEMES = [
  { key: 'light', label: 'Light', icon: SunIcon },
  { key: 'dark', label: 'Dark', icon: MoonIcon },
  { key: 'system', label: 'System', icon: MonitorIcon },
];

export function SettingsClient({
  householdView,
}: {
  householdView: HouseholdView;
}) {
  const { recipes } = useRecipeStore();
  const { theme, setTheme } = useTheme();
  const user = useCurrentUser();
  const [mounted, setMounted] = useState(false);
  const [accent, setAccent] = useState(user.accent);
  const [units, setUnits] = useState(user.units);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [importOpen, setImportOpen] = useState(false);

  const clipboardOn = usePref(PREF_CLIPBOARD, true);
  const notificationsOn = usePref(PREF_NOTIFICATIONS, true);
  const installAvailable = useInstallAvailable();

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectAccent = (id: string) => {
    setAccent(id);
    applyAccent(id);
    persistPrefs({ accent: id });
  };

  const selectTheme = (key: string) => {
    setTheme(key);
    persistPrefs({ theme: key });
  };

  const selectUnits = (key: string) => {
    setUnits(key);
    persistPrefs({ units: key });
  };

  const saveName = () => {
    const trimmed = displayName.trim();
    if (trimmed === (user.displayName ?? '')) return;
    persistPrefs({ displayName: trimmed });
  };

  const isStandalone =
    mounted &&
    (window.matchMedia?.('(display-mode: standalone)').matches ||
      // iOS
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">
        Settings
      </h1>

      <div className="space-y-6">
        {/* Profile */}
        <Section title="Profile">
          <div className="space-y-5">
            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onBlur={saveName}
                placeholder="Your name"
                className="w-full max-w-xs h-10 px-3 rounded-lg text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/50 transition-colors"
              />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user.email}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Measurement units
              </p>
              <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 p-1 w-full max-w-xs">
                {UNIT_OPTIONS.map((u) => {
                  const active = units === u.key;
                  return (
                    <button
                      key={u.key}
                      type="button"
                      onClick={() => selectUnits(u.key)}
                      className={cn(
                        'flex-1 flex items-center justify-center h-8 rounded-md text-xs font-medium transition-colors',
                        active
                          ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400',
                      )}
                    >
                      {u.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Section>

        {/* Appearance */}
        <Section title="Appearance">
          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Theme
              </p>
              <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 p-1 w-full max-w-xs">
                {THEMES.map((t) => {
                  const active = mounted && theme === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => selectTheme(t.key)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md text-xs font-medium transition-colors',
                        active
                          ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400',
                      )}
                    >
                      <t.icon className="w-3.5 h-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Accent color
              </p>
              <div className="flex flex-wrap gap-2.5">
                {ACCENT_PRESETS.map((preset) => {
                  const active = accent === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      aria-label={preset.name}
                      aria-pressed={active}
                      title={preset.name}
                      onClick={() => selectAccent(preset.id)}
                      className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-105',
                        'ring-offset-2 ring-offset-white dark:ring-offset-slate-900',
                        active && 'ring-2 ring-gray-400 dark:ring-gray-500',
                      )}
                      style={{ backgroundColor: preset.shades.main }}
                    >
                      {active && <CheckIcon className="w-4 h-4 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Section>

        {/* Recipes: import & export */}
        <Section title="Recipes">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <SettingRow
              icon={UploadIcon}
              title="Import recipes"
              subtitle="From a URL, text, file, or a Crouton export"
              action={
                <button
                  type="button"
                  onClick={() => setImportOpen(true)}
                  className="h-8 px-3 rounded-lg text-xs font-medium bg-primary-500 text-white hover:bg-primary-700 transition-colors"
                >
                  Import
                </button>
              }
            />
            <SettingRow
              icon={DownloadIcon}
              title="Export recipes"
              subtitle={`Download all ${recipes.length} recipes as JSON`}
              action={
                <button
                  type="button"
                  onClick={() => exportRecipesJson(recipes)}
                  disabled={recipes.length === 0}
                  className="h-8 px-3 rounded-lg text-xs font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
                >
                  Export
                </button>
              }
            />
            <SettingRow
              icon={ClipboardIcon}
              title="Detect links on clipboard"
              subtitle="Offer to import a recipe link when you open Import"
              action={
                <Toggle
                  checked={clipboardOn}
                  onChange={(v) => setPref(PREF_CLIPBOARD, v)}
                  label="Detect links on clipboard"
                />
              }
            />
          </div>
        </Section>

        {/* Share to AfterTaste */}
        <Section
          title="Share to AfterTaste"
          description="Send a recipe link straight into the app from your phone's share sheet."
        >
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-start gap-2.5">
              <Share2Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Android:
                </span>{' '}
                install AfterTaste (below), then choose it in any browser&apos;s
                Share menu.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <SmartphoneIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  iPhone:
                </span>{' '}
                iOS can&apos;t share into web apps directly, so add a one-tap
                Shortcut — create a Shortcut with{' '}
                <em>Receive URLs from Share Sheet</em> → <em>Open URL</em> set to{' '}
                <code className="text-[11px] px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
                  {mounted ? window.location.origin : ''}/import?url=[Shortcut
                  Input]
                </code>
                .
              </p>
            </div>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <SettingRow
            icon={BellIcon}
            title="Activity &amp; reminders"
            subtitle="Show today's meals, grocery items, and things to rate in the bell"
            action={
              <Toggle
                checked={notificationsOn}
                onChange={(v) => setPref(PREF_NOTIFICATIONS, v)}
                label="Activity and reminders"
              />
            }
          />
        </Section>

        {/* Install */}
        <Section title="App">
          <SettingRow
            icon={SmartphoneIcon}
            title="Install AfterTaste"
            subtitle={
              isStandalone
                ? 'Installed — running as an app'
                : installAvailable
                  ? 'Add AfterTaste to your home screen'
                  : 'Use your browser menu → Add to Home Screen / Install'
            }
            action={
              isStandalone ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckIcon className="w-3.5 h-3.5" /> Installed
                </span>
              ) : installAvailable ? (
                <button
                  type="button"
                  onClick={() => promptInstall()}
                  className="h-8 px-3 rounded-lg text-xs font-medium bg-primary-500 text-white hover:bg-primary-700 transition-colors"
                >
                  Install
                </button>
              ) : null
            }
          />
        </Section>

        {/* Household */}
        <Section
          title="Household"
          description="Recipes, groceries, meal plans, ratings, and favorites are shared with everyone in your household."
        >
          <HouseholdManager initialView={householdView} />
        </Section>
      </div>

      <ImportRecipeModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

function SettingRow({
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
