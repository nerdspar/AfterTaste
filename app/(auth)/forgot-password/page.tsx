'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { requestPasswordReset, type AuthActionState } from '../actions';

const INITIAL: AuthActionState = {};

const inputClass =
  'w-full h-11 px-3.5 rounded-xl text-sm bg-gray-50 dark:bg-gray-800/60 ' +
  'border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 ' +
  'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 ' +
  'focus:border-primary-500/50 transition-colors';

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(
    requestPasswordReset,
    INITIAL,
  );

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Forgot your password?
      </h2>
      <p className="mt-1 mb-5 text-sm text-gray-500 dark:text-gray-400">
        Enter your email and we&apos;ll send you a link to reset it.
      </p>

      {state.ok ? (
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-3 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          If an account exists for that email, a reset link is on its way. The
          link expires in 1 hour.
        </div>
      ) : (
        <form action={action} className="space-y-4">
          {state.error && (
            <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {state.error}
            </p>
          )}

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
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full h-11 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {pending ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}

      <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
        <Link
          href="/login"
          className="font-medium text-primary-600 dark:text-primary-400 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
