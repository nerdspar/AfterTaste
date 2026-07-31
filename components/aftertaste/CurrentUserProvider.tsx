'use client';

import { createContext, useContext } from 'react';

export interface CurrentUser {
  id: string;
  name: string;
  displayName: string;
  email: string;
  image: string | null;
  accent: string;
  theme: string;
  units: string;
}

const CurrentUserContext = createContext<CurrentUser | null>(null);

export function CurrentUserProvider({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  return (
    <CurrentUserContext.Provider value={user}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUser {
  const ctx = useContext(CurrentUserContext);
  if (!ctx)
    throw new Error('useCurrentUser must be used within CurrentUserProvider');
  return ctx;
}

/** The user's first name, falling back to a friendly default. */
export function useFirstName(): string {
  const { name } = useCurrentUser();
  return name.split(' ')[0] || name || 'there';
}
