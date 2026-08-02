'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  CameraIcon,
  CoffeeIcon,
  SaladIcon,
} from 'lucide-react';
import { Card } from '@/components/aftertaste/Card';
import { Avatar } from '@/components/aftertaste/Avatar';
import { HouseholdManager } from '@/components/aftertaste/HouseholdManager';
import { TabCustomizer } from '@/components/aftertaste/TabCustomizer';
import { AccountSecurity } from '@/components/aftertaste/AccountSecurity';
import { cn } from '@/lib/utils';
import { useRecipeStore } from '@/components/aftertaste/RecipeStoreProvider';
import { ImportRecipeModal } from '@/components/aftertaste/ImportRecipeModal';
import { exportRecipesJson } from '@/lib/recipe-export';
import { ACCENT_PRESETS, applyAccent } from '@/lib/accent';
import { useUserPrefs } from '@/components/aftertaste/UserPrefsProvider';
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
  id,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className={id ? 'scroll-mt-20' : undefined}>
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
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [accent, setAccent] = useState(user.accent);
  const [units, setUnits] = useState(user.units);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.image);
  const [avatarError, setAvatarError] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [goals, setGoals] = useState({
    calorie: user.goals.calories?.toString() ?? '',
    protein: user.goals.protein?.toString() ?? '',
    carbs: user.goals.carbs?.toString() ?? '',
    fat: user.goals.fat?.toString() ?? '',
  });

  const { prefs, set: setUserPref } = useUserPrefs();
  const clipboardOn = prefs.clipboard;
  const notificationsOn = prefs.notifications;
  const keepAwakeOn = prefs.keepAwake;
  const nutritionOn = prefs.nutrition;
  const installAvailable = useInstallAvailable();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Persist a nutrition goal on blur. Blank clears it (null).
  const saveGoal = (
    field: 'calorieGoal' | 'proteinGoal' | 'carbsGoal' | 'fatGoal',
    raw: string,
  ) => {
    const trimmed = raw.trim();
    if (trimmed === '') {
      persistPrefs({ [field]: null });
      return;
    }
    const value = Number(trimmed);
    if (Number.isNaN(value) || value < 0) return;
    persistPrefs({ [field]: Math.round(value) });
  };

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

  const onAvatarFile = (file: File | undefined) => {
    setAvatarError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Image must be under 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setAvatarPreview(dataUrl); // instant preview
      await updateUserPrefs({ avatarUrl: dataUrl });
      router.refresh(); // update the header avatar with the persisted URL
    };
    reader.readAsDataURL(file);
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
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Photo
              </p>
              <div className="flex items-center gap-4">
                <Avatar
                  src={avatarPreview ?? undefined}
                  alt={displayName || user.email}
                  size="lg"
                />
                <div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onAvatarFile(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                  >
                    <CameraIcon className="w-3.5 h-3.5" />
                    {avatarPreview ? 'Change photo' : 'Upload photo'}
                  </button>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarPreview(null);
                        setAvatarError('');
                        persistPrefs({ avatarUrl: '' });
                        router.refresh();
                      }}
                      className="ml-2 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      Remove
                    </button>
                  )}
                  {avatarError && (
                    <p className="mt-1.5 text-xs text-red-500">{avatarError}</p>
                  )}
                </div>
              </div>
            </div>

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

        {/* Navigation — the mobile bottom tab bar */}
        <Section
          id="tabs"
          title="Navigation"
          description="Choose the tabs in your mobile bottom bar."
        >
          <TabCustomizer />
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
                  onChange={(v) => setUserPref({ clipboard: v })}
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

        {/* Nutrition */}
        <Section title="Nutrition">
          <SettingRow
            icon={SaladIcon}
            title="Nutrition &amp; macro tracking"
            subtitle="Show calories and macros on recipes, and enable the food log"
            action={
              <Toggle
                checked={nutritionOn}
                onChange={(v) => setUserPref({ nutrition: v })}
                label="Nutrition and macro tracking"
              />
            }
          />
          {nutritionOn && (
            <div className="border-t border-gray-100 px-4 py-4 dark:border-gray-800">
              <p className="mb-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                Daily goals
              </p>
              <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">
                Your personal targets for the food log. Leave blank for no goal.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  [
                    { key: 'calorie', field: 'calorieGoal', label: 'Calories' },
                    { key: 'protein', field: 'proteinGoal', label: 'Protein (g)' },
                    { key: 'carbs', field: 'carbsGoal', label: 'Carbs (g)' },
                    { key: 'fat', field: 'fatGoal', label: 'Fat (g)' },
                  ] as const
                ).map((g) => (
                  <label
                    key={g.key}
                    className="text-xs text-gray-500 dark:text-gray-400"
                  >
                    {g.label}
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={goals[g.key]}
                      placeholder="—"
                      onChange={(e) =>
                        setGoals((prev) => ({ ...prev, [g.key]: e.target.value }))
                      }
                      onBlur={(e) => saveGoal(g.field, e.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-100"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Cooking */}
        <Section title="Cooking">
          <SettingRow
            icon={CoffeeIcon}
            title="Keep screen awake in a recipe"
            subtitle="Stop your phone from sleeping while a recipe is open"
            action={
              <Toggle
                checked={keepAwakeOn}
                onChange={(v) => setUserPref({ keepAwake: v })}
                label="Keep screen awake in a recipe"
              />
            }
          />
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
                onChange={(v) => setUserPref({ notifications: v })}
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

        {/* Sign in & security */}
        <Section
          title="Sign in &amp; security"
          description="Update the email and password you use to sign in."
        >
          <AccountSecurity />
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
