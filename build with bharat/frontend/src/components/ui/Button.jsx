import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Standard enterprise Button component conforming to rulebook.md Section 8.1.
 * Default variant is 'secondary' to ensure primary actions are chosen deliberately.
 */
export function Button({
  type = 'button',
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  children,
  icon: Icon,
  ...props
}) {
  const baseClasses = 
    'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded font-sans transition-colors duration-150 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#07559B] focus-visible:ring-offset-2 ' +
    'disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99] motion-reduce:active:scale-100';

  const variants = {
    primary:
      'bg-[#07559B] text-white hover:bg-[#03275D] active:bg-[#043460] border border-[#07559B] font-semibold shadow-xs',
    gradient:
      'biotrace-enter-btn text-white border border-[#36B9EE] font-semibold shadow-xs',
    secondary:
      'bg-white text-steel-900 border border-steel-300 hover:bg-blue-50/50 hover:border-blue-300 active:bg-steel-100 font-medium',
    ghost:
      'bg-transparent text-steel-600 hover:text-steel-900 hover:bg-steel-100 active:bg-steel-200 font-medium',
    destructive:
      'bg-biohazard-700 text-white hover:bg-biohazard-800 active:bg-biohazard-900 border border-biohazard-700 font-semibold shadow-xs',
    success:
      'bg-emerald-700 text-white hover:bg-emerald-800 active:bg-emerald-900 border border-emerald-700 font-semibold shadow-xs',
    outline:
      'bg-transparent text-steel-800 border border-steel-300 hover:bg-blue-50/50 hover:border-blue-300 font-medium'
  };

  const sizes = {
    sm: 'h-8 px-3 text-xs gap-1.5 [&_svg]:w-3.5 [&_svg]:h-3.5',
    md: 'h-10 px-4 text-xs font-semibold gap-2 [&_svg]:w-4 [&_svg]:h-4',
    lg: 'h-11 px-5 text-sm font-semibold gap-2.5 [&_svg]:w-4 [&_svg]:h-4'
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(baseClasses, variants[variant] || variants.secondary, sizes[size] || sizes.md, className)}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : Icon ? (
        <Icon aria-hidden="true" />
      ) : null}
      {children}
    </button>
  );
}

export default Button;
