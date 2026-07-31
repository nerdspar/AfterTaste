'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useRecipeStore } from '@/components/aftertaste/RecipeStoreProvider';
import { RatingsTab } from '@/components/aftertaste/insights/RatingsTab';
import { CollectionTab } from '@/components/aftertaste/insights/CollectionTab';

type Tab = 'ratings' | 'collection';

const TABS: { key: Tab; label: string }[] = [
  { key: 'ratings', label: 'Ratings' },
  { key: 'collection', label: 'Collection' },
];

export default function InsightsPage() {
  const { recipes } = useRecipeStore();
  const [tab, setTab] = useState<Tab>('ratings');

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        Insights
      </h1>

      {/* Tabs */}
      <div className="inline-flex items-center rounded-xl border border-gray-200 dark:border-gray-700 p-1 mb-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={cn(
              'px-4 h-9 rounded-lg text-sm font-medium transition-colors',
              tab === t.key
                ? 'bg-primary-500 text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'ratings' ? (
        <RatingsTab recipes={recipes} />
      ) : (
        <CollectionTab recipes={recipes} />
      )}
    </div>
  );
}
