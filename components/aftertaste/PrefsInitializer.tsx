'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { applyAccent, getSavedAccentId } from '@/lib/accent';
import { useCurrentUser } from './CurrentUserProvider';

// Reconciles the device-local appearance cache with the account's saved prefs
// (the DB is the source of truth for cross-device sync). localStorage still
// drives the pre-paint accent/theme so same-device loads don't flash.
export function PrefsInitializer() {
  const { accent, theme } = useCurrentUser();
  const { setTheme } = useTheme();

  useEffect(() => {
    if (accent && getSavedAccentId() !== accent) applyAccent(accent);
  }, [accent]);

  useEffect(() => {
    if (theme) setTheme(theme);
  }, [theme, setTheme]);

  return null;
}
