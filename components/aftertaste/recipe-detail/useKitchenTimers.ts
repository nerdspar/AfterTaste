'use client';

// Running kitchen timers.
//
// Wall-clock based, not tick-counting: a setInterval that decrements a counter
// drifts, and stops entirely when a phone backgrounds the tab — which is
// precisely when someone has put the phone down and walked away from the hob.
// Each timer stores the instant it should finish, and every render just asks
// how long is left.
//
// When one finishes it does three things, because any one of them can be
// missed: shows it in the UI, sounds a short tone, and raises a system
// notification if the cook has allowed them.

import { useCallback, useEffect, useRef, useState } from 'react';

export interface KitchenTimer {
  id: string;
  /** Which step it came from — "Soften the garlic", or "Step 02". Without it
   *  two running timers are two identical countdowns and you have to guess. */
  name: string;
  /** How long it was set for, e.g. "20 min". */
  label: string;
  /** Epoch ms when it finishes. */
  endsAt: number;
  totalSeconds: number;
  done: boolean;
}

/** A short double beep, synthesised so there's no audio file to ship. */
function beep(): void {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [0, 0.3].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.25);
    });
    // Let the tone finish before tearing the context down.
    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {
    // No audio available — the on-screen alert still lands.
  }
}

/** Raise a system notification for a finished timer, if allowed. */
async function notifyDone(name: string, label: string): Promise<void> {
  try {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker?.getRegistration();
    // Names the step, because the whole point of a notification is arriving
    // when you are not looking at the app.
    const body = `${name} · ${label} — time's up.`;
    // Through the service worker when there is one, so it still shows with the
    // app in the background; otherwise a plain page notification.
    if (reg) {
      await reg.showNotification('Timer finished', {
        body,
        icon: '/app-icon/192',
        tag: `timer-${name}-${label}`,
      });
    } else {
      new Notification('Timer finished', { body });
    }
  } catch {
    // Best effort.
  }
}

export function useKitchenTimers() {
  const [timers, setTimers] = useState<KitchenTimer[]>([]);
  // Forces the once-a-second re-render that moves the countdowns.
  const [, setTick] = useState(0);
  // Which timers have already rung. Under React strict mode the alarm would
  // otherwise sound twice.
  const firedRef = useRef<Set<string>>(new Set());
  // Latest timers, readable from inside the interval without making the
  // interval a dependency of itself and restarting every second.
  const timersRef = useRef<KitchenTimer[]>([]);
  timersRef.current = timers;

  const running = timers.some((t) => !t.done);

  // One interval does both jobs: move the clocks, and notice what has
  // finished. Detection lives here rather than in an effect over `timers`,
  // because time passing does not change `timers` — nothing would re-run.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const now = Date.now();
      const justDone = timersRef.current.filter(
        (t) => !t.done && t.endsAt <= now && !firedRef.current.has(t.id),
      );
      if (justDone.length > 0) {
        // Marked before the effects run, so a re-entrant tick cannot double up.
        for (const t of justDone) firedRef.current.add(t.id);
        beep();
        justDone.forEach((t) => void notifyDone(t.name, t.label));
        setTimers((prev) =>
          prev.map((t) =>
            justDone.some((d) => d.id === t.id) ? { ...t, done: true } : t,
          ),
        );
      }
      setTick((n) => n + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const start = useCallback(
    (name: string, label: string, seconds: number) => {
      const id = `${name}-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setTimers((prev) => [
        ...prev,
        {
          id,
          name,
          label,
          endsAt: Date.now() + seconds * 1000,
          totalSeconds: seconds,
          done: false,
        },
      ]);
    },
    [],
  );

  const dismiss = useCallback((id: string) => {
    firedRef.current.delete(id);
    setTimers((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const remaining = useCallback(
    (t: KitchenTimer) => Math.max(0, Math.round((t.endsAt - Date.now()) / 1000)),
    [],
  );

  return { timers, start, dismiss, remaining };
}
