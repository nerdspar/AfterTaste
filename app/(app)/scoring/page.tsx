import { Card } from '@/components/aftertaste/Card';

const scoringMetrics = [
  { label: 'Recipes Completed', value: '24', trend: '+3 this week' },
  { label: 'Avg. Rating', value: '4.7', trend: '+0.2 this month' },
  { label: 'Skill Level', value: 'Advanced', trend: 'Level up soon' },
  { label: 'Cook Streak', value: '12 days', trend: 'Personal best!' },
];

export default function ScoringPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">
        Scoring
      </h1>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {scoringMetrics.map((metric) => (
          <Card key={metric.label}>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
              {metric.label}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">
              {metric.value}
            </p>
            <p className="text-xs text-primary-500 dark:text-primary-400">
              {metric.trend}
            </p>
          </Card>
        ))}
      </div>

      {/* Placeholder scoring cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">
            Recipe Difficulty Breakdown
          </h2>
          <div className="space-y-3">
            {['Easy', 'Medium', 'Hard'].map((level) => (
              <div key={level} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 w-14">
                  {level}
                </span>
                <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full"
                    style={{
                      width: level === 'Easy' ? '60%' : level === 'Medium' ? '30%' : '10%',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">
            Achievement Badges
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {['First Cook', 'Week Streak', 'Master Chef', 'Explorer', 'Social Star', 'Speed Cook'].map(
              (badge) => (
                <div
                  key={badge}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gray-50 dark:bg-gray-800/40"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center text-sm">
                    🏆
                  </div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
                    {badge}
                  </span>
                </div>
              ),
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
