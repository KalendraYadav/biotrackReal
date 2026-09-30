import React from 'react';

/**
 * Minimalist Line-Art Silhouette of India's Geographical Boundary
 * Used in institutional footers for National Digital Infrastructure / Swachh Bharat
 */
export default function IndiaSilhouette({ className = 'w-10 h-14', ...props }) {
  return (
    <svg
      viewBox="0 0 100 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Generalized geometric outline of India */}
      <path
        d="M 45 6 
           C 48 8, 52 14, 55 18 
           C 57 21, 62 23, 60 27 
           C 57 32, 54 36, 59 40 
           C 65 42, 75 42, 82 43 
           C 88 44, 95 48, 93 54 
           C 90 58, 82 58, 76 56 
           C 72 58, 68 62, 65 65 
           C 66 72, 64 80, 58 88 
           C 54 95, 52 105, 50 114 
           C 48 105, 43 96, 38 88 
           C 34 82, 30 75, 30 68 
           C 28 62, 22 58, 16 54 
           C 10 50, 6 45, 10 40 
           C 15 36, 22 38, 28 35 
           C 32 30, 36 24, 38 18 
           C 40 12, 42 6, 45 6 Z"
        opacity="0.85"
      />
      {/* Center point pin / chakra dot */}
      <circle cx="50" cy="60" r="2.5" fill="currentColor" opacity="0.9" />
    </svg>
  );
}
