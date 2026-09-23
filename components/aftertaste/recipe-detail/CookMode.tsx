'use client';

// The screen you actually cook from.
//
// Different job from the recipe page, so a different layout: big tap targets
// for hands that are wet or floury, one tick per ingredient and per step, and
// nothing else competing for the screen. The wake lock is held for as long as
// it is open, which is the thing the keep-awake setting always wanted to be for.
//
// Opening it is also the clearest signal the app ever gets that someone is
// cooking this — clearer than any amount of time spent staring at the page —
// so it is what queues the "did you make it?" nudge.

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  XIcon,
  CheckIcon,
  RotateCcwIcon,
  UtensilsCrossedIcon,
  TimerIcon,
  BellRingIcon,
} from 'lucide-react';
import { scaleQuantity } from '@/lib/quantity';
import { convertQuantity, convertText, type UnitSystem } from '@/lib/units';
import { isGenericStepTitle } from '@/lib/recipe-parser';
import {
  loadCookProgress,
  saveCookProgress,
  clearCookProgress,
} from '@/lib/cook-session';
import { scheduleCookNudge } from '@/app/(app)/push-actions';
import { useKeepAwake } from '@/lib/keep-awake';
import {
  findDurations,
  formatClock,
  formatDurationLabel,
} from '@/lib/step-timers';
import { useKitchenTimers, type KitchenTimer } from './useKitchenTimers';
import { cn } from '@/lib/utils';
import type { Ingredient, Instruction } from '@/data/sample/recipes';

interface Props {
  recipeId: string;
  title: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  /** Applied to ingredient amounts, so cook mode matches the scaling on the page. */
  multiplier: number;
  /** Measurement system to display in (Settings → Appearance). */
  units: UnitSystem;
  /** False when the user has the did-you-make-it nudge turned off. */
  nudgeEnabled: boolean;
  onClose: () => void;
  onFinish: () => void;
}

const isSection = (x: { section?: string }) => x.section !== undefined;

export function CookMode({
  recipeId,
  title,
  ingredients,
  instructions,
  multiplier,
  units,
  nudgeEnabled,
  onClose,
  onFinish,
}: Props) {
  const [ingChecked, setIngChecked] = useState<Set<number>>(new Set());
  const [stepChecked, setStepChecked] = useState<Set<number>>(new Set());
  // State, not a ref: it has to force a re-render. Both effects below run in
  // the same commit on mount, so a ref would already read `true` while the
  // checked sets were still empty — and the save effect would write that empty
  // state straight over the session it had just loaded.
  const [hydrated, setHydrated] = useState(false);
  // Fixed for the life of the session, so saving doesn't keep moving it.
  const startedAt = useRef(Date.now());

  // Cooking is exactly when the phone must not sleep.
  useKeepAwake(true);
  const { timers, start, dismiss, remaining } = useKitchenTimers();

  useEffect(() => {
    const p = loadCookProgress(recipeId);
    setIngChecked(new Set(p.ingredients));
    setStepChecked(new Set(p.steps));
    startedAt.current = p.startedAt;
    setHydrated(true);
  }, [recipeId]);

  useEffect(() => {
    // Only once the loaded session is actually in state.
    if (!hydrated) return;
    saveCookProgress(recipeId, {
      ingredients: [...ingChecked],
      steps: [...stepChecked],
      startedAt: startedAt.current,
    });
  }, [hydrated, recipeId, ingChecked, stepChecked]);

  // Entering cook mode is the declaration that this is being made tonight.
  useEffect(() => {
    if (!nudgeEnabled) return;
    scheduleCookNudge(recipeId).catch(() => {});
  }, [recipeId, nudgeEnabled]);

  // Escape closes, matching every other overlay in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const realIngredients = useMemo(
    () => ingredients.filter((i) => !isSection(i)).length,
    [ingredients],
  );
  const realSteps = useMemo(
    () => instructions.filter((i) => !isSection(i)).length,
    [instructions],
  );
  const doneCount = ingChecked.size + stepChecked.size;
  const totalCount = realIngredients + realSteps;
  const pct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  // Functional update, not a copy of the current render's Set: ticking several
  // items in quick succession is the normal way to use this, and reading the
  // set from the closure means the second tap overwrites the first.
  const toggle = (
    apply: React.Dispatch<React.SetStateAction<Set<number>>>,
    idx: number,
  ) => {
    apply((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const resetAll = () => {
    setIngChecked(new Set());
    setStepChecked(new Set());
  };

  const finish = () => {
    clearCookProgress(recipeId);
    onFinish();
  };

  let stepNum = 0;

  // Rendered into <body> rather than in place. Cook mode is nested deep in the
  // recipe page, and an ancestor there establishes a stacking context — so its
  // z-index only competed with its own siblings and the bottom tab bar sat on
  // top of the "I'm done" button. A portal is the only reliable way out of
  // that; it also means page scroll position is untouched underneath.
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-950">
      {/* Header — title, progress, and the way out */}
      <div className="flex-shrink-0 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <UtensilsCrossedIcon className="h-5 w-5 flex-shrink-0 text-primary-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-gray-900 dark:text-gray-100">
              {title}
            </p>
            <p className="text-xs text-gray-400">
              {doneCount} of {totalCount} done
            </p>
          </div>
          <button
            type="button"
            onClick={resetAll}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            aria-label="Clear all ticks"
            title="Clear all ticks"
          >
            <RotateCcwIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            aria-label="Close cook mode"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-primary-500 transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Running timers — pinned, because the step that started one is usually
          scrolled away by the time it matters. */}
      {timers.length > 0 && (
        <div className="flex-shrink-0 border-b border-gray-100 px-4 py-2 dark:border-gray-800">
          <div className="mx-auto flex max-w-2xl flex-wrap gap-2">
            {timers.map((t) => (
              <TimerChip
                key={t.id}
                timer={t}
                secondsLeft={remaining(t)}
                onDismiss={() => dismiss(t.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-28">
        <div className="mx-auto max-w-2xl space-y-6">
          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
              Ingredients
            </h2>
            <ul className="space-y-1">
              {ingredients.map((ing, idx) =>
                isSection(ing) ? (
                  <li
                    key={idx}
                    className="pt-3 text-sm font-bold text-gray-900 dark:text-gray-100"
                  >
                    {ing.section}
                  </li>
                ) : (
                  <li key={idx}>
                    <CookRow
                      checked={ingChecked.has(idx)}
                      onToggle={() => toggle(setIngChecked, idx)}
                    >
                      <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">
                        {convertQuantity(
                          scaleQuantity(ing.quantity, multiplier),
                          units,
                        )}
                      </span>{' '}
                      <span className="text-gray-600 dark:text-gray-300">
                        {ing.name}
                      </span>
                    </CookRow>
                  </li>
                ),
              )}
            </ul>
          </section>

          {instructions.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                Steps
              </h2>
              <ul className="space-y-1">
                {instructions.map((inst, idx) => {
                  if (isSection(inst)) {
                    stepNum = 0;
                    return (
                      <li
                        key={idx}
                        className="pt-3 text-sm font-bold text-gray-900 dark:text-gray-100"
                      >
                        {inst.section}
                      </li>
                    );
                  }
                  stepNum += 1;
                  const n = stepNum;
                  return (
                    <li key={idx}>
                      <CookRow
                        checked={stepChecked.has(idx)}
                        onToggle={() => toggle(setStepChecked, idx)}
                      >
                        <span className="mb-0.5 block text-[11px] font-bold tabular-nums text-primary-500 dark:text-primary-400">
                          Step {String(n).padStart(2, '0')}
                        </span>
                        {!isGenericStepTitle(inst.title) && (
                          <span className="mb-0.5 block text-sm font-bold text-gray-900 dark:text-gray-100">
                            {inst.title}
                          </span>
                        )}
                        <StepText
                          text={convertText(inst.body, units)}
                          onStartTimer={start}
                        />
                      </CookRow>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>

      {/* Finish bar */}
      <div className="absolute inset-x-0 bottom-0 border-t border-gray-100 bg-white/95 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <p className="flex-1 text-xs text-gray-400">
            {pct === 100
              ? 'All done — how was it?'
              : 'Ticks are kept on this device while you cook.'}
          </p>
          <button
            type="button"
            onClick={finish}
            className="h-10 rounded-lg bg-primary-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
          >
            I&apos;m done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Step text with its durations turned into buttons. "Simmer for 20 minutes"
 * already contains a timer; this just makes it tappable.
 *
 * The button sits inside a row that is itself a tick target, so the click has
 * to be stopped from bubbling — otherwise setting a timer would also tick the
 * step off as done.
 */
function StepText({
  text,
  onStartTimer,
}: {
  text: string;
  onStartTimer: (label: string, seconds: number) => void;
}) {
  const durations = findDurations(text);
  if (durations.length === 0) {
    return (
      <span className="block whitespace-pre-wrap text-gray-600 dark:text-gray-300">
        {text}
      </span>
    );
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  durations.forEach((d, i) => {
    if (d.start > cursor) parts.push(text.slice(cursor, d.start));
    parts.push(
      <button
        key={`t-${i}`}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onStartTimer(formatDurationLabel(d.seconds), d.seconds);
        }}
        className="mx-0.5 inline-flex items-center gap-1 rounded-md bg-primary-50 px-1.5 py-0.5 align-baseline text-primary-700 transition-colors hover:bg-primary-100 dark:bg-primary-500/15 dark:text-primary-300 dark:hover:bg-primary-500/25"
        title={`Start a ${formatDurationLabel(d.seconds)} timer`}
      >
        <TimerIcon className="h-3.5 w-3.5" />
        {d.text}
      </button>,
    );
    cursor = d.end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));

  return (
    <span className="block whitespace-pre-wrap text-gray-600 dark:text-gray-300">
      {parts}
    </span>
  );
}

/** One running or finished timer. */
function TimerChip({
  timer,
  secondsLeft,
  onDismiss,
}: {
  timer: KitchenTimer;
  secondsLeft: number;
  onDismiss: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onDismiss}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium tabular-nums transition-colors',
        timer.done
          ? 'animate-pulse bg-primary-500 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
      )}
      title={timer.done ? 'Dismiss' : 'Cancel this timer'}
    >
      {timer.done ? (
        <BellRingIcon className="h-4 w-4" />
      ) : (
        <TimerIcon className="h-4 w-4" />
      )}
      <span>{timer.done ? `${timer.label} done` : formatClock(secondsLeft)}</span>
      <XIcon className="h-3.5 w-3.5 opacity-60" />
    </button>
  );
}

/**
 * One tickable line. The whole row is the target — precision is not available
 * to someone holding a wooden spoon.
 *
 * A div with role="button" rather than a real <button>, because the step text
 * inside it contains timer buttons of its own. Nesting one button in another is
 * invalid HTML and React warns that it breaks hydration; stopPropagation makes
 * it behave, but does not make it legal. Keyboard handling is reinstated by
 * hand since a div does not come with it.
 */
function CookRow({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      aria-pressed={checked}
      className={cn(
        'flex w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors',
        'hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 dark:hover:bg-gray-800/60',
        checked && 'opacity-45',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 transition-colors',
          checked
            ? 'border-primary-500 bg-primary-500 text-white'
            : 'border-gray-300 dark:border-gray-600',
        )}
      >
        {checked && <CheckIcon className="h-4 w-4" strokeWidth={3} />}
      </span>
      <span className={cn('min-w-0 flex-1', checked && 'line-through')}>
        {children}
      </span>
    </div>
  );
}
