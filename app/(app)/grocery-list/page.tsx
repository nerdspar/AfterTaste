import { Card } from '@/components/aftertaste/Card';

const placeholderCategories = [
  { name: 'Fruits & Vegetables', count: 8 },
  { name: 'Dairy & Eggs', count: 4 },
  { name: 'Grains & Cereals', count: 3 },
  { name: 'Spices & Seasonings', count: 6 },
  { name: 'Pantry Essentials', count: 5 },
];

export default function GroceryListPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">
        Grocery List
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main list */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Shopping List
              </h2>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                26 items
              </span>
            </div>

            <div className="space-y-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 h-10 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <div className="w-4 h-4 rounded border border-gray-300 dark:border-gray-600" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                  <div className="ml-auto h-3 bg-gray-100 dark:bg-gray-800 rounded w-16" />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Categories sidebar */}
        <div className="space-y-3">
          {placeholderCategories.map((cat) => (
            <Card key={cat.name}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {cat.name}
                </h3>
                <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                  {cat.count} items
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
