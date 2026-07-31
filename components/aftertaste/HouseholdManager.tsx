'use client';

import { useCallback, useState } from 'react';
import {
  CrownIcon,
  LogOutIcon,
  MailIcon,
  UserPlusIcon,
  XIcon,
} from 'lucide-react';
import { Avatar } from './Avatar';
import { cn } from '@/lib/utils';
import {
  inviteMember,
  revokeInvite,
  removeMember,
  leaveHousehold,
  renameHousehold,
  acceptInvite,
  type HouseholdView,
} from '@/app/(app)/household-actions';

export function HouseholdManager({
  initialView,
}: {
  initialView: HouseholdView;
}) {
  const [view, setView] = useState<HouseholdView>(initialView);
  const [inviteEmail, setInviteEmail] = useState('');
  const [name, setName] = useState(initialView.name);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Re-fetch after a mutation (event-triggered, so it's reliable).
  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/household', { cache: 'no-store' });
      if (!res.ok) throw new Error(`household ${res.status}`);
      const v: HouseholdView = await res.json();
      setView(v);
      setName(v.name);
    } catch (e) {
      console.error('[household] refresh failed', e);
    }
  }, []);

  const run = async (fn: () => Promise<{ error?: string } | void>) => {
    setError('');
    setBusy(true);
    try {
      const res = await fn();
      if (res && 'error' in res && res.error) {
        setError(res.error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('[household] action failed', e);
      setError('Something went wrong. Try again.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await run(() => inviteMember(inviteEmail));
    if (ok) {
      setInviteEmail('');
      refresh();
    }
  };

  return (
    <div className="space-y-5">
      {error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Invites addressed to me from other households */}
      {view.invitesForMe.map((inv) => (
        <div
          key={inv.id}
          className="flex items-center justify-between gap-3 rounded-lg bg-primary-50 dark:bg-primary-500/10 px-3 py-2.5"
        >
          <p className="text-sm text-gray-700 dark:text-gray-200">
            You&apos;ve been invited to{' '}
            <span className="font-semibold">{inv.householdName}</span>.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              const ok = await run(() => acceptInvite(inv.id));
              if (ok) window.location.assign('/dashboard');
            }}
            className="h-8 px-3 rounded-lg text-xs font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-60"
          >
            Join
          </button>
        </div>
      ))}

      {/* Household name (owner can rename) */}
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Household name
        </p>
        {view.isOwner ? (
          <div className="flex items-center gap-2 max-w-sm">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 h-9 px-3 rounded-lg text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
            <button
              type="button"
              disabled={busy || name.trim() === view.name}
              onClick={async () => {
                const ok = await run(() => renameHousehold(name));
                if (ok) refresh();
              }}
              className="h-9 px-3 rounded-lg text-xs font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
            >
              Save
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">{view.name}</p>
        )}
      </div>

      {/* Members */}
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Members ({view.members.length})
        </p>
        <div className="space-y-1.5">
          {view.members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2"
            >
              <Avatar alt={m.name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex items-center gap-1.5">
                  {m.name}
                  {m.isSelf && (
                    <span className="text-xs font-normal text-gray-400">
                      (you)
                    </span>
                  )}
                  {m.isOwner && (
                    <CrownIcon className="w-3.5 h-3.5 text-amber-500" />
                  )}
                </p>
                <p className="text-xs text-gray-400 truncate">{m.email}</p>
              </div>
              {view.isOwner && !m.isSelf && !m.isOwner && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    const ok = await run(() => removeMember(m.id));
                    if (ok) refresh();
                  }}
                  className="text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pending invites */}
      {view.invites.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Pending invites
          </p>
          <div className="space-y-1.5">
            {view.invites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 px-3 py-2"
              >
                <MailIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <p className="flex-1 min-w-0 text-sm text-gray-600 dark:text-gray-300 truncate">
                  {inv.email}
                </p>
                <button
                  type="button"
                  aria-label={`Revoke invite for ${inv.email}`}
                  disabled={busy}
                  onClick={async () => {
                    await run(() => revokeInvite(inv.id));
                    refresh();
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite form */}
      <form onSubmit={onInvite}>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Invite someone
        </p>
        <div className="flex items-center gap-2 max-w-sm">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="name@example.com"
            className="flex-1 h-9 px-3 rounded-lg text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
          <button
            type="submit"
            disabled={busy || !inviteEmail.trim()}
            className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            <UserPlusIcon className="w-3.5 h-3.5" />
            Invite
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          They join when they sign up with this email (or accept from their
          settings if they already have an account).
        </p>
      </form>

      {/* Leave household */}
      {!view.isOwner && (
        <div className="pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              const ok = await run(() => leaveHousehold());
              if (ok) window.location.assign('/dashboard');
            }}
            className={cn(
              'inline-flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-600 disabled:opacity-50',
            )}
          >
            <LogOutIcon className="w-4 h-4" />
            Leave household
          </button>
        </div>
      )}
    </div>
  );
}
