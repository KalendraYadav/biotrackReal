import React from 'react';

/**
 * Accessible Skip to Main Content link per rulebook.md Section 13.2 AX-03.
 * Visually hidden until focused by keyboard.
 */
export function SkipToContent({ targetId = 'main-content' }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[99999] focus:px-4 focus:py-2.5 focus:bg-steel-950 focus:text-white focus:rounded focus:border-2 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-white text-xs font-semibold shadow-lg transition-transform"
    >
      Skip to main content
    </a>
  );
}

export default SkipToContent;
