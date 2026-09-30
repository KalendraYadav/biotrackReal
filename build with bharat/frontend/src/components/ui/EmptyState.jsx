import React from 'react';
import { Layers } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Enterprise EmptyState component per rulebook.md Section 10.2.
 * Answers: (1) what this is, (2) why it is empty, (3) what action to take next.
 */
export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Layers,
  className = ''
}) {
  return (
    <div
      className={cn(
        'mx-auto flex max-w-sm flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-steel-100 flex items-center justify-center text-steel-500 mb-3 border border-steel-200">
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-steel-900 tracking-tight">
        {title}
      </h3>
      <p className="text-xs text-steel-500 mt-1 mb-4 leading-relaxed max-w-xs">
        {description}
      </p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export default EmptyState;
