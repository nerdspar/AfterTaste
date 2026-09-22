// What the app actually sends, and to whom.
//
// Kept apart from lib/push-server (the transport) and from the mutations that
// trigger it, so the rules about who hears about what live in one readable
// place. Every function here swallows its own failures: a notification is
// never worth failing the save that caused it.

import { prisma } from '@/lib/db';
import { sendToUsers, type PushPayload } from '@/lib/push-server';

/**
 * Members of a household who want a given kind of push, excluding the person
 * who caused it — nobody needs telling about their own action.
 */
async function audience(
  householdId: string,
  actorId: string,
  pref: 'pushNewRecipes' | 'pushCookNudge',
): Promise<string[]> {
  const members = await prisma.user.findMany({
    where: { householdId, id: { not: actorId }, [pref]: true },
    select: { id: true },
  });
  return members.map((m) => m.id);
}

/**
 * A recipe was added to the shared box. Sent to the rest of the household.
 *
 * Bulk imports collapse into one notification: someone importing a Crouton
 * export of 200 recipes should not detonate 200 notifications on their
 * partner's phone.
 */
export async function notifyRecipesAdded(
  householdId: string,
  actorId: string,
  titles: string[],
): Promise<void> {
  try {
    if (titles.length === 0) return;
    const userIds = await audience(householdId, actorId, 'pushNewRecipes');
    if (userIds.length === 0) return;

    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { displayName: true, email: true },
    });
    const who = actor?.displayName || actor?.email?.split('@')[0] || 'Someone';

    const payload: PushPayload =
      titles.length === 1
        ? {
            title: 'New recipe',
            body: `${who} added ${titles[0]}`,
            url: '/recipes',
            tag: 'recipe-added',
          }
        : {
            title: 'New recipes',
            body: `${who} added ${titles.length} recipes`,
            url: '/recipes',
            tag: 'recipe-added',
          };
    await sendToUsers(userIds, payload);
  } catch (err) {
    console.error('[push] notifyRecipesAdded failed', err);
  }
}
