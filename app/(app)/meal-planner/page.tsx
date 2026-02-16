import { Card } from '@/components/aftertaste/Card';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export default function MealPlannerPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">
        Meal Planner
      </h1>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            This Week
          </h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Feb 16 - Feb 22, 2026
          </span>
        </div>

        {/* Calendar grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Header row */}
            <div className="grid grid-cols-8 gap-2 mb-2">
              <div className="text-xs font-medium text-gray-400 dark:text-gray-500 py-2" />
              {days.map((day) => (
                <div
                  key={day}
                  className="text-xs font-medium text-gray-600 dark:text-gray-400 py-2 text-center"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Meal rows */}
            {meals.map((meal) => (
              <div key={meal} className="grid grid-cols-8 gap-2 mb-2">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 py-3 pr-2">
                  {meal}
                </div>
                {days.map((day) => (
                  <div
                    key={`${meal}-${day}`}
                    className="h-16 rounded-xl border border-dashed border-gray-200 dark:border-gray-700/40 bg-gray-50/50 dark:bg-gray-800/20 flex items-center justify-center"
                  >
                    <span className="text-[10px] text-gray-300 dark:text-gray-600">
                      +
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
