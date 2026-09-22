'use server';

import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { sendToUser, vapidPublicKey, pushConfigured } from '@/lib/push-server';

// Everything the browser needs to set up, tear down, and trigger push.
//
// The public key is handed out at request time rather than baked in at build
// time: the Docker image is built once and the VAPID keys arrive as runtime
// environment variables, so a NEXT_PUBLIC_ constant would be empty forever.

export interface PushConfig {
  /** Null when this deploy has no VAPID keys — the UI then explains why. */
  publicKey: string | null;
  /** How many devices this user currently has registered. */
  deviceCount: number;
}

export async function getPushConfig(): Promise<PushConfig> {
  const { userId } = await requireSession();
  const deviceCount = pushConfigured()
    ? await prisma.pushSubscription.count({ where: { userId } })
    : 0;
  return { publicKey: vapidPublicKey(), deviceCount };
}

export interface BrowserSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * Register this browser for push. Keyed on the endpoint, which is the device's
 * identity — re-subscribing the same browser returns the same endpoint, so an
 * upsert keeps one row per device instead of piling up duplicates.
 *
 * The timezone rides along because quiet hours have to mean the cook's evening,
 * not the server's.
 */
export async function savePushSubscription(
  sub: BrowserSubscription,
  label: string,
  timeZone: string,
): Promise<void> {
  const { userId } = await requireSession();
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: {
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      label: label.slice(0, 80),
    },
    update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });
  if (timeZone) {
    await prisma.user
      .update({ where: { id: userId }, data: { timeZone } })
      .catch(() => {});
  }
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const { userId } = await requireSession();
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

/** Send a notification to this user's devices so they can confirm it works. */
export async function sendTestPush(): Promise<{ sent: number }> {
  const { userId } = await requireSession();
  const sent = await sendToUser(userId, {
    title: 'AfterTaste',
    body: 'Notifications are working. This is what they look like.',
    url: '/settings',
    tag: 'test',
  });
  return { sent };
}

/**
 * Called when a recipe has been open long enough to mean someone is cooking it.
 * Queues the did-you-make-it nudge for later.
 *
 * `dueAt` is stored raw, with quiet hours applied at send time instead of here
 * — the cook may change their quiet hours in the hours between, and the answer
 * that matters is the one in force when it would actually buzz.
 *
 * Reopening a recipe with a nudge already pending pushes the time back rather
 * than queueing a second one: the unique key is (user, kind, recipe).
 */
export async function scheduleCookNudge(recipeId: string): Promise<void> {
  const { userId } = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushCookNudge: true, cookNudgeDelayHr: true },
  });
  if (!user?.pushCookNudge) return;

  const devices = await prisma.pushSubscription.count({ where: { userId } });
  if (devices === 0) return; // nowhere to send it — don't queue noise

  const dueAt = new Date(Date.now() + user.cookNudgeDelayHr * 60 * 60 * 1000);
  await prisma.scheduledNotification.upsert({
    where: {
      userId_kind_recipeId: { userId, kind: 'cook-nudge', recipeId },
    },
    create: { userId, kind: 'cook-nudge', recipeId, dueAt },
    // Clear any previous outcome: they are cooking it again.
    update: { dueAt, sentAt: null, skippedAt: null, skippedReason: null },
  });
}
