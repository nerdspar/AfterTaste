'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCwIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Custom pull-to-refresh for the installed PWA. In standalone mode iOS/Android
// give no native pull-to-refresh and keep the web view alive between opens, so
// users can get stuck on a stale build after a deploy. This lets them pull down
// at the top of the page to reload (which, with the network-first service
// worker, fetches the freshly deployed HTML + chunks).
//
// Gated to standalone display mode so it never double-triggers with a normal
// mobile browser's own pull-to-refresh.

const TRIGGER = 70; // raw px pulled to trigger a refresh
const MAX = 120; // clamp the visual travel

export function PullToRefresh() {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Refs so the (once-attached) listeners read live values without re-binding.
  const gesture = useRef({ startY: 0, pulling: false, dy: 0 });
  const refreshingRef = useRef(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    // Only in the installed app, and only on touch input.
    if (!standalone || !window.matchMedia('(pointer: coarse)').matches) return;

    const g = gesture.current;

    const doRefresh = async () => {
      refreshingRef.current = true;
      setRefreshing(true);
      setDragging(false);
      setOffset(MAX * 0.5);
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          await reg?.update();
        }
      } catch {
        // ignore — reload still fetches fresh with the network-first SW
      }
      // Let the spinner show briefly, then reload.
      window.setTimeout(() => window.location.reload(), 450);
    };

    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current || window.scrollY > 0 || e.touches.length !== 1) {
        g.pulling = false;
        return;
      }
      g.startY = e.touches[0].clientY;
      g.dy = 0;
      g.pulling = true;
    };

    const onMove = (e: TouchEvent) => {
      if (!g.pulling || refreshingRef.current) return;
      const dy = e.touches[0].clientY - g.startY;
      // Pulling up, or the page has scrolled — abandon the gesture.
      if (dy <= 0 || window.scrollY > 0) {
        g.pulling = false;
        setDragging(false);
        setOffset(0);
        return;
      }
      g.dy = dy;
      setDragging(true);
      // Resistance: the pull gets progressively harder.
      setOffset(Math.min(MAX, dy * 0.6));
      // Stop the iOS rubber-band / scroll while actively pulling.
      if (dy > 8 && e.cancelable) e.preventDefault();
    };

    const onEnd = () => {
      if (!g.pulling) return;
      g.pulling = false;
      if (g.dy >= TRIGGER) {
        void doRefresh();
      } else {
        setDragging(false);
        setOffset(0);
      }
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  const visible = offset > 2 || refreshing;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center md:hidden"
      style={{
        transform: `translateY(${Math.max(0, offset - 16)}px)`,
        opacity: visible ? Math.min(1, offset / 40) || 1 : 0,
        transition: dragging ? 'none' : 'transform 0.2s ease, opacity 0.2s ease',
      }}
    >
      <div className="mt-[env(safe-area-inset-top)] flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10">
        <RefreshCwIcon
          className={cn('h-5 w-5 text-primary-500', refreshing && 'animate-spin')}
          style={
            refreshing ? undefined : { transform: `rotate(${offset * 2.5}deg)` }
          }
        />
      </div>
    </div>
  );
}
