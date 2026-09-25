'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronDownIcon,
  CheckIcon,
  ListPlusIcon,
  XIcon,
  PlusIcon,
  MinusIcon,
} from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { IngredientIcon } from '../IngredientIcon';
import { useGroceryStore } from '../GroceryStoreProvider';
import { guessGroceryCategory } from '@/lib/grocery-category';
import { scaleQuantity } from '@/lib/quantity';
import { convertQuantity, type UnitSystem } from '@/lib/units';
import type { Ingredient } from '@/data/sample/recipes';

type ScaleMode = 'amount' | 'serving';

// The amounts people actually scale by. Values are exact so scaleQuantity's
// own fraction formatting lands on clean amounts rather than decimals.
const MULTIPLIERS: { label: string; value: number }[] = [
  { label: '¼', value: 0.25 },
  { label: '⅓', value: 1 / 3 },
  { label: '½', value: 0.5 },
  { label: '⅔', value: 2 / 3 },
  { label: '¾', value: 0.75 },
  { label: '1', value: 1 },
  { label: '1½', value: 1.5 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
  { label: '5', value: 5 },
];

/** Close enough to count as that preset — thirds are never exact. */
const isSameMultiplier = (a: number, b: number) => Math.abs(a - b) < 0.005;

/**
 * Whatever was typed into Custom. Accepts a decimal or a fraction, because
 * someone scaling a recipe by an eighth is more likely to write "1/8" than
 * "0.125".
 */
function parseMultiplier(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const d = Number(mixed[3]);
    return d ? Number(mixed[1]) + Number(mixed[2]) / d : null;
  }
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    const d = Number(frac[2]);
    return d ? Number(frac[1]) / d : null;
  }
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** A −/+ button for the servings stepper. */
function StepButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
        'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100',
        'dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-800',
        'disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-gray-900',
      )}
    >
      {children}
    </button>
  );
}

/** True when an item is a section header (a divider) rather than an ingredient. */
function isIngredientSection(ing: Ingredient): boolean {
  return ing.section !== undefined;
}

interface IngredientsPanelProps {
  ingredients: Ingredient[];
  baseServings: number;
  scaleMode: ScaleMode;
  scaleValue: number;
  onScaleModeChange: (mode: ScaleMode) => void;
  onScaleValueChange: (value: number) => void;
  recipeId: string;
  recipeTitle: string;
  /** Measurement system to display in (Settings → Appearance). */
  units: UnitSystem;
}

export function IngredientsPanel({
  ingredients,
  baseServings,
  scaleMode,
  scaleValue,
  onScaleModeChange,
  onScaleValueChange,
  recipeId,
  recipeTitle,
  units,
}: IngredientsPanelProps) {
  const multiplier =
    scaleMode === 'amount' ? scaleValue : scaleValue / baseServings;

  const currentServings =
    scaleMode === 'amount'
      ? Math.round(baseServings * scaleValue)
      : Math.round(scaleValue);

  const sliderMin = scaleMode === 'amount' ? 0.5 : 1;
  const sliderMax = scaleMode === 'amount' ? 8 : baseServings * 8;
  const sliderStep = scaleMode === 'amount' ? 0.5 : 1;

  const [scaleOpen, setScaleOpen] = useState(false);

  // The servings field is text, not a number input, so it can be empty mid-edit
  // — see the input below. It follows the real value whenever that changes from
  // elsewhere (a multiplier chip, the stepper).
  const [servingsDraft, setServingsDraft] = useState(String(currentServings));
  useEffect(() => {
    setServingsDraft(String(currentServings));
  }, [currentServings]);

  // Custom is open either because the cook asked for it, or because the
  // current multiplier is not one of the presets — arriving at 1.25 via the
  // servings stepper should not leave every chip looking unselected with no
  // explanation of what the recipe is actually scaled to.
  const matchesPreset = MULTIPLIERS.some((m) =>
    isSameMultiplier(multiplier, m.value),
  );
  const [customOpen, setCustomOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState('');
  const customActive = customOpen || !matchesPreset;

  const commitCustom = () => {
    const n = parseMultiplier(customDraft);
    if (n === null) {
      setCustomDraft('');
      return;
    }
    onScaleModeChange('amount');
    onScaleValueChange(Math.min(50, Math.max(0.05, n)));
  };

  const setServings = (n: number) => {
    onScaleModeChange('serving');
    onScaleValueChange(Math.min(999, Math.max(1, Math.round(n))));
  };

  /** Take what was typed, or put the real value back if it was nonsense. */
  const commitServings = () => {
    const n = Math.round(Number(servingsDraft.trim()));
    if (!servingsDraft.trim() || !Number.isFinite(n) || n < 1) {
      setServingsDraft(String(currentServings));
      return;
    }
    setServings(n);
  };

  const { addItems } = useGroceryStore();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);

  // Section headers are not selectable — grocery actions apply to real
  // ingredients only.
  const realIngredientIndices = ingredients
    .map((ing, i) => (isIngredientSection(ing) ? -1 : i))
    .filter((i) => i >= 0);

  const allSelected =
    realIngredientIndices.length > 0 &&
    selected.size === realIngredientIndices.length;

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 2500);
    return () => clearTimeout(t);
  }, [feedback]);

  function enterSelectMode() {
    setScaleOpen(false);
    setSelected(new Set(realIngredientIndices));
    setSelectMode(true);
  }

  function enterSelectModeWith(index: number) {
    setScaleOpen(false);
    setSelected(new Set([index]));
    setSelectMode(true);
  }

  function cancelSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  function toggleSelected(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === realIngredientIndices.length
        ? new Set()
        : new Set(realIngredientIndices),
    );
  }

  function confirmAdd() {
    const chosen = ingredients.filter(
      (ing, i) => selected.has(i) && !isIngredientSection(ing),
    );
    const added = addItems(
      chosen.map((ing) => ({
        name: ing.name,
        quantity: convertQuantity(scaleQuantity(ing.quantity, multiplier), units),
        category: guessGroceryCategory(ing.name),
        recipeId,
        recipeTitle,
      })),
    );
    setFeedback(
      added > 0
        ? `Added ${added} ${added === 1 ? 'item' : 'items'} to grocery list`
        : 'Already on your grocery list',
    );
    cancelSelectMode();
  }

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
          {selectMode ? 'Add to grocery list' : 'Ingredients'}
        </h3>
        {selectMode ? (
          <IconButton
            aria-label="Cancel selection"
            size="sm"
            onClick={cancelSelectMode}
          >
            <XIcon className="w-[18px] h-[18px]" />
          </IconButton>
        ) : (
          <div className="flex items-center gap-1.5">
            {ingredients.length > 0 && (
              <IconButton
                aria-label="Add ingredients to grocery list"
                size="sm"
                onClick={enterSelectMode}
              >
                <ListPlusIcon className="w-[18px] h-[18px]" />
              </IconButton>
            )}
            <button
              type="button"
              onClick={() => setScaleOpen((o) => !o)}
              className={cn(
                'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                'border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100',
                'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
              )}
            >
              <span className="tabular-nums">
                {currentServings}{' '}
                {currentServings === 1 ? 'serving' : 'servings'}
              </span>
              <ChevronDownIcon
                className={cn(
                  'w-3.5 h-3.5 transition-transform duration-200',
                  scaleOpen && 'rotate-180',
                )}
              />
            </button>
          </div>
        )}
      </div>

      {/* Select-all toolbar */}
      {selectMode && (
        <div className="flex items-center justify-between mb-2 px-1">
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
          <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
            {selected.size} selected
          </span>
        </div>
      )}

      {/* Collapsible scale section */}
      <div
        className={cn(
          'grid transition-all duration-200 ease-in-out',
          scaleOpen ? 'grid-rows-[1fr] opacity-100 mb-4' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              'rounded-xl border border-gray-200 bg-gray-50 p-3',
              'dark:border-gray-700/40 dark:bg-gray-800/40',
            )}
          >
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Scale
            </p>

            {/* Quick multipliers. These replaced a slider that ran from 0.5 in
                steps of 0.5 — it simply could not express a quarter, which is
                a normal thing to want. Fractions are what cooks actually scale
                in, so they are the control rather than a continuous range. */}
            <div className="flex flex-wrap gap-1.5">
              {MULTIPLIERS.map(({ label, value }) => {
                const active = Math.abs(multiplier - value) < 0.005;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      onScaleModeChange('amount');
                      onScaleValueChange(value);
                    }}
                    aria-pressed={active}
                    className={cn(
                      'h-9 min-w-[2.5rem] rounded-full px-3 text-sm font-medium tabular-nums transition-colors',
                      active
                        ? 'bg-primary-500 text-white'
                        : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-800',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setCustomDraft(
                    matchesPreset ? '' : String(Number(multiplier.toFixed(3))),
                  );
                  setCustomOpen((o) => !o);
                }}
                aria-pressed={customActive}
                className={cn(
                  'h-9 rounded-full px-3 text-sm font-medium transition-colors',
                  customActive
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-800',
                )}
              >
                Custom
              </button>
            </div>

            {customActive && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  autoFocus={customOpen}
                  aria-label="Custom multiplier"
                  placeholder="e.g. 2.5 or 1/8"
                  value={customDraft}
                  onChange={(e) => setCustomDraft(e.target.value)}
                  onBlur={commitCustom}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                  className={cn(
                    'w-32 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm tabular-nums',
                    'dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500/30',
                  )}
                />
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  × the recipe
                </span>
              </div>
            )}

            {/* ...or say how many servings you want, and let the multiplier
                follow. Both controls drive the same number from either end. */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Servings
              </span>
              <div className="flex items-center gap-1">
                <StepButton
                  label="One fewer serving"
                  disabled={currentServings <= 1}
                  onClick={() => setServings(currentServings - 1)}
                >
                  <MinusIcon className="h-4 w-4" />
                </StepButton>
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label="Servings"
                  value={servingsDraft}
                  // Held as text while editing so the field can be empty. Bound
                  // straight to a number it rejects its own cleared state, and
                  // the only way to change it is to select the digits first —
                  // which is what made this annoying to use on a phone.
                  onChange={(e) => setServingsDraft(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onBlur={commitServings}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                  className={cn(
                    'w-14 rounded-lg border border-gray-200 bg-white py-1.5 text-center text-sm tabular-nums',
                    'dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500/30',
                  )}
                />
                <StepButton
                  label="One more serving"
                  onClick={() => setServings(currentServings + 1)}
                >
                  <PlusIcon className="h-4 w-4" />
                </StepButton>
              </div>
              {multiplier !== 1 && (
                <button
                  type="button"
                  onClick={() => {
                    onScaleModeChange('amount');
                    onScaleValueChange(1);
                  }}
                  className="ml-auto text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ingredient rows. Group by section header (keeping each item's original
          index for selection). Two or more sections lay out as side-by-side
          columns; a single/no section flows its items across two columns. */}
      {(() => {
        const groups: {
          header: string | null;
          items: { ing: Ingredient; i: number }[];
        }[] = [];
        ingredients.forEach((ing, i) => {
          if (isIngredientSection(ing)) {
            groups.push({ header: ing.section ?? '', items: [] });
          } else {
            if (groups.length === 0) groups.push({ header: null, items: [] });
            groups[groups.length - 1].items.push({ ing, i });
          }
        });
        const sectionCount = groups.filter((g) => g.header).length;

        const renderRow = ({ ing, i }: { ing: Ingredient; i: number }) => {
          const isSelected = selected.has(i);
          const content = (
            <>
              {selectMode ? (
                <span
                  className={cn(
                    'w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                    isSelected
                      ? 'bg-primary-500 border-primary-500'
                      : 'border-gray-300 dark:border-gray-600',
                  )}
                >
                  {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                </span>
              ) : (
                <IngredientIcon
                  name={ing.name}
                  className="w-7 h-7 mt-0.5 flex-shrink-0 border border-gray-100 dark:border-gray-700"
                />
              )}
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1 min-w-0 text-left leading-snug">
                {ing.name}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums flex-shrink-0 mt-0.5 pl-2 text-right min-w-[3rem]">
                {convertQuantity(scaleQuantity(ing.quantity, multiplier), units)}
              </span>
            </>
          );
          return (
            <button
              key={i}
              type="button"
              onClick={() =>
                selectMode ? toggleSelected(i) : enterSelectModeWith(i)
              }
              title={selectMode ? undefined : 'Add to grocery list'}
              className="flex w-full items-start gap-3 py-2 px-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
            >
              {content}
            </button>
          );
        };

        const sectionHeader = (text: string) => (
          <p className="mb-1 px-1 text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {text}
          </p>
        );

        // Multiple sections → each section is its own column.
        if (sectionCount >= 2) {
          return (
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              {groups.map((g, gi) => (
                <div key={gi}>
                  {g.header && sectionHeader(g.header)}
                  <div className="space-y-1">{g.items.map(renderRow)}</div>
                </div>
              ))}
            </div>
          );
        }

        // Single (or no) section → flow the items across two columns.
        const only = groups[0];
        return (
          <div>
            {only?.header && sectionHeader(only.header)}
            <div className="sm:columns-2 sm:gap-x-6">
              {(only?.items ?? []).map((it) => (
                <div key={it.i} className="break-inside-avoid">
                  {renderRow(it)}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Add to grocery list footer */}
      {selectMode && (
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
          <Button
            type="button"
            variant="primary"
            size="md"
            fullWidth
            onClick={confirmAdd}
            disabled={selected.size === 0}
          >
            <ListPlusIcon className="w-4 h-4" />
            Add {selected.size > 0 ? selected.size : ''} to grocery list
          </Button>
        </div>
      )}

      {/* Confirmation */}
      {feedback && !selectMode && (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <CheckIcon className="w-3.5 h-3.5" />
          {feedback}
        </div>
      )}
    </Card>
  );
}
