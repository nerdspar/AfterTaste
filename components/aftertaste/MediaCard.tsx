import { cn } from '@/lib/utils';
import Image from 'next/image';
import { PlayIcon } from 'lucide-react';

interface MediaCardProps {
  imageSrc: string;
  title: string;
  channelName?: string;
  isLive?: boolean;
  viewerCount?: number;
  className?: string;
}

export function MediaCard({
  imageSrc,
  title,
  channelName,
  isLive = false,
  viewerCount,
  className,
}: MediaCardProps) {
  return (
    <div
      className={cn(
        'group relative rounded-2xl overflow-hidden cursor-pointer',
        'border border-gray-200 dark:border-gray-700/40',
        className,
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video">
        <Image
          src={imageSrc}
          alt={title}
          fill
          className="object-cover dark:brightness-90"
          sizes="(max-width: 768px) 100vw, 300px"
        />

        {/* Scrim overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Play icon on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
            <PlayIcon className="w-5 h-5 text-gray-900 fill-gray-900 ml-0.5" />
          </div>
        </div>

        {/* Top badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1 h-5 px-2 rounded-full bg-gray-900/80 text-white text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              LIVE
            </span>
          )}
          {viewerCount !== undefined && (
            <span className="h-5 px-2 rounded-full bg-gray-900/80 text-white text-[11px] font-medium tabular-nums">
              {viewerCount.toLocaleString()} watching
            </span>
          )}
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {channelName && (
            <p className="text-xs text-gray-300 mb-0.5">{channelName}</p>
          )}
          <p className="text-sm font-semibold text-white line-clamp-2">
            {title}
          </p>
        </div>
      </div>
    </div>
  );
}
