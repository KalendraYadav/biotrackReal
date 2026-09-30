import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Standard enterprise PageHeader per rulebook.md Section 3.3, 4.5 & Appendix B.3.
 * Single h1 per page, concise description <= 75ch, right-aligned primary actions.
 * Anchors the page directly on the canvas without redundant card wrapping.
 */
export function PageHeader({
  title,
  description,
  badge,
  badges,
  actions,
  icon: Icon,
  eyebrow,
  className = ''
}) {
  return (
    <header
      className={cn(
        'pb-5 border-b border-border/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4',
        className
      )}
    >
      <div className="flex items-start sm:items-center gap-3.5 min-w-0">
        {Icon && (
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
            <Icon className="w-6 h-6" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">
              {eyebrow}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-[26px] font-bold text-text tracking-tight font-sans">
              {title}
            </h1>
            {badge || badges}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-center">
          {actions}
        </div>
      )}
    </header>
  );
}

export default PageHeader;
