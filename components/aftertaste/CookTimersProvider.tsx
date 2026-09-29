'use client';

// Kitchen timers, held above the page so they outlive it.
//
// They used to live inside cook mode, which meant leaving that screen — a
// mis-swipe, or stepping into another recipe to check something — silently
// cancelled every one of them. Mounted here in the app layout they keep
// running across navigation, and because each stores the instant it ends
// rather than a countdown, they survive a full reload with the right time
// left on them.
//
// A timer knows which recipe it came from, so one still ticking while you are
// somewhere else can say what it belongs to.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  loadTimers,
  saveTimers,
  type StoredTimer,
} from '@/lib/cook-session';

export type KitchenTimer = StoredTimer;

interface Ctx {
  timers: KitchenTimer[];
  start: (t: {
    name: string;
    label: string;
    seconds: number;
    recipeId: string;
    recipeTitle: string;
  }) => void;
  dismiss: (id: string) => void;
  /** Seconds left, floored at zero. */
  remaining: (t: KitchenTimer) => number;
  /** Cook mode tells us it is on screen, so the floating bar can stay out of
   *  its way — in there the timers already have their own strip. */
  cookModeOpen: boolean;
  setCookModeOpen: (open: boolean) => void;
}

const CookTimersContext = createContext<Ctx | null>(null);

/** A short double beep, synthesised so there's no audio file to ship. */
function beep(): void {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
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
    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {
    // No audio available — the on-screen alert still lands.
  }
}

async function notifyDone(t: KitchenTimer): Promise<void> {
  try {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker?.getRegistration();
    // Names the recipe as well as the step: by the time this arrives you may
    // be looking at something else entirely.
    const body = `${t.recipeTitle} · ${t.name} · ${t.label} — time's up.`;
    if (reg) {
      await reg.showNotification('Timer finished', {
        body,
        icon: '/app-icon/192',
        tag: `timer-${t.id}`,
        data: { url: `/recipes/${t.recipeId}` },
      });
    } else {
      new Notification('Timer finished', { body });
    }
  } catch {
    // Best effort.
  }
}

export function CookTimersProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [timers, setTimers] = useState<KitchenTimer[]>([]);
  const [cookModeOpen, setCookModeOpen] = useState(false);
  const [, setTick] = useState(0);
  const firedRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<KitchenTimer[]>([]);
  timersRef.current = timers;
  const hydrated = useRef(false);

  // Restore whatever was still running. Anything that rang while the app was
  // closed comes back marked done and pre-registered as fired, so re-opening
  // the app doesn't set off an alarm for something that finished an hour ago.
  useEffect(() => {
    const restored = loadTimers();
    for (const t of restored) if (t.done) firedRef.current.add(t.id);
    setTimers(restored);
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    saveTimers(timers);
  }, [timers]);

  const running = timers.some((t) => !t.done);

  // One interval moves every clock and notices what has finished. Detection
  // lives here rather than in an effect over `timers`, because time passing
  // does not change `timers` — nothing would re-run.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const now = Date.now();
      const justDone = timersRef.current.filter(
        (t) => !t.done && t.endsAt <= now && !firedRef.current.has(t.id),
      );
      if (justDone.length > 0) {
        for (const t of justDone) firedRef.current.add(t.id);
        beep();
        justDone.forEach((t) => void notifyDone(t));
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

  const start = useCallback<Ctx['start']>(
    ({ name, label, seconds, recipeId, recipeTitle }) => {
      const id = `${recipeId}-${name}-${label}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`;
      setTimers((prev) => [
        ...prev,
        {
          id,
          name,
          label,
          recipeId,
          recipeTitle,
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

  return (
    <CookTimersContext.Provider
      value={{ timers, start, dismiss, remaining, cookModeOpen, setCookModeOpen }}
    >
      {children}
    </CookTimersContext.Provider>
  );
}

export function useCookTimers(): Ctx {
  const ctx = useContext(CookTimersContext);
  if (!ctx) {
    throw new Error('useCookTimers must be used inside CookTimersProvider');
  }
  return ctx;
}
