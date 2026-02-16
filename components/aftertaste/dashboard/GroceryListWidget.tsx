'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { CheckIcon } from 'lucide-react';
import { groceryItems } from '@/data/sample/recipes';

export function GroceryListWidget() {
  const checkedCount = groceryItems.filter((item) => item.checked).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {checkedCount}/{groceryItems.length} items done
        </span>
      </div>

      <div className="space-y-2">
        {groceryItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5',
              'hover:bg-gray-50 dark:hover:bg-gray-800/40',
              'transition-colors',
            )}
          >
            {/* Checkbox */}
            <div
              className={cn(
                'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                item.checked
                  ? 'bg-primary-500 border-primary-500'
                  : 'border-gray-300 dark:border-gray-600',
              )}
            >
              {item.checked && (
                <CheckIcon className="w-3 h-3 text-white" />
              )}
            </div>

            {/* Item info */}
            <div className="flex-1 min-w-0">
              <span
                className={cn(
                  'text-sm text-gray-900 dark:text-gray-100',
                  item.checked && 'line-through text-gray-400 dark:text-gray-500',
                )}
              >
                {item.name}
              </span>
            </div>

            {/* Quantity */}
            <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
              {item.quantity}
            </span>
          </div>
        ))}
      </div>

      <Link
        href="/grocery-list"
        className="block text-center text-xs font-medium text-secondary-500 hover:text-secondary-600 dark:text-secondary-400 dark:hover:text-secondary-300 transition-colors pt-3"
      >
        View Full Grocery List
      </Link>
    </div>
  );
}
