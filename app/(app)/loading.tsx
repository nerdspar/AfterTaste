export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto animate-pulse">
      <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg mb-5" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-200 dark:border-gray-700/40 overflow-hidden"
          >
            <div className="h-36 bg-gray-200 dark:bg-gray-800" />
            <div className="p-3.5 space-y-2">
              <div className="h-3 w-20 bg-gray-200 dark:bg-gray-800 rounded" />
              <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded" />
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800 rounded" />
              <div className="h-3 w-28 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
