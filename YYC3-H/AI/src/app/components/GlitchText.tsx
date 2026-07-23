/**
 * YYC3 Glitch Text — Periodic glitch animation for cyberpunk text elements
 * @description Renders text with a timed glitch CSS animation in cyberpunk mode;
 *   no effect in clean theme.
 * @version 4.8.0
 */
import { useState, useEffect } from "react";
import { useThemeStore } from "../store/theme-store";

interface GlitchTextProps {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "span" | "div" | "p";
}

export function GlitchText({ text, className = "", as: Tag = "span" }: GlitchTextProps) {
  const [glitching, setGlitching] = useState(false);
  const { tokens } = useThemeStore();

  useEffect(() => {
    // Only run glitch effect in cyberpunk mode
    if (!tokens.enableGlitch) return;
    const interval = setInterval(() => {
      setGlitching(true);
      setTimeout(() => setGlitching(false), 200);
    }, 4000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, [tokens.enableGlitch]);

  return (
    <Tag
      className={`relative inline-block ${className} ${glitching && tokens.enableGlitch ? "cyberpunk-glitch" : ""}`}
      data-text={text}
      style={{ fontFamily: tokens.fontDisplay }}
    >
      {text}
    </Tag>
  );
}