'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signup, type AuthActionState } from '../actions';

const INITIAL: AuthActionState = {};

const inputClass =
  'w-full h-11 px-3.5 rounded-xl text-sm bg-gray-50 dark:bg-gray-800/60 ' +
  'border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 ' +
  'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 ' +
  'focus:border-primary-500/50 transition-colors';

export function SignupForm({ defaultEmail = '' }: { defaultEmail?: string }) {
  const [state, action, pending] = useActionState(signup, INITIAL);

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Create your account
      </h2>
      <p className="mt-1 mb-5 text-sm text-gray-500 dark:text-gray-400">
        {defaultEmail
          ? 'Accept your invitation and join the household.'
          : 'Start your shared recipe box.'}
      </p>

      <form action={action} className="space-y-4">
        {state.error && (
          <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}

        <div className="space-y-1.5">
          <label
            htmlFor="displayName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Name
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            autoComplete="name"
            className={inputClass}
            placeholder="Alex"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={defaultEmail}
            className={inputClass}
            placeholder="you@example.com"
          />
          {defaultEmail && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Use this address to join the household you were invited to.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className={inputClass}
            placeholder="At least 8 characters"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full h-11 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {pending ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-primary-600 dark:text-primary-400 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
