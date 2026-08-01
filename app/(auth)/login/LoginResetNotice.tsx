'use client';

import { useSearchParams } from 'next/navigation';

/** Shows a confirmation after a successful password reset (?reset=1). */
export function LoginResetNotice() {
  const params = useSearchParams();
  if (params.get('reset') !== '1') return null;
  return (
    <div className="mb-4 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
      Your password has been reset. Sign in with your new password.
    </div>
  );
}
