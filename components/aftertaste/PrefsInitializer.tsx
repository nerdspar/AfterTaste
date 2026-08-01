'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { applyAccent, getSavedAccentId } from '@/lib/accent';
import { useCurrentUser } from './CurrentUserProvider';

// Reconciles the device-local appearance cache with the account's saved prefs
// ONCE on load (the DB is the source of truth for cross-device sync). It must
// not re-run afterwards, or it would fight the user's own theme toggle —
// next-themes recreates `setTheme` on each change, so keying an effect on it
// would keep snapping the theme back to the stored value.
export function PrefsInitializer() {
  const { accent, theme } = useCurrentUser();
  const { setTheme } = useTheme();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    if (accent && getSavedAccentId() !== accent) applyAccent(accent);
    if (theme) setTheme(theme);
    // Intentionally mount-only — see the comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
