import { cn } from '@/lib/utils';
import { Avatar } from './Avatar';

interface AvatarStackProps {
  avatars: Array<{ src?: string; alt: string }>;
  max?: number;
  size?: 'xs' | 'sm';
  className?: string;
}

export function AvatarStack({
  avatars,
  max = 3,
  size = 'xs',
  className,
}: AvatarStackProps) {
  const visible = avatars.slice(0, max);
  const overflow = avatars.length - max;
  const overlapClass = size === 'xs' ? '-ml-2' : '-ml-2.5';
  const overflowSizeClass = size === 'xs' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs';

  return (
    <div className={cn('flex items-center', className)}>
      {visible.map((avatar, i) => (
        <div key={i} className={cn(i > 0 && overlapClass, 'relative')}>
          <Avatar src={avatar.src} alt={avatar.alt} size={size} />
        </div>
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            overlapClass,
            overflowSizeClass,
            'rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-medium text-gray-600 dark:text-gray-300 border-2 border-white dark:border-slate-900',
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
