'use client';

import { cn } from '@/lib/utils';
import {
  PencilIcon,
  SettingsIcon,
  PlusIcon,
  MicIcon,
  RefreshCwIcon,
  ChevronDownIcon,
} from 'lucide-react';
import { Card } from '../Card';
import { Chip } from '../Chip';
import { IconButton } from '../IconButton';
import { aiSuggestedPrompts } from '@/data/sample/recipes';

export function AIAssistantPanel() {
  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
          AI Assistant
        </h3>
        <div className="flex items-center gap-1">
          <button className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            GPT-4
            <ChevronDownIcon className="w-3 h-3" />
          </button>
          <IconButton size="sm">
            <PencilIcon className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton size="sm">
            <SettingsIcon className="w-3.5 h-3.5" />
          </IconButton>
        </div>
      </div>

      {/* Suggested prompts */}
      <div className="flex flex-wrap gap-2 mb-3">
        {aiSuggestedPrompts.map((prompt) => (
          <Chip key={prompt} label={prompt} />
        ))}
      </div>

      {/* Refresh */}
      <button className="flex items-center gap-1 text-xs text-secondary-500 hover:text-secondary-600 dark:text-secondary-400 dark:hover:text-secondary-300 font-medium mb-4 transition-colors">
        <RefreshCwIcon className="w-3 h-3" />
        Refresh prompts
      </button>

      {/* Input */}
      <div
        className={cn(
          'flex items-center gap-2 h-10 px-2 rounded-full',
          'border border-gray-200 bg-gray-50',
          'dark:border-gray-700 dark:bg-gray-800/60',
        )}
      >
        <IconButton size="sm" className="flex-shrink-0">
          <PlusIcon className="w-4 h-4" />
        </IconButton>

        <input
          type="text"
          placeholder="Type a message..."
          className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none"
        />

        <IconButton size="sm" className="flex-shrink-0">
          <MicIcon className="w-4 h-4" />
        </IconButton>
      </div>
    </Card>
  );
}
