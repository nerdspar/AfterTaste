import Link from 'next/link';
import { ResetPasswordForm } from './ResetPasswordForm';

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Invalid reset link
        </h2>
        <p className="mt-1 mb-5 text-sm text-gray-500 dark:text-gray-400">
          This link is missing its reset token. Request a new one to continue.
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-primary-500 hover:bg-primary-600 px-4 text-sm font-semibold text-white transition-colors"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
