import { Card } from '@/components/aftertaste/Card';
import { recommendedRecipes } from '@/data/sample/recipes';
import { computePersonalRating } from '@/lib/recipe-rating';

function computeInsights() {
  const recipes = recommendedRecipes;
  const totalRecipes = recipes.length;
  const totalCalories = recipes.reduce((sum, r) => sum + r.calories, 0);
  const avgCookTime = Math.round(
    recipes.reduce((sum, r) => sum + r.totalTimeMinutes, 0) / totalRecipes,
  );
  const avgRating = (
    recipes.reduce(
      (sum, r) => sum + computePersonalRating(r.taste, r.ease, r.cleanup),
      0,
    ) / totalRecipes
  ).toFixed(1);

  const categoryCounts: Record<string, number> = {};
  for (const r of recipes) {
    categoryCounts[r.category] = (categoryCounts[r.category] ?? 0) + 1;
  }
  const topCategory = Object.entries(categoryCounts).sort(
    (a, b) => b[1] - a[1],
  )[0][0];

  const difficultyCounts: Record<string, number> = {};
  for (const r of recipes) {
    difficultyCounts[r.difficulty] =
      (difficultyCounts[r.difficulty] ?? 0) + 1;
  }

  const cuisineCounts: Record<string, number> = {};
  for (const r of recipes) {
    cuisineCounts[r.cuisine] = (cuisineCounts[r.cuisine] ?? 0) + 1;
  }
  const topCuisines = Object.entries(cuisineCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const categoryEntries = Object.entries(categoryCounts).sort(
    (a, b) => b[1] - a[1],
  );

  const categoryColors = [
    'bg-primary-500',
    'bg-secondary-500',
    'bg-amber-400',
    'bg-emerald-500',
    'bg-violet-500',
  ];

  return {
    totalRecipes,
    totalCalories,
    avgCookTime,
    avgRating,
    topCategory,
    difficultyCounts,
    categoryEntries,
    categoryColors,
    topCuisines,
  };
}

export default function InsightsPage() {
  const data = computeInsights();

  const summaryCards = [
    { label: 'Total Recipes', value: String(data.totalRecipes) },
    { label: 'Avg. Rating', value: data.avgRating },
    { label: 'Top Category', value: data.topCategory },
    { label: 'Avg. Cook Time', value: `${data.avgCookTime} mins` },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">
        Insights
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
              {card.label}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
              {card.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Category distribution */}
        <Card>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">
            Category Distribution
          </h2>
          <div className="space-y-3">
            {data.categoryEntries.map(([cat, count], i) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 w-16 text-right tabular-nums">
                  {count} recipes
                </span>
                <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                  <div
                    className={`h-full rounded-lg ${data.categoryColors[i % data.categoryColors.length]} flex items-center px-2`}
                    style={{
                      width: `${(count / data.totalRecipes) * 100}%`,
                    }}
                  >
                    <span className="text-[10px] font-semibold text-white truncate">
                      {cat}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Difficulty breakdown */}
        <Card>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">
            Difficulty Breakdown
          </h2>
          <div className="space-y-4">
            {['Easy', 'Medium', 'Hard'].map((level) => {
              const count = data.difficultyCounts[level] ?? 0;
              const pct = Math.round((count / data.totalRecipes) * 100);
              return (
                <div key={level}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {level}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top cuisines */}
        <Card>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">
            Top Cuisines
          </h2>
          <div className="space-y-3">
            {data.topCuisines.map(([cuisine, count], i) => (
              <div key={cuisine} className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-300 dark:text-gray-600 w-5 text-right tabular-nums">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1">
                  {cuisine}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                  {count} {count === 1 ? 'recipe' : 'recipes'}
                </span>
              </div>
            ))}
          </div>
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
              {data.categoryEntries.map(([cat]) => {
                const catRecipes = recommendedRecipes.filter(
                  (r) => r.category === cat,
                );
                const avg = Math.round(
                  catRecipes.reduce((s, r) => s + r.calories, 0) /
                    catRecipes.length,
                );
                return (
                  <div
                    key={cat}
                    className="flex items-center justify-between"
                  >
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {cat}
                    </span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 tabular-nums">
                      {avg} kcal avg
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
