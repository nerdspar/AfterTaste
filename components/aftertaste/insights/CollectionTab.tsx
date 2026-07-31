'use client';

import Link from 'next/link';
import { Card } from '@/components/aftertaste/Card';
import { computeCollection } from '@/lib/analytics';
import type { Recipe } from '@/data/sample/recipes';

const CATEGORY_COLORS = [
  'bg-primary-500',
  'bg-secondary-500',
  'bg-amber-400',
  'bg-emerald-500',
  'bg-violet-500',
];

export function CollectionTab({ recipes }: { recipes: Recipe[] }) {
  const data = computeCollection(recipes);

  if (data.totalRecipes === 0) {
    return (
      <Card>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-10">
          Add some recipes to see insights about your collection.
        </p>
      </Card>
    );
  }

  const summaryCards = [
    { label: 'Total Recipes', value: String(data.totalRecipes) },
    {
      label: 'Avg. Rating',
      value: data.avgRating !== null ? data.avgRating.toFixed(1) : '—',
    },
    { label: 'Top Category', value: data.topCategory ?? '—' },
    { label: 'Avg. Cook Time', value: `${data.avgCookTime} mins` },
  ];

  const maxSource = Math.max(1, ...data.sourceEntries.map(([, c]) => c));

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
              {card.label}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums truncate">
              {card.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Category distribution */}
        <Card className="h-full flex flex-col">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">
            Category Distribution
          </h2>
          {/* flex-1 + justify-between spreads the bars to fill the card height;
              gap-4 keeps sensible spacing when the card is short (mobile). */}
          <div className="flex-1 flex flex-col justify-between gap-4">
            {data.categoryEntries.map(([cat, count], i) => (
              <Link
                key={cat}
                href={`/recipes?tab=${encodeURIComponent(cat)}`}
                title={`View ${cat} recipes`}
                className="flex items-center gap-3 rounded-lg hover:opacity-80 transition-opacity"
              >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-20 flex-shrink-0 truncate">
                  {cat}
                </span>
                <div className="flex-1 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                  <div
                    className={`h-full rounded-lg ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}`}
                    style={{
                      width: `${(count / data.totalRecipes) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400 w-6 text-right tabular-nums flex-shrink-0">
                  {count}
                </span>
              </Link>
            ))}
          </div>
        </Card>

        {/* Recipe sources */}
        <Card>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">
            Recipe Sources
          </h2>
          <div className="space-y-3">
            {data.sourceEntries.map(([source, count]) => (
              <Link
                key={source}
                href={`/recipes?source=${encodeURIComponent(source)}`}
                title={`View ${source} recipes`}
                className="block rounded-lg hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {source}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                    {count}
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary-500 rounded-full transition-all"
                    style={{ width: `${(count / maxSource) * 100}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top cuisines — click to filter recipes */}
        <Card>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">
            Top Cuisines
          </h2>
          {data.cuisineEntries.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-2">
              No cuisines yet.
            </p>
          ) : (
            <div className="space-y-1">
              {data.cuisineEntries.map(([cuisine, count], i) => (
                <Link
                  key={cuisine}
                  href={`/recipes?cuisine=${encodeURIComponent(cuisine)}`}
                  className="flex items-center gap-3 h-9 px-1 -mx-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <span className="text-sm font-bold text-gray-300 dark:text-gray-600 w-5 text-right tabular-nums flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1 truncate">
                    {cuisine}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums flex-shrink-0">
                    {count} {count === 1 ? 'recipe' : 'recipes'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Calorie overview */}
        <Card>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">
            Calorie Overview
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Total across all recipes
              </span>
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                {data.totalCalories.toLocaleString()} kcal
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Average per recipe
              </span>
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                {Math.round(data.totalCalories / data.totalRecipes)} kcal
              </span>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mt-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                By category
              </p>
              {data.categoryAvgCalories.map(({ category, avg }) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {category}
                  </span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 tabular-nums">
                    {avg} kcal avg
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
