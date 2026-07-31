'use client';

import { useEffect } from 'react';
import { hydrateRecentlyViewed } from '@/lib/recently-viewed';

// Seeds the client-side recently-viewed store from the server's per-user
// history on first load. Renders nothing.
export function RecentlyViewedHydrator({ ids }: { ids: string[] }) {
  useEffect(() => {
    hydrateRecentlyViewed(ids);
    // Only on mount — later views are recorded imperatively.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
