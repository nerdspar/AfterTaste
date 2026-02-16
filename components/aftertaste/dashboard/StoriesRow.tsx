'use client';

import { cn } from '@/lib/utils';
import { PlusIcon } from 'lucide-react';
import { storyUsers } from '@/data/sample/recipes';
import Image from 'next/image';

export function StoriesRow() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
      {storyUsers.map((user) => (
        <button
          key={user.name}
          className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
        >
          <div className="relative">
            <div
              className={cn(
                'w-11 h-11 rounded-full overflow-hidden',
                user.hasNew && 'ring-2 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-950',
              )}
            >
              <Image
                src={user.avatar}
                alt={user.name}
                width={44}
                height={44}
                className="object-cover w-full h-full"
              />
            </div>

            {/* Plus badge for "Your Story" */}
            {user.isYou && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-primary-500 border-2 border-white dark:border-gray-950 flex items-center justify-center">
                <PlusIcon className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </div>

          <span className="text-[11px] text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors truncate w-14 text-center">
            {user.name}
          </span>
        </button>
      ))}
    </div>
  );
}
