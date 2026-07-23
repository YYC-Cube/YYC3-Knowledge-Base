"use client"

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface DesignCardProps {
  children: ReactNode
  variant?: "default" | "elevated" | "glass" | "gradient"
  size?: "sm" | "md" | "lg"
  interactive?: boolean
  className?: string
}

const variantClasses = {
  default: "bg-card border shadow-sm",
  elevated: "bg-card border shadow-lg hover:shadow-xl transition-shadow duration-300",
  glass: "bg-card/80 backdrop-blur-sm border border-white/20 shadow-lg",
  gradient: "bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 border shadow-lg",
}

const sizeClasses = {
  sm: "p-4 rounded-lg",
  md: "p-6 rounded-xl",
  lg: "p-8 rounded-2xl",
}

export function DesignCard({
  children,
  variant = "default",
  size = "md",
  interactive = false,
  className,
}: DesignCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        variantClasses[variant],
        sizeClasses[size],
        interactive && "cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1",
        className,
      )}
    >
      {variant === "gradient" && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 pointer-events-none" />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
