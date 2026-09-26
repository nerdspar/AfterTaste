// The part that makes a delayed notification actually happen.
//
// A nudge queued at 6pm has to survive until 9pm with nobody looking at it, so
// it lives in Postgres and something has to come along and send it. That
// something is a plain interval inside the Next server process, which suits
// this app: one self-hosted container, one database, no queue to run.
//
// Two things keep it honest:
//   - Due rows are re-checked before sending. Hours have passed, and the
//     answer may already be in — a recipe that has since been rated should not
//     ask whether it was cooked.
//   - Quiet hours are applied here, not at queue time, so changing them in
//     Settings affects nudges that are already waiting.

import { prisma } from '@/lib/db';
import { sendToUser } from '@/lib/push-server';
import { nextSendableTime } from '@/lib/quiet-hours';

/** How often to look for due notifications. */
const TICK_MS = 60_000;

/**
 * Anything due more than this long ago is stale — the server was probably off.
 * Asking at breakfast whether last Tuesday's dinner got cooked is worse than
 * not asking, so those are dropped rather than delivered late.
 */
const MAX_LATENESS_MS = 12 * 60 * 60 * 1000;

async function skip(id: string, reason: string): Promise<void> {
  await prisma.scheduledNotification
    .update({
      where: { id },
      data: { skippedAt: new Date(), skippedReason: reason },
    })
    .catch(() => {});
}

/** Process every notification that has come due. Returns how many were sent. */
export async function runDueNotifications(now = new Date()): Promise<number> {
  const due = await prisma.scheduledNotification.findMany({
    where: { sentAt: null, skippedAt: null, dueAt: { lte: now } },
    include: {
      user: {
        select: {
          id: true,
          pushCookNudge: true,
          quietFromHour: true,
          quietToHour: true,
          timeZone: true,
          householdId: true,
        },
      },
    },
    take: 100,
  });

  let sent = 0;
  for (const job of due) {
    try {
      if (now.getTime() - job.dueAt.getTime() > MAX_LATENESS_MS) {
        await skip(job.id, 'too late to be useful');
        continue;
      }
      if (!job.user.pushCookNudge) {
        await skip(job.id, 'turned off');
        continue;
      }

      // Quiet hours are judged now, against the settings in force now.
      const sendable = nextSendableTime(
        job.dueAt,
        job.user.quietFromHour,
        job.user.quietToHour,
        job.user.timeZone,
      );
      if (sendable.getTime() > now.getTime()) {
        await prisma.scheduledNotification.update({
          where: { id: job.id },
          data: { dueAt: sendable },
        });
        continue;
      }

      const recipe = await prisma.recipe.findFirst({
        where: { id: job.recipeId, householdId: job.user.householdId ?? '' },
        select: { title: true, taste: true, ease: true, cleanup: true },
      });
      if (!recipe) {
        await skip(job.id, 'recipe gone');
        continue;
      }
      // Mirrors isRated() in lib/analytics: any score means they have already
      // told us, and the whole point of the nudge is gone.
      if (recipe.taste > 0 || recipe.ease > 0 || recipe.cleanup > 0) {
        await skip(job.id, 'already rated');
        continue;
      }

      const count = await sendToUser(job.user.id, {
        title: `Did you make ${recipe.title}?`,
        body: 'Tap to rate it while it is fresh in your mind.',
        // ?rate=1 opens the ratings straight away. The whole point of this
        // notification is the rating, so landing on the recipe and making them
        // find it is most of the way to not bothering.
        url: `/recipes/${job.recipeId}?rate=1`,
        tag: `cook-nudge-${job.recipeId}`,
      });
      if (count === 0) {
        await skip(job.id, 'no reachable device');
        continue;
      }
      await prisma.scheduledNotification.update({
        where: { id: job.id },
        data: { sentAt: new Date() },
      });
      sent += 1;
    } catch (err) {
      console.error('[scheduler] job failed', job.id, err);
      await skip(job.id, 'error').catch(() => {});
    }
  }
  return sent;
}

// Module scope is per-process, but Next's dev server re-evaluates modules on
// change — the global guard stops a second interval starting on every reload.
const FLAG = Symbol.for('aftertaste.notification-scheduler');
type Holder = { [FLAG]?: NodeJS.Timeout };

/** Start the polling loop. Safe to call more than once. */
export function startNotificationScheduler(): void {
  const holder = globalThis as unknown as Holder;
  if (holder[FLAG]) return;

  const tick = () => {
    runDueNotifications().catch((err) =>
      console.error('[scheduler] tick failed', err),
    );
  };
  const timer = setInterval(tick, TICK_MS);
  // Never hold the process open just to poll for notifications.
  timer.unref?.();
  holder[FLAG] = timer;
  console.log('[scheduler] notification scheduler started');
}
