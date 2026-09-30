import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Standard enterprise Badge component per rulebook.md Section 8.11.
 * Never communicates meaning via color alone; supports dot indicators and icons.
 */
export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  icon: Icon,
  className = '',
  ...props
}) {
  const baseClasses =
    'inline-flex items-center font-sans font-medium whitespace-nowrap rounded border shrink-0';

  const variants = {
    neutral: 'bg-steel-100 text-steel-800 border-steel-200',
    primary: 'bg-blue-50 text-blue-900 border-blue-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    warning: 'bg-amber-50 text-amber-900 border-amber-300',
    danger: 'bg-biohazard-50 text-biohazard-950 border-biohazard-300',
    info: 'bg-sky-50 text-sky-900 border-sky-200'
  };

  const dotColors = {
    neutral: 'bg-steel-500',
    primary: 'bg-blue-600',
    success: 'bg-emerald-600',
    warning: 'bg-amber-600',
    danger: 'bg-biohazard-700',
    info: 'bg-sky-600'
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-0.5 gap-1.5'
  };

  return (
    <span
      className={cn(baseClasses, variants[variant] || variants.neutral, sizes[size] || sizes.md, className)}
      {...props}
    >
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant] || dotColors.neutral)}
          aria-hidden="true"
        />
      )}
      {Icon && <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
}

export default Badge;
