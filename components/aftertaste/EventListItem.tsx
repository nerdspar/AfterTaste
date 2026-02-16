import { cn } from '@/lib/utils';
import Image from 'next/image';
import { MapPinIcon, CalendarIcon, ClockIcon, ArrowUpRightIcon } from 'lucide-react';
import { AvatarStack } from './AvatarStack';
import { IconButton } from './IconButton';

interface EventListItemProps {
  imageSrc: string;
  location: string;
  title: string;
  date: string;
  time: string;
  attendees: Array<{ src?: string; alt: string }>;
  className?: string;
}

export function EventListItem({
  imageSrc,
  location,
  title,
  date,
  time,
  attendees,
  className,
}: EventListItemProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-3',
        'dark:border-gray-700/40 dark:bg-slate-900',
        'transition-colors',
        className,
      )}
    >
      {/* Image */}
      <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
        <Image
          src={imageSrc}
          alt={title}
          fill
          className="object-cover"
          sizes="64px"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mb-0.5">
          <MapPinIcon className="w-3 h-3" />
          <span className="truncate">{location}</span>
        </div>

        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
          {title}
        </h4>

        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-1.5">
          <span className="flex items-center gap-1">
            <CalendarIcon className="w-3 h-3" />
            {date}
          </span>
          <span className="flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            {time}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <AvatarStack avatars={attendees} max={3} size="xs" />
          {attendees.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              +{attendees.length} joined
            </span>
          )}
        </div>
      </div>

      {/* Trailing action */}
      <IconButton size="sm" className="flex-shrink-0 mt-2">
        <ArrowUpRightIcon className="w-4 h-4" />
      </IconButton>
    </div>
  );
}
