'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCwIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Native-style pull-to-refresh for the installed PWA. As you pull down at the
// top of the page the whole content column moves down, revealing a refresh
// indicator in the gap; the indicator "arms" (fills with the accent colour)
// once you've pulled far enough, so a release only refreshes when it's clearly
// engaged — no accidental refreshes.
//
// Gated to standalone display-mode (installed app), where there's no native
// pull-to-refresh and the web view is kept alive between opens, so users can
// otherwise get stuck on a stale build after a deploy.

const REFRESH_AT = 64; // visual px pulled to arm/trigger
const MAX = 96; // clamp the visual travel
const RESIST = 0.5; // pull resistance (raw px → visual px)

type Phase = 'idle' | 'pull' | 'settle' | 'refresh';

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [offset, setOffset] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const phaseRef = useRef<Phase>('idle');
  const g = useRef({ startY: 0, pulling: false, offset: 0 });

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    // Only in the installed app, and only on touch input.
    if (!standalone || !window.matchMedia('(pointer: coarse)').matches) return;

    const gg = g.current;

    const reload = async () => {
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          await reg?.update();
        }
      } catch {
        // ignore — reload still fetches fresh with the network-first SW
      }
      window.setTimeout(() => window.location.reload(), 500);
    };

    const onStart = (e: TouchEvent) => {
      if (
        phaseRef.current === 'refresh' ||
        window.scrollY > 0 ||
        e.touches.length !== 1
      ) {
        gg.pulling = false;
        return;
      }
      gg.startY = e.touches[0].clientY;
      gg.offset = 0;
      gg.pulling = true;
    };

    const onMove = (e: TouchEvent) => {
      if (!gg.pulling || phaseRef.current === 'refresh') return;
      const dy = e.touches[0].clientY - gg.startY;
      // Pulling up, or the page has scrolled — abandon and snap back.
      if (dy <= 0 || window.scrollY > 0) {
        gg.pulling = false;
        if (gg.offset !== 0) {
          gg.offset = 0;
          setOffset(0);
          setPhaseBoth('settle');
        }
        return;
      }
      const o = Math.min(MAX, dy * RESIST);
      gg.offset = o;
      if (phaseRef.current !== 'pull') setPhaseBoth('pull');
      setOffset(o);
      // Stop the iOS rubber-band / scroll while actively pulling.
      if (dy > 8 && e.cancelable) e.preventDefault();
    };

    const onEnd = () => {
      if (!gg.pulling) return;
      gg.pulling = false;
      if (gg.offset >= REFRESH_AT) {
        setPhaseBoth('refresh');
        setOffset(REFRESH_AT);
        void reload();
      } else if (gg.offset < 2) {
        // Negligible pull — no transform to animate back, so return to idle
        // directly (a 'settle' here would never get a transitionend to close it).
        setOffset(0);
        setPhaseBoth('idle');
      } else {
        setOffset(0);
        setPhaseBoth('settle');
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

  const refreshing = phase === 'refresh';
  const active = phase !== 'idle';
  const armed = offset >= REFRESH_AT;
  const smooth = phase !== 'pull'; // 1:1 while pulling, animate on release

  return (
    <>
      {/* Indicator revealed in the gap as the content moves down. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center md:hidden"
        style={{
          transform: `translateY(${offset - 44}px)`,
          opacity: refreshing || offset > 2 ? 1 : 0,
          transition: smooth
            ? 'transform 0.25s ease, opacity 0.2s ease'
            : 'none',
        }}
      >
        <div className="mt-[env(safe-area-inset-top)]">
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full shadow-md ring-1 transition-colors',
              armed || refreshing
                ? 'bg-primary-500 text-white ring-primary-500/30'
                : 'bg-white text-primary-500 ring-black/5 dark:bg-slate-800 dark:text-primary-400 dark:ring-white/10',
            )}
          >
            <RefreshCwIcon
              className={cn('h-5 w-5', refreshing && 'animate-spin')}
              style={
                refreshing ? undefined : { transform: `rotate(${offset * 3}deg)` }
              }
            />
          </div>
        </div>
      </div>

      {/* The content column: translated down while pulling/refreshing. Kept at
          `none` when idle so it never creates a containing block for the fixed
          modals/sheets rendered inside the page. */}
      <div
        onTransitionEnd={(e) => {
          // Only the wrapper's own transform settling (not a bubbled child
          // transition) closes the gesture.
          if (
            e.target === e.currentTarget &&
            e.propertyName === 'transform' &&
            phaseRef.current === 'settle'
          ) {
            setPhaseBoth('idle');
          }
        }}
        style={{
          transform: active ? `translateY(${offset}px)` : undefined,
          transition: smooth ? 'transform 0.25s ease' : 'none',
          willChange: active ? 'transform' : undefined,
        }}
      >
        {children}
      </div>
    </>
  );
}
