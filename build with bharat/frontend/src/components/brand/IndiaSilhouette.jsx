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
      {/* Authentic Geographical Outline of India per Survey of India official boundary */}
      <path
        d="M 28.7 5.0 L 34.6 9.7 L 42.9 8.6 L 44.1 9.7 L 40.5 14.5 L 41.7 19.2 L 39.3 20.4 L 39.3 22.8 L 46.4 28.7 L 44.1 32.2 L 51.2 37.0 L 54.7 37.0 L 63.0 40.5 L 65.4 40.5 L 67.8 34.6 L 70.1 34.6 L 70.1 37.0 L 71.3 38.2 L 78.4 38.2 L 82.0 33.4 L 87.9 29.9 L 91.4 29.9 L 95.0 34.6 L 93.8 37.0 L 89.1 40.5 L 89.1 44.1 L 85.5 49.0 L 84.3 53.6 L 82.0 54.0 L 79.6 48.0 L 71.3 51.2 L 71.3 55.9 L 66.6 57.1 L 65.4 60.7 L 60.7 64.2 L 48.8 76.1 L 46.4 76.1 L 44.1 82.0 L 44.1 89.1 L 41.7 92.6 L 41.7 97.4 L 34.6 105.7 L 31.1 104.5 L 28.7 99.7 L 28.7 96.2 L 23.9 87.9 L 22.8 82.0 L 19.2 76.1 L 19.2 71.3 L 18.0 70.1 L 18.0 60.7 L 15.7 59.5 L 12.1 61.8 L 6.2 55.9 L 7.4 53.6 L 5.0 51.2 L 7.4 47.6 L 12.1 47.6 L 13.3 46.4 L 9.7 40.5 L 9.7 38.2 L 12.1 35.8 L 16.8 35.8 L 23.9 27.5 L 26.3 22.8 L 25.1 20.4 L 22.8 19.2 L 22.8 10.9 L 20.4 8.6 L 21.6 6.2 L 23.9 5.0 Z"
        opacity="0.9"
      />
    </svg>
  );
}
