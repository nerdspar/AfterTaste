'use server';

import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/session';
import { sendHouseholdInviteEmail } from '@/lib/email';
import { resolveOrigin } from '@/lib/url';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface HouseholdMember {
  id: string;
  name: string;
  email: string;
  isOwner: boolean;
  isSelf: boolean;
}

export interface PendingInvite {
  id: string;
  email: string;
  createdAt: number;
}

export interface HouseholdView {
  name: string;
  isOwner: boolean;
  members: HouseholdMember[];
  invites: PendingInvite[];
  // Pending invites addressed to the current user from *other* households.
  invitesForMe: { id: string; householdName: string }[];
}

/** Move a user into a fresh household of their own (used by leave/remove). */
async function moveUserToNewHousehold(userId: string): Promise<void> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true },
  });
  await prisma.$transaction(async (tx) => {
    const hh = await tx.household.create({
      data: {
        name: u?.displayName ? `${u.displayName}'s Household` : 'My Household',
        ownerId: userId,
      },
    });
    await tx.user.update({
      where: { id: userId },
      data: { householdId: hh.id },
    });
  });
}

export async function loadHousehold(): Promise<HouseholdView> {
  const { householdId, userId, email } = await requireSession();

  const [hh, invitesForMe] = await Promise.all([
    prisma.household.findUnique({
      where: { id: householdId },
      include: {
        members: {
          select: { id: true, displayName: true, email: true },
          orderBy: { createdAt: 'asc' },
        },
        invites: {
          where: { status: 'pending' },
          select: { id: true, email: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    }),
    prisma.householdInvite.findMany({
      where: {
        email: email.toLowerCase(),
        status: 'pending',
        householdId: { not: householdId },
      },
      select: { id: true, household: { select: { name: true } } },
    }),
  ]);

  if (!hh) {
    return {
      name: 'My Household',
      isOwner: true,
      members: [],
      invites: [],
      invitesForMe: [],
    };
  }

  return {
    name: hh.name,
    isOwner: hh.ownerId === userId,
    members: hh.members.map((m) => ({
      id: m.id,
      name: m.displayName ?? m.email,
      email: m.email,
      isOwner: m.id === hh.ownerId,
      isSelf: m.id === userId,
    })),
    invites: hh.invites.map((i) => ({
      id: i.id,
      email: i.email,
      createdAt: i.createdAt.getTime(),
    })),
    invitesForMe: invitesForMe.map((i) => ({
      id: i.id,
      householdName: i.household.name,
    })),
  };
}

export async function renameHousehold(
  name: string,
): Promise<{ error?: string }> {
  const { householdId, userId } = await requireSession();
  const trimmed = name.trim();
  if (!trimmed) return { error: 'Enter a household name.' };
  const hh = await prisma.household.findUnique({
    where: { id: householdId },
    select: { ownerId: true },
  });
  if (!hh || hh.ownerId !== userId) {
    return { error: 'Only the household owner can rename it.' };
  }
  await prisma.household.update({
    where: { id: householdId },
    data: { name: trimmed.slice(0, 60) },
  });
  return {};
}

export async function inviteMember(
  emailRaw: string,
): Promise<{ error?: string; warning?: string }> {
  const { householdId, userId } = await requireSession();
  const email = emailRaw.toLowerCase().trim();
  if (!EMAIL_RE.test(email)) return { error: 'Enter a valid email address.' };

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { householdId: true },
  });
  if (existing?.householdId === householdId) {
    return { error: 'That person is already in your household.' };
  }

  const dup = await prisma.householdInvite.findFirst({
    where: { householdId, email, status: 'pending' },
    select: { id: true },
  });
  if (dup) return { error: 'There is already a pending invite for that email.' };

  await prisma.householdInvite.create({
    data: { householdId, email, invitedById: userId, status: 'pending' },
  });

  // Email the invitee a sign-up link (best effort — the invite is recorded
  // regardless, and they can still be pointed to the app manually).
  try {
    const [household, inviter] = await Promise.all([
      prisma.household.findUnique({
        where: { id: householdId },
        select: { name: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true, email: true },
      }),
    ]);
    const origin = await resolveOrigin();
    await sendHouseholdInviteEmail({
      to: email,
      inviteUrl: `${origin}/signup?email=${encodeURIComponent(email)}`,
      householdName: household?.name ?? 'a household',
      inviterName: inviter?.displayName || inviter?.email || 'A household member',
    });
  } catch (err) {
    // The invite is recorded regardless — surface (and log) the send failure
    // so it isn't silently lost. Common cause: sending from the default
    // onboarding@resend.dev, which only delivers to the Resend account owner.
    console.error('[invite] email send failed:', err);
    return {
      warning:
        "Invite saved, but the email couldn't be sent — check your email (Resend) setup. They can still join by signing up with this email.",
    };
  }

  return {};
}

export async function revokeInvite(inviteId: string): Promise<void> {
  const { householdId } = await requireSession();
  await prisma.householdInvite.deleteMany({
    where: { id: inviteId, householdId },
  });
}

export async function removeMember(
  memberId: string,
): Promise<{ error?: string }> {
  const { householdId, userId } = await requireSession();
  const hh = await prisma.household.findUnique({
    where: { id: householdId },
    select: { ownerId: true },
  });
  if (!hh || hh.ownerId !== userId) {
    return { error: 'Only the household owner can remove members.' };
  }
  if (memberId === userId) return { error: "You can't remove yourself." };
  if (memberId === hh.ownerId) return { error: "You can't remove the owner." };

  // Confirm the target is actually in this household before moving them.
  const target = await prisma.user.findFirst({
    where: { id: memberId, householdId },
    select: { id: true },
  });
  if (!target) return { error: 'That person is no longer in your household.' };

  await moveUserToNewHousehold(memberId);
  return {};
}

export async function leaveHousehold(): Promise<{ error?: string }> {
  const { householdId, userId } = await requireSession();
  const hh = await prisma.household.findUnique({
    where: { id: householdId },
    select: { ownerId: true, _count: { select: { members: true } } },
  });
  if (!hh) return { error: 'Household not found.' };
  if (hh.ownerId === userId) {
    if (hh._count.members > 1) {
      return {
        error:
          'You own this household. Remove the other members first, then you can leave.',
      };
    }
    return { error: "You own this household — there's nothing to leave." };
  }
  await moveUserToNewHousehold(userId);
  return {};
}

export async function acceptInvite(
  inviteId: string,
): Promise<{ error?: string }> {
  const { userId, householdId, email } = await requireSession();
  const invite = await prisma.householdInvite.findUnique({
    where: { id: inviteId },
    select: { id: true, householdId: true, email: true, status: true },
  });
  if (!invite || invite.status !== 'pending') {
    return { error: 'That invite is no longer valid.' };
  }
  if (invite.email.toLowerCase() !== email.toLowerCase()) {
    return { error: 'That invite was for a different email.' };
  }
  if (invite.householdId === householdId) {
    return { error: "You're already in that household." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { householdId: invite.householdId },
    });
    await tx.householdInvite.update({
      where: { id: invite.id },
      data: { status: 'accepted' },
    });
  });
  return {};
}
