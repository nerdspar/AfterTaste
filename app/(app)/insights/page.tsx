import { Card } from '@/components/aftertaste/Card';

const insightCards = [
  { label: 'Total Recipes Saved', value: '142', change: '+12%' },
  { label: 'Calories This Week', value: '8,450', change: '-5%' },
  { label: 'Most Cooked Category', value: 'Breakfast', change: '' },
  { label: 'Avg. Cook Time', value: '35 mins', change: '-8%' },
];

export default function InsightsPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">
        Insights
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {insightCards.map((card) => (
          <Card key={card.label}>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
              {card.label}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-0.5 tabular-nums">
              {card.value}
            </p>
            {card.change && (
              <p
                className={
                  card.change.startsWith('+')
                    ? 'text-xs text-green-500'
                    : 'text-xs text-red-500'
                }
              >
                {card.change} from last week
              </p>
            )}
          </Card>
        ))}
      </div>

      {/* Chart placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">
            Cooking Activity
          </h2>
          <div className="h-48 flex items-end justify-between gap-2 px-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
              (day, i) => {
                const heights = [40, 65, 35, 80, 55, 90, 45];
                return (
                  <div
                    key={day}
                    className="flex-1 flex flex-col items-center gap-2"
                  >
                    <div className="w-full flex items-end justify-center h-36">
                      <div
                        className="w-full max-w-7 rounded-t-md bg-primary-500/80 dark:bg-primary-500/60"
                        style={{ height: `${heights[i]}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      {day}
                    </span>
                  </div>
                );
              },
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">
            Category Distribution
          </h2>
          <div className="h-48 flex items-center justify-center">
            <div className="text-center">
              <div className="w-32 h-32 rounded-full border-8 border-primary-500/60 dark:border-primary-500/40 border-r-secondary-500/60 dark:border-r-secondary-500/40 border-b-amber-400/60 dark:border-b-amber-400/40 mx-auto mb-3" />
              <div className="flex items-center justify-center gap-3">
                {[
                  { color: 'bg-primary-500', label: 'Breakfast' },
                  { color: 'bg-secondary-500', label: 'Lunch' },
                  { color: 'bg-amber-400', label: 'Dinner' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1">
                    <div
                      className={`w-2 h-2 rounded-full ${item.color}`}
                    />
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
