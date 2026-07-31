import { Card } from '@/components/aftertaste/Card';
import { recommendedRecipes } from '@/data/sample/recipes';
import { cn } from '@/lib/utils';

function computeScoring() {
  const recipes = recommendedRecipes;
  const total = recipes.length;

  const avgEase = recipes.reduce((s, r) => s + r.ease, 0) / total;
  const avgTaste = recipes.reduce((s, r) => s + r.taste, 0) / total;
  const avgCleanup = recipes.reduce((s, r) => s + r.cleanup, 0) / total;
  const avgCost = recipes.reduce((s, r) => s + r.cost, 0) / total;
  const avgCookTime = Math.round(
    recipes.reduce((s, r) => s + r.cookTimeMinutes, 0) / total,
  );
  const quickCount = recipes.filter((r) => r.cookTimeMinutes <= 30).length;
  const totalRemade = recipes.reduce((s, r) => s + r.remade, 0);
  const makeAgainCount = recipes.filter((r) => r.makeAgain).length;
  const makeAgainPct = Math.round((makeAgainCount / total) * 100);

  const overallScore =
    ((avgEase + avgTaste + avgCleanup) / 15) * 0.6 +
    (makeAgainCount / total) * 0.4;

  const topScored = [...recipes]
    .map((r) => ({
      id: r.id,
      title: r.title,
      image: r.image,
      score: r.ease + r.taste + r.cleanup,
      makeAgain: r.makeAgain,
      remade: r.remade,
    }))
    .sort((a, b) => b.score - a.score || b.remade - a.remade)
    .slice(0, 5);

  const mostRemade = [...recipes]
    .filter((r) => r.remade > 0)
    .sort((a, b) => b.remade - a.remade)
    .slice(0, 5);

  return {
    total,
    avgEase,
    avgTaste,
    avgCleanup,
    avgCost,
    avgCookTime,
    quickCount,
    totalRemade,
    makeAgainCount,
    makeAgainPct,
    overallScore,
    topScored,
    mostRemade,
  };
}

interface Badge {
  name: string;
  icon: string;
  description: string;
  earned: boolean;
}

function computeBadges(): Badge[] {
  const recipes = recommendedRecipes;
  const total = recipes.length;
  const totalRemade = recipes.reduce((s, r) => s + r.remade, 0);
  const makeAgainCount = recipes.filter((r) => r.makeAgain).length;
  const avgTaste = recipes.reduce((s, r) => s + r.taste, 0) / total;
  const easyCount = recipes.filter((r) => r.ease >= 4).length;
  const cleanCount = recipes.filter((r) => r.cleanup >= 4).length;
  const perfectCount = recipes.filter(
    (r) => r.ease >= 4 && r.taste >= 4 && r.cleanup >= 4,
  ).length;

  return [
    {
      name: 'First Taste',
      icon: '🍽️',
      description: 'Rate your first recipe',
      earned: total >= 1,
    },
    {
      name: 'Recipe Explorer',
      icon: '🧭',
      description: 'Score 10+ recipes',
      earned: total >= 10,
    },
    {
      name: 'Repeat Chef',
      icon: '🔁',
      description: 'Remade recipes 20+ times',
      earned: totalRemade >= 20,
    },
    {
      name: 'Taste Master',
      icon: '👨‍🍳',
      description: 'Average taste score of 4.5+',
      earned: avgTaste >= 4.5,
    },
    {
      name: 'Easy Cook',
      icon: '✨',
      description: '5+ recipes rated easy (4+)',
      earned: easyCount >= 5,
    },
    {
      name: 'Clean Kitchen',
      icon: '🧹',
      description: '5+ recipes with cleanup 4+',
      earned: cleanCount >= 5,
    },
    {
      name: 'Would Make Again',
      icon: '💯',
      description: '80%+ recipes marked "make again"',
      earned: makeAgainCount / total >= 0.8,
    },
    {
      name: 'Perfectionist',
      icon: '⭐',
      description: '3+ recipes with all scores 4+',
      earned: perfectCount >= 3,
    },
    {
      name: 'Centurion',
      icon: '🏆',
      description: 'Remade recipes 100+ times total',
      earned: totalRemade >= 100,
    },
  ];
}

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

export default function ScoringPage() {
  const data = computeScoring();
  const badges = computeBadges();
  const earnedCount = badges.filter((b) => b.earned).length;

  const summaryCards = [
    {
      label: 'Overall Score',
      value: `${Math.round(data.overallScore * 100)}%`,
      sub: `Based on ${data.total} recipes`,
    },
    {
      label: 'Total Times Remade',
      value: String(data.totalRemade),
      sub: `Across ${data.total} recipes`,
    },
    {
      label: 'Would Make Again',
      value: `${data.makeAgainPct}%`,
      sub: `${data.makeAgainCount} of ${data.total}`,
    },
    {
      label: 'Badges Earned',
      value: `${earnedCount}/${badges.length}`,
      sub: earnedCount === badges.length ? 'All unlocked!' : 'Keep cooking!',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">
        Scoring
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
            <p className="text-xs text-primary-500 dark:text-primary-400 mt-0.5">
              {card.sub}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Score breakdown */}
        <Card>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">
            Average Scores
          </h2>
          <div className="space-y-4">
            <ScoreBar label="Ease" value={data.avgEase} max={5} />
            <ScoreBar label="Taste" value={data.avgTaste} max={5} />
            <ScoreBar label="Cleanup" value={data.avgCleanup} max={5} />
          </div>
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
                {'$'.repeat(Math.max(1, Math.round(data.avgCost)))}
                <span className="ml-1 text-xs font-normal text-gray-400 dark:text-gray-500">
                  ({data.avgCost.toFixed(1)})
                </span>
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

        {/* Badges */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Badges
            </h2>
            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
              {earnedCount}/{badges.length} earned
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {badges.map((badge) => (
              <div
                key={badge.name}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-colors',
                  badge.earned
                    ? 'bg-primary-50 dark:bg-primary-500/10'
                    : 'bg-gray-50 dark:bg-gray-800/40 opacity-40',
                )}
              >
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-base',
                    badge.earned
                      ? 'bg-primary-100 dark:bg-primary-500/20'
                      : 'bg-gray-200 dark:bg-gray-700 grayscale',
                  )}
                >
                  {badge.icon}
                </div>
                <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">
                  {badge.name}
                </span>
                <span className="text-[8px] text-gray-400 dark:text-gray-500 text-center leading-tight">
                  {badge.description}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top scored recipes */}
        <Card>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">
            Highest Scored Recipes
          </h2>
          <div className="space-y-3">
            {data.topScored.map((recipe, i) => (
              <div key={recipe.id} className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-300 dark:text-gray-600 w-5 text-right tabular-nums">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1 truncate">
                  {recipe.title}
                </span>
                <span className="text-xs font-semibold text-primary-500 tabular-nums">
                  {recipe.score}/15
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Most remade */}
        <Card>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">
            Most Remade Recipes
          </h2>
          <div className="space-y-3">
            {data.mostRemade.map((recipe) => (
              <div key={recipe.id} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1 truncate">
                  {recipe.title}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-secondary-500 rounded-full"
                      style={{
                        width: `${Math.min((recipe.remade / 10) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums w-8 text-right">
                    {recipe.remade}x
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
