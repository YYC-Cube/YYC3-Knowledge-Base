/**
 * YYC3 Holo Card — Holographic card with animated border sweep
 * @description Applies cyberpunk holographic gradient effect via CSS class;
 *   falls back to clean card styling in modern theme.
 * @version 4.8.0
 */
import { type ReactNode } from "react";
import { useThemeStore } from "../store/theme-store";

interface HoloCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: "cyan" | "magenta" | "yellow";
}

export function HoloCard({ children, className = "" }: HoloCardProps) {
  const { tokens, isCyberpunk } = useThemeStore();

  return (
    <div
      className={`${isCyberpunk ? "holo-card" : ""} rounded-lg p-4 backdrop-blur-sm ${className}`}
      style={{
        background: isCyberpunk ? undefined : tokens.cardBg,
        border: `1px solid ${tokens.cardBorder}`,
        boxShadow: tokens.shadow,
        borderRadius: tokens.borderRadius,
      }}
    >
      {children}
    </div>
  );
}