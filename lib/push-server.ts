// Sending web push. Server-only: reads the VAPID keys and talks to the push
// services (FCM, Mozilla, Apple) on the household's behalf.
//
// Push is optional. A deploy with no VAPID keys set simply cannot send, and
// every entry point here degrades to a no-op rather than throwing — a recipe
// save must never fail because a notification could not go out.
//
// The keys are read at call time, not at module load, because the Docker image
// is built once and the keys arrive as runtime environment variables.

import webpush, { WebPushError } from 'web-push';
import { prisma } from '@/lib/db';

export interface PushPayload {
  title: string;
  body: string;
  /** Path to open when the notification is tapped. */
  url: string;
  /** Collapse key: a newer notification with the same tag replaces the old. */
  tag?: string;
}

let configuredWith: string | null = null;

/** Configure web-push on first use; returns false when no keys are set. */
function ensureConfigured(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  if (configuredWith !== publicKey) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@aftertaste.local',
      publicKey,
      privateKey,
    );
    configuredWith = publicKey;
  }
  return true;
}

/** True when this deploy has the keys needed to send anything at all. */
export function pushConfigured(): boolean {
  return ensureConfigured();
}

/** The public key the browser needs in order to subscribe. */
export function vapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

/**
 * Send to every device a user has registered. Returns how many got through.
 *
 * A 404 or 410 means the push service has retired that endpoint — the browser
 * was uninstalled, or the user revoked permission. That is the only signal we
 * ever get, so the row is deleted on the spot; left behind they accumulate
 * forever and every send retries them.
 */
export async function sendToUser(
  userId: string,
  payload: PushPayload,
): Promise<number> {
  if (!ensureConfigured()) return 0;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return 0;

  const body = JSON.stringify(payload);
  const dead: string[] = [];
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: 12 * 60 * 60 },
        );
        sent += 1;
      } catch (err) {
        if (
          err instanceof WebPushError &&
          (err.statusCode === 404 || err.statusCode === 410)
        ) {
          dead.push(sub.id);
          return;
        }
        console.error('[push] send failed', sub.endpoint.slice(0, 40), err);
      }
    }),
  );

  if (dead.length > 0) {
    await prisma.pushSubscription
      .deleteMany({ where: { id: { in: dead } } })
      .catch(() => {});
  }
  if (sent > 0) {
    await prisma.pushSubscription
      .updateMany({
        where: { userId, id: { notIn: dead } },
        data: { lastSentAt: new Date() },
      })
      .catch(() => {});
  }
  return sent;
}

/** Send to several users at once, skipping any that cannot be reached. */
export async function sendToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<number> {
  if (userIds.length === 0 || !ensureConfigured()) return 0;
  const counts = await Promise.all(
    userIds.map((id) => sendToUser(id, payload).catch(() => 0)),
  );
  return counts.reduce((a, b) => a + b, 0);
}
