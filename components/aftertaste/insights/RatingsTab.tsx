'use client';

import Link from 'next/link';
import { Card } from '@/components/aftertaste/Card';
import { cn } from '@/lib/utils';
import { computeScoring } from '@/lib/analytics';
import type { Recipe } from '@/data/sample/recipes';

function ScoreBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
          {value.toFixed(1)}/{max}
        </span>
      </div>
      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            pct >= 80
              ? 'bg-emerald-500'
              : pct >= 60
                ? 'bg-amber-400'
                : 'bg-red-400',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function RatingsTab({ recipes }: { recipes: Recipe[] }) {
  const data = computeScoring(recipes);

  if (data.total === 0) {
    return (
      <Card>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-10">
          Add some recipes to see your ratings and scores.
        </p>
      </Card>
    );
  }

  const summaryCards = [
    {
      label: 'Avg Rating',
      value: data.avgRating !== null ? data.avgRating.toFixed(1) : '—',
      sub: `${data.ratedCount} of ${data.total} rated`,
    },
    {
      label: 'Recipes Rated',
      value: `${data.ratedCount}/${data.total}`,
      sub:
        data.ratedCount === data.total ? 'All rated!' : 'Keep rating',
    },
    {
      label: 'Total Times Remade',
      value: String(data.totalRemade),
      sub: `across ${data.total} recipes`,
    },
    {
      label: 'Would Make Again',
      value: data.makeAgainPct !== null ? `${data.makeAgainPct}%` : '—',
      sub:
        data.makeAgainDecided > 0
          ? `${data.makeAgainCount} of ${data.makeAgainDecided} decided`
          : 'Not set yet',
    },
  ];

  const maxBucket = Math.max(1, ...data.ratingBuckets.map((b) => b.count));

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
              {card.label}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
              {card.value}
            </p>
            <p className="text-xs text-primary-500 dark:text-primary-400 mt-0.5">
              {card.sub}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Average scores */}
        <Card>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">
            Average Scores
          </h2>
          {data.ratedCount === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-2">
              Rate a few recipes to see your averages.
            </p>
          ) : (
            <div className="space-y-4">
              <ScoreBar label="Ease" value={data.avgEase} max={5} />
              <ScoreBar label="Taste" value={data.avgTaste} max={5} />
              <ScoreBar label="Cleanup" value={data.avgCleanup} max={5} />
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Avg Cook Time
              </span>
              <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                {data.avgCookTime} min
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Avg Cost
              </span>
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {data.avgCost !== null ? (
                  <>
                    {'$'.repeat(Math.max(1, Math.round(data.avgCost)))}
                    <span className="ml-1 text-xs font-normal text-gray-400 dark:text-gray-500">
                      ({data.avgCost.toFixed(1)})
                    </span>
                  </>
                ) : (
                  '—'
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Quick Meals (≤30 min)
              </span>
              <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                {data.quickCount}
              </span>
            </div>
          </div>
        </Card>

        {/* Rating distribution */}
        <Card>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">
            Rating Distribution
          </h2>
          {data.ratedCount === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-2">
              Rate recipes to see how your scores are spread out.
            </p>
          ) : (
            <div className="space-y-2.5">
              {[...data.ratingBuckets].reverse().map((bucket) => {
                const content = (
                  <>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-8 flex-shrink-0 tabular-nums">
                      {bucket.star}★
                    </span>
                    <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-lg transition-all"
                        style={{ width: `${(bucket.count / maxBucket) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums w-6 text-right flex-shrink-0">
                      {bucket.count}
                    </span>
                  </>
                );
                return bucket.count > 0 ? (
                  <Link
                    key={bucket.star}
                    href={`/recipes?rating=${bucket.star}`}
                    title={`View ${bucket.star}-star recipes`}
                    className="flex items-center gap-3 rounded-lg hover:opacity-80 transition-opacity"
                  >
                    {content}
                  </Link>
                ) : (
                  <div
                    key={bucket.star}
                    className="flex items-center gap-3 opacity-60"
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Highest scored */}
        <Card>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">
            Highest Scored Recipes
          </h2>
          {data.topScored.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-2">
              No rated recipes yet.
            </p>
          ) : (
            <div className="space-y-1">
              {data.topScored.map((recipe, i) => (
                <Link
                  key={recipe.id}
                  href={`/recipes/${recipe.id}`}
                  className="flex items-center gap-3 h-9 px-1 -mx-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <span className="text-sm font-bold text-gray-300 dark:text-gray-600 w-5 text-right tabular-nums flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1 truncate">
                    {recipe.title}
                  </span>
                  <span className="text-xs font-semibold text-primary-500 tabular-nums flex-shrink-0">
                    {recipe.score}/15
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Most remade */}
        <Card>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">
            Most Remade Recipes
          </h2>
          {data.mostRemade.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-2">
              You haven&apos;t remade any recipes yet.
            </p>
          ) : (
            <div className="space-y-1">
              {data.mostRemade.map((recipe) => (
                <Link
                  key={recipe.id}
                  href={`/recipes/${recipe.id}`}
                  className="flex items-center gap-3 h-9 px-1 -mx-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1 truncate">
                    {recipe.title}
                  </span>
                  <span className="flex items-center gap-2 flex-shrink-0">
                    <span className="w-20 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <span
                        className="block h-full bg-secondary-500 rounded-full"
                        style={{
                          width: `${Math.min((recipe.remade / 10) * 100, 100)}%`,
                        }}
                      />
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums w-8 text-right">
                      {recipe.remade}x
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
