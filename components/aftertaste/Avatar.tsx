import { cn } from '@/lib/utils';
import Image from 'next/image';

interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  ring?: boolean;
  ringColor?: string;
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-11 h-11',
};

export function Avatar({
  src,
  alt,
  size = 'md',
  ring = false,
  ringColor,
  className,
}: AvatarProps) {
  const initials = alt
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden flex-shrink-0',
        sizeClasses[size],
        ring && 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900',
        ring && (ringColor || 'ring-primary-500'),
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes="48px"
        />
      ) : (
        <div className="w-full h-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center text-xs font-semibold text-primary-700 dark:text-primary-300">
          {initials}
        </div>
      )}
    </div>
  );
}
