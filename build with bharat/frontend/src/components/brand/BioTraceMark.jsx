import React from 'react';

/**
 * Geometric BioTrace "B" Mark
 * Authentic corporate identity mark composed of four quadrants:
 * - Quadrant 1 (Top-Left): Crisp white/silver vertical block
 * - Quadrant 2 (Top-Right): Mint/emerald curve (outer top-right rounded)
 * - Quadrant 3 (Bottom-Left): Emerald curve (outer top-left rounded)
 * - Quadrant 4 (Bottom-Right): Crisp white/silver vertical block
 */
export default function BioTraceMark({ className = 'w-[84px] h-[134px]', ...props }) {
  return (
    <svg
      viewBox="0 0 94 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <defs>
        {/* Silver / White Gradient */}
        <linearGradient id="bioWhiteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#D8E4F2" />
        </linearGradient>

        {/* Emerald / Mint Gradient */}
        <linearGradient id="bioMintGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#16C98D" />
          <stop offset="100%" stopColor="#7EE8C6" />
        </linearGradient>

        {/* Ambient Drop Shadow Filter */}
        <filter id="bioDropShadow" x="-20%" y="-15%" width="140%" height="135%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#021C42" floodOpacity="0.4" />
        </filter>
      </defs>

      <g filter="url(#bioDropShadow)">
        {/* Quadrant 1: Top-Left (White/Silver Pillar) */}
        <rect
          x="0"
          y="0"
          width="40"
          height="68"
          rx="3"
          fill="url(#bioWhiteGrad)"
        />

        {/* Quadrant 2: Top-Right (Mint/Emerald Leaf - Top-Right Rounded) */}
        <path
          d="M 54 0 L 54 68 L 94 68 L 94 40 C 94 16 78 0 54 0 Z"
          fill="url(#bioMintGrad)"
        />

        {/* Quadrant 3: Bottom-Left (Emerald Leaf - Top-Left Rounded) */}
        <path
          d="M 40 82 L 40 150 L 0 150 L 0 122 C 0 98 16 82 40 82 Z"
          fill="url(#bioMintGrad)"
        />

        {/* Quadrant 4: Bottom-Right (White/Silver Pillar) */}
        <rect
          x="54"
          y="82"
          width="40"
          height="68"
          rx="3"
          fill="url(#bioWhiteGrad)"
        />
      </g>
    </svg>
  );
}
