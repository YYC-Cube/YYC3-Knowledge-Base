/**
 * @description 霓虹发光卡片组件 - 支持赛博朋克和液态玻璃双主题
 * @module @yyc3/web-ui/components/NeonCard
 */

import React, { memo, useRef, useEffect, useState, type CSSProperties, type ReactNode } from 'react';

export type NeonCardThemeMode = 'cyberpunk' | 'liquidGlass';

export interface NeonCardProps {
  children: ReactNode;
  color?: string;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
  noReveal?: boolean;
  ariaLabel?: string;
  themeMode?: NeonCardThemeMode;
  style?: CSSProperties;
}

const LIQUID_COLOR_MAP: Record<string, string> = {
  '#00f0ff': '#00ff87',
  '#00d4ff': '#06b6d4',
  '#00ffcc': '#22d3ee',
  '#00ffc8': '#00ffaa',
  '#41ffdd': '#34d399',
  '#008b9d': '#0891b2',
};

export const NeonCard = memo(function NeonCard({
  children,
  color = '#00f0ff',
  className = '',
  hoverable = true,
  onClick,
  noReveal = false,
  ariaLabel,
  themeMode = 'cyberpunk',
  style,
}: NeonCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(noReveal);
  const isLiquid = themeMode === 'liquidGlass';

  const effectiveColor = isLiquid ? LIQUID_COLOR_MAP[color] || color : color;

  useEffect(() => {
    if (noReveal || revealed) return;
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [noReveal, revealed]);

  const getThemeStyles = (): CSSProperties => {
    const baseStyles: CSSProperties = {
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      willChange: hoverable ? 'transform, box-shadow' : 'auto',
      opacity: revealed ? 1 : 0,
      transform: revealed ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.96)',
    };

    if (isLiquid) {
      return {
        ...baseStyles,
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderTop: '1px solid rgba(255,255,255,0.18)',
        borderLeft: '1px solid rgba(255,255,255,0.14)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.08)',
        borderRadius: '20px',
      };
    }

    return {
      ...baseStyles,
      background: 'rgba(10,10,10,0.75)',
      backdropFilter: 'blur(20px) saturate(180%)',
      borderColor: `${effectiveColor}33`,
      border: `1px solid ${effectiveColor}33`,
      boxShadow: `0 0 10px ${effectiveColor}33, inset 0 0 15px ${effectiveColor}0d`,
    };
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hoverable) {
      const target = e.currentTarget;
      if (isLiquid) {
        target.style.background = 'rgba(255,255,255,0.10)';
        target.style.boxShadow =
          '0 16px 40px rgba(0,0,0,0.12), 0 0 30px rgba(0,255,135,0.1), inset 0 1px 0 rgba(255,255,255,0.12)';
      } else {
        target.style.borderColor = `${effectiveColor}80`;
        target.style.boxShadow = `0 0 20px ${effectiveColor}66, 0 0 40px ${effectiveColor}33, inset 0 0 20px ${effectiveColor}1a`;
      }
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hoverable) {
      const target = e.currentTarget;
      if (isLiquid) {
        target.style.background = 'rgba(255,255,255,0.06)';
        target.style.boxShadow =
          '0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.08)';
      } else {
        target.style.borderColor = `${effectiveColor}33`;
        target.style.boxShadow = `0 0 10px ${effectiveColor}33, inset 0 0 15px ${effectiveColor}0d`;
      }
    }
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      data-neon-card=""
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`
        relative overflow-hidden rounded-2xl p-5
        transition-all duration-400
        ${hoverable ? 'cursor-pointer hover:-translate-y-2 hover:scale-[1.02]' : ''}
        ${className}
      `}
      style={{ ...getThemeStyles(), ...style }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="absolute top-0 left-0 w-1/2 h-full pointer-events-none opacity-0 hover:opacity-100"
        style={{
          background: isLiquid
            ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
          animation: 'shimmer-move 3s ease-in-out infinite',
        }}
      />
      {!isLiquid && (
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: `linear-gradient(${effectiveColor}0f 1px, transparent 1px), linear-gradient(90deg, ${effectiveColor}0f 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
});

export default NeonCard;
