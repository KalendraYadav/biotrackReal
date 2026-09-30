import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Standard enterprise Card component family per rulebook.md Section 8.4.
 * Sits flat with 1px border; avoids unnecessary shadows or nested cards.
 */
export function Card({ className = '', children, ...props }) {
  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-steel-200 text-steel-950',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...props }) {
  return (
    <div
      className={cn(
        'px-5 py-4 border-b border-steel-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...props }) {
  return (
    <h3
      className={cn('text-sm font-semibold text-steel-900 tracking-tight', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ className = '', children, ...props }) {
  return (
    <p
      className={cn('text-xs text-steel-600 mt-0.5', className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({ className = '', children, ...props }) {
  return (
    <div className={cn('p-5', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = '', children, ...props }) {
  return (
    <div
      className={cn(
        'px-5 py-3 bg-steel-50/70 border-t border-steel-100 flex items-center justify-between gap-3 rounded-b-lg text-xs',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
