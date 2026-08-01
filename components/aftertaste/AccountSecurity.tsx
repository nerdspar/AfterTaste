'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { changeEmail, changePassword } from '@/app/(app)/account-actions';

const inputClass =
  'w-full h-9 px-3 rounded-lg text-sm bg-gray-50 dark:bg-gray-800/60 ' +
  'border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 ' +
  'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30';

function Feedback({ error, ok }: { error: string; ok: string }) {
  if (error)
    return <p className="text-xs text-red-500">{error}</p>;
  if (ok)
    return <p className="text-xs text-emerald-600 dark:text-emerald-400">{ok}</p>;
  return null;
}

export function AccountSecurity() {
  const router = useRouter();

  // Change email
  const [newEmail, setNewEmail] = useState('');
  const [emailPw, setEmailPw] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [emailOk, setEmailOk] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);

  // Change password
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [pwOk, setPwOk] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  const onEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailErr('');
    setEmailOk('');
    setEmailBusy(true);
    try {
      const res = await changeEmail({
        newEmail,
        currentPassword: emailPw,
      });
      if (res.error) setEmailErr(res.error);
      else {
        setEmailOk('Email updated.');
        setNewEmail('');
        setEmailPw('');
        router.refresh(); // reflect the new email in the profile
      }
    } catch {
      setEmailErr('Something went wrong. Try again.');
    } finally {
      setEmailBusy(false);
    }
  };

  const onPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwErr('');
    setPwOk('');
    if (newPw !== confirmPw) {
      setPwErr('New passwords do not match.');
      return;
    }
    setPwBusy(true);
    try {
      const res = await changePassword({
        currentPassword: curPw,
        newPassword: newPw,
      });
      if (res.error) setPwErr(res.error);
      else {
        setPwOk('Password updated.');
        setCurPw('');
        setNewPw('');
        setConfirmPw('');
      }
    } catch {
      setPwErr('Something went wrong. Try again.');
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {/* Change email */}
      <form onSubmit={onEmail} className="py-4 first:pt-0 space-y-2 max-w-sm">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Change email
        </p>
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="New email"
          autoComplete="email"
          required
          className={inputClass}
        />
        <input
          type="password"
          value={emailPw}
          onChange={(e) => setEmailPw(e.target.value)}
          placeholder="Current password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={emailBusy || !newEmail || !emailPw}
            className="h-8 px-3 rounded-lg text-xs font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            {emailBusy ? 'Saving…' : 'Update email'}
          </button>
          <Feedback error={emailErr} ok={emailOk} />
        </div>
      </form>

      {/* Change password */}
      <form onSubmit={onPassword} className="py-4 last:pb-0 space-y-2 max-w-sm">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Change password
        </p>
        <input
          type="password"
          value={curPw}
          onChange={(e) => setCurPw(e.target.value)}
          placeholder="Current password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
        <input
          type="password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          placeholder="New password (min 8 characters)"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
        />
        <input
          type="password"
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          placeholder="Confirm new password"
          autoComplete="new-password"
          required
          className={inputClass}
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pwBusy || !curPw || !newPw || !confirmPw}
            className="h-8 px-3 rounded-lg text-xs font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            {pwBusy ? 'Saving…' : 'Update password'}
          </button>
          <Feedback error={pwErr} ok={pwOk} />
        </div>
      </form>
    </div>
  );
}
