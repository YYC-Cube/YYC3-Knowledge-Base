/**
 * @description 赛博朋克风格文字故障效果组件
 * @module @yyc3/web-ui/components/GlitchText
 */

import { useState, useEffect, useRef, useCallback, memo, type CSSProperties } from 'react';

export interface GlitchTextProps {
  children: string;
  color?: string;
  className?: string;
  style?: CSSProperties;
  inline?: boolean;
  interval?: [number, number] | null;
  intensity?: number;
  as?: 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'p';
  enabled?: boolean;
}

export const GlitchText = memo(function GlitchText({
  children,
  color = '#00f0ff',
  className = '',
  style,
  inline = true,
  interval = [3000, 8000],
  intensity = 1,
  as: Tag = 'span',
  enabled = true,
}: GlitchTextProps) {
  const [isGlitching, setIsGlitching] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const shouldAnimate = enabled && !prefersReducedMotion;

  useEffect(() => {
    if (!shouldAnimate || !interval) return;

    const scheduleGlitch = () => {
      const [min, max] = interval;
      const delay = min + Math.random() * (max - min);
      timerRef.current = setTimeout(() => {
        setIsGlitching(true);
        setTimeout(() => {
          setIsGlitching(false);
          scheduleGlitch();
        }, 150 + Math.random() * 250);
      }, delay);
    };

    scheduleGlitch();
    return () => clearTimeout(timerRef.current);
  }, [shouldAnimate, interval]);

  const handleMouseEnter = useCallback(() => {
    if (shouldAnimate) setIsHovering(true);
  }, [shouldAnimate]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
  }, []);

  const active = shouldAnimate && (isGlitching || isHovering);
  const hoverActive = shouldAnimate && isHovering;
  const px = Math.round(3 * intensity);

  return (
    <Tag
      className={`${inline ? 'inline-block' : 'block'} relative ${className}`}
      style={{
        ...style,
        color,
        willChange: active ? 'transform, clip-path' : 'auto',
        animation: active
          ? `glitch-skew ${hoverActive ? '0.3s' : '0.5s'} ease-in-out`
          : undefined,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label={children}
    >
      <span
        className="relative z-10"
        style={{
          animation: active
            ? `glitch-color-shift ${hoverActive ? '0.15s' : '0.3s'} ease-in-out`
            : undefined,
        }}
      >
        {children}
      </span>

      {active && (
        <span
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            color: '#00d4ff',
            opacity: 0.7 * intensity,
            animation: hoverActive
              ? 'glitch-text-hover 0.4s steps(2, start) infinite'
              : 'glitch-text-1 0.4s steps(2, start)',
            textShadow: `${px}px 0 #00d4ff`,
          }}
          aria-hidden="true"
        >
          {children}
        </span>
      )}

      {active && (
        <span
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            color: '#00d4ff',
            opacity: 0.5 * intensity,
            animation: hoverActive
              ? 'glitch-text-hover 0.35s steps(2, start) 0.05s infinite'
              : 'glitch-text-2 0.35s steps(2, start)',
            textShadow: `${-px}px 0 #00d4ff`,
          }}
          aria-hidden="true"
        >
          {children}
        </span>
      )}
    </Tag>
  );
});

export default GlitchText;
