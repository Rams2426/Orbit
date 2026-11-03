import React from 'react';
import { usePrefersReducedMotion } from '../utils/usePrefersReducedMotion';

export interface OrbitLogoProps {
  variant?: 'symbol' | 'horizontal' | 'icon';
  theme?: 'light' | 'dark' | 'monochrome';
  className?: string;
  size?: number;
  animated?: boolean;
}

/**
 * Orbit Logo Component
 * - Solid filled circle in center (gentle pulse when animated)
 * - Thin ring tilted 25 degrees (clean outline, no gradients or shadows)
 * - One small dot sitting on or traveling around the ring (6s steady loop when animated)
 * - Colors: Deep purple (#534AB7), soft lavender (#EEEDFE), light purple (#AFA9EC)
 */
export const OrbitLogo: React.FC<OrbitLogoProps> = ({
  variant = 'symbol',
  theme = 'light',
  className = '',
  size = 40,
  animated = false,
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const isAnimated = animated && !prefersReducedMotion;

  // Color tokens
  const deepPurple = '#534AB7';
  const lightPurple = '#AFA9EC';
  const softLavender = '#EEEDFE';

  const getColors = () => {
    if (theme === 'monochrome') {
      return {
        centerCircle: 'currentColor',
        ring: 'currentColor',
        dot: 'currentColor',
        text: 'currentColor',
        iconBg: 'transparent',
      };
    }
    const isDark =
      theme === 'dark' ||
      (theme === 'light' &&
        typeof document !== 'undefined' &&
        document.documentElement.classList.contains('dark'));

    if (isDark) {
      return {
        centerCircle: '#8B7BFF',
        ring: lightPurple,
        dot: '#F2F2F7',
        text: '#F2F2F7',
        iconBg: '#1A1A22',
      };
    }
    // light default
    return {
      centerCircle: deepPurple,
      ring: lightPurple,
      dot: deepPurple,
      text: '#1E1B4B',
      iconBg: softLavender,
    };
  };

  const colors = getColors();

  // 1. Core Symbol SVG (100x100 viewBox)
  const renderSymbol = (svgSize = size) => (
    <svg
      width={svgSize}
      height={svgSize}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 overflow-visible"
      aria-label="Orbit logo"
    >
      {/* Tilted Ring (tilted 25 degrees around center 50,50) */}
      <g transform="rotate(-25 50 50)">
        <ellipse
          cx="50"
          cy="50"
          rx="40"
          ry="17"
          fill="none"
          stroke={colors.ring}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Traveling dot along the ellipse path (6s full turn, steady speed) */}
        {isAnimated ? (
          <>
            <circle
              cx="0"
              cy="0"
              r="4.5"
              fill={colors.dot}
              className="orbit-dot-animated"
            >
              <animateMotion
                path="M 90 50 A 40 17 0 0 1 10 50 A 40 17 0 0 1 90 50 Z"
                dur="6s"
                repeatCount="indefinite"
                calcMode="linear"
              />
            </circle>
            {/* Fallback static dot if media query pauses or disables motion */}
            <circle
              cx="90"
              cy="50"
              r="4.5"
              fill={colors.dot}
              className="orbit-dot-static"
            />
          </>
        ) : (
          /* Small dot sitting right on the ring at (50 + 40, 50) */
          <circle
            cx="90"
            cy="50"
            r="4.5"
            fill={colors.dot}
          />
        )}
      </g>

      {/* Solid filled circle in the center with very gentle pulse (scale 1 to 1.05, 3s) */}
      <circle
        cx="50"
        cy="50"
        r="16"
        fill={colors.centerCircle}
        className={isAnimated ? 'orbit-center-pulse' : undefined}
      />
    </svg>
  );

  // 2. Rounded-Square App Icon format
  if (variant === 'icon') {
    return (
      <div
        style={{ width: size, height: size, backgroundColor: colors.iconBg }}
        className={`rounded-2xl p-2 flex items-center justify-center shadow-xs overflow-hidden ${className}`}
      >
        {renderSymbol(size * 0.85)}
      </div>
    );
  }

  // 3. Horizontal version with the word "Orbit"
  if (variant === 'horizontal') {
    return (
      <div className={`inline-flex items-center gap-3 ${className}`}>
        {renderSymbol(size)}
        <span
          style={{ color: colors.text }}
          className="font-sans font-medium text-xl sm:text-2xl tracking-tight leading-none select-none"
        >
          Orbit
        </span>
      </div>
    );
  }

  // 4. Default Symbol format
  return <div className={`inline-flex items-center justify-center ${className}`}>{renderSymbol(size)}</div>;
};
