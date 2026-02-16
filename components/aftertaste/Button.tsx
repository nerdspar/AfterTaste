import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: cn(
    'bg-primary-500 text-white hover:bg-primary-600',
    'shadow-sm',
    'focus-visible:ring-primary-500/30',
  ),
  secondary: cn(
    'bg-secondary-500 text-white hover:bg-secondary-600',
    'shadow-sm',
    'focus-visible:ring-secondary-500/30',
  ),
  outline: cn(
    'border border-gray-200 bg-transparent text-gray-900 hover:bg-gray-50',
    'dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800',
    'focus-visible:ring-secondary-500/30',
  ),
  ghost: cn(
    'bg-transparent text-gray-700 hover:bg-gray-100',
    'dark:text-gray-300 dark:hover:bg-gray-800',
    'focus-visible:ring-secondary-500/30',
  ),
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-9 px-3.5 text-sm rounded-lg gap-2',
  lg: 'h-11 px-5 text-sm rounded-xl gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', fullWidth, className, children, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
