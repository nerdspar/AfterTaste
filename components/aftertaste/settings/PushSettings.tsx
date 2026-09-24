'use client';

// Turning push on, and deciding what it is allowed to interrupt you for.
//
// Most of this component is about explaining itself when it can't work. Push
// has real prerequisites — HTTPS, a browser that supports it, and on iOS the
// app has to have been added to the Home Screen — and a toggle that silently
// does nothing is worse than no toggle. So every refusal has a reason and,
// where there is one, a way out.

import { useEffect, useState } from 'react';
import { BellRingIcon, SmartphoneIcon, CheckIcon, LoaderIcon } from 'lucide-react';
import {
  getPushConfig,
  savePushSubscription,
  removePushSubscription,
  sendTestPush,
} from '@/app/(app)/push-actions';
import {
  subscribeToPush,
  unsubscribeFromPush,
  pushBlocker,
  deviceLabel,
  type PushBlocker,
} from '@/lib/push-client';
import { useUserPrefs } from '@/components/aftertaste/UserPrefsProvider';
import { SettingRow, Toggle, SubHeading } from './primitives';
import { cn } from '@/lib/utils';

const BLOCKER_TEXT: Record<NonNullable<PushBlocker>, string> = {
  'ios-needs-install':
    'On iPhone and iPad, notifications only work once AfterTaste is on your Home Screen. Tap Share → Add to Home Screen, open it from there, then come back.',
  unsupported: "This browser can't do push notifications.",
  'insecure-context':
    'Notifications need a secure (https) connection. Reach AfterTaste over its https address rather than a plain IP.',
  denied:
    'Notifications are blocked for this site. Allow them in your browser settings, then try again.',
  'not-configured':
    'This server has no notification keys set (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY). See DEPLOY.md.',
};

// No fixed height: a select sized to h-8 clips its own text on a phone, and
// clips it badly once iOS text size is turned up. Padding lets it grow with
// whatever font the device is actually using. The extra padding on the right
// is for the native dropdown arrow, which otherwise draws straight over the
// last character.
const selectCls = cn(
  'rounded-lg border border-gray-200 bg-white py-1.5 pl-2.5 pr-7 text-sm leading-normal',
  'dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
  'focus:outline-none focus:ring-2 focus:ring-primary-500/30',
);

function hourLabel(h: number): string {
  if (h === 0) return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

export function PushSettings() {
  const { prefs, set } = useUserPrefs();
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [devices, setDevices] = useState(0);
  const [subscribedHere, setSubscribedHere] = useState(false);
  const [blocker, setBlocker] = useState<PushBlocker>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    let cancelled = false;
    getPushConfig()
      .then(async (cfg) => {
        if (cancelled) return;
        setPublicKey(cfg.publicKey);
        setDevices(cfg.deviceCount);
        setBlocker(pushBlocker(cfg.publicKey));
        // Does *this* browser already hold a subscription?
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          const sub = await reg?.pushManager.getSubscription();
          if (!cancelled) setSubscribedHere(!!sub);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = async () => {
    if (!publicKey) return;
    setBusy(true);
    setNote('');
    try {
      const res = await subscribeToPush(publicKey);
      if (!res.ok || !res.subscription) {
        setBlocker(res.blocker ?? 'unsupported');
        setNote(res.blocker ? '' : 'Permission was dismissed — try again.');
        return;
      }
      await savePushSubscription(
        res.subscription,
        deviceLabel(),
        Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      );
      setSubscribedHere(true);
      setDevices((d) => d + 1);
      setBlocker(null);
      setNote('This device will now get notifications.');
    } catch {
      setNote("Couldn't turn notifications on.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setNote('');
    try {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) await removePushSubscription(endpoint);
      setSubscribedHere(false);
      setDevices((d) => Math.max(0, d - 1));
      setNote('This device will no longer get notifications.');
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    setNote('');
    try {
      const { sent } = await sendTestPush();
      setNote(
        sent > 0
          ? `Sent to ${sent} device${sent === 1 ? '' : 's'}. It should arrive in a moment.`
          : 'No devices are registered yet.',
      );
    } finally {
      setBusy(false);
    }
  };

  const ready = subscribedHere && !blocker;

  return (
    <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
      <SubHeading
        title="Push notifications"
        hint="Alerts on your phone or computer, even when AfterTaste is closed."
      />

      {blocker && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
          {BLOCKER_TEXT[blocker]}
        </p>
      )}

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        <SettingRow
          icon={BellRingIcon}
          title={ready ? 'Notifications are on for this device' : 'Turn on for this device'}
          subtitle={
            devices > 0
              ? `${devices} device${devices === 1 ? '' : 's'} registered on your account`
              : 'Each phone or computer has to be turned on separately'
          }
          action={
            <div className="flex items-center gap-2">
              {ready && (
                <button
                  type="button"
                  onClick={test}
                  disabled={busy}
                  className="h-8 rounded-lg px-2.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Send a test
                </button>
              )}
              <button
                type="button"
                onClick={ready ? disable : enable}
                disabled={busy || (!!blocker && !ready)}
                className={cn(
                  'inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-medium transition-colors disabled:opacity-50',
                  ready
                    ? 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    : 'bg-primary-500 text-white hover:bg-primary-700',
                )}
              >
                {busy ? (
                  <LoaderIcon className="h-3.5 w-3.5 animate-spin" />
                ) : ready ? null : (
                  <CheckIcon className="h-3.5 w-3.5" />
                )}
                {ready ? 'Turn off' : 'Turn on'}
              </button>
            </div>
          }
        />
      </div>

      {note && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{note}</p>
      )}

      <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
        <SettingRow
          icon={SmartphoneIcon}
          title="When someone adds a recipe"
          subtitle="Tells the rest of your household, not you"
          action={
            <Toggle
              checked={prefs.pushNewRecipes}
              onChange={(v) => set({ pushNewRecipes: v })}
              label="Notify when someone adds a recipe"
            />
          }
        />
        <SettingRow
          icon={BellRingIcon}
          title="Ask if you made it"
          subtitle="A reminder to rate a recipe you had open long enough to cook"
          action={
            <Toggle
              checked={prefs.pushCookNudge}
              onChange={(v) => set({ pushCookNudge: v })}
              label="Ask if you made it"
            />
          }
        />
      </div>

      {prefs.pushCookNudge && (
        <div className="mt-3 rounded-lg bg-gray-50 px-3 py-3 dark:bg-gray-800/40">
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-sm text-gray-700 dark:text-gray-300">
            <span>If a recipe stays open for</span>
            <span className="inline-flex items-center whitespace-nowrap">
              <select
                aria-label="Minutes a recipe must stay open"
                className={selectCls}
                value={prefs.cookNudgeAfterMin}
                onChange={(e) =>
                  set({ cookNudgeAfterMin: Number(e.target.value) })
                }
              >
                {[1, 2, 3, 5, 10, 15, 20, 30].map((m) => (
                  <option key={m} value={m}>
                    {m} min
                  </option>
                ))}
              </select>
              ,
            </span>
            <span>ask me about it</span>
            <select
              aria-label="Hours to wait before asking"
              className={selectCls}
              value={prefs.cookNudgeDelayHr}
              onChange={(e) => set({ cookNudgeDelayHr: Number(e.target.value) })}
            >
              {[1, 2, 3, 4, 5, 6, 8, 12, 24].map((h) => (
                <option key={h} value={h}>
                  {h} hour{h === 1 ? '' : 's'}
                </option>
              ))}
            </select>
            <span>later.</span>
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-2 text-sm text-gray-700 dark:text-gray-300">
            <span>Never between</span>
            <select
              aria-label="Quiet hours start"
              className={selectCls}
              value={prefs.quietFromHour}
              onChange={(e) => set({ quietFromHour: Number(e.target.value) })}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
            <span>and</span>
            <select
              aria-label="Quiet hours end"
              className={selectCls}
              value={prefs.quietToHour}
              onChange={(e) => set({ quietToHour: Number(e.target.value) })}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
            <span className="text-gray-400">
              — anything due then waits for the morning.
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
