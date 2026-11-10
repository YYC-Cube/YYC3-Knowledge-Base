"use client"

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface EnhancedCardProps {
  children: ReactNode
  variant?: "default" | "elevated" | "glass" | "gradient" | "traditional"
  size?: "sm" | "md" | "lg"
  interactive?: boolean
  className?: string
  glowEffect?: boolean
}

const variantClasses = {
  default: "bg-white border border-secondary-200 shadow-md",
  elevated: "bg-white border border-secondary-200 shadow-lg hover:shadow-xl transition-shadow duration-300",
  glass: "bg-white/90 backdrop-blur-md border border-white/30 shadow-lg",
  gradient: "bg-gradient-to-br from-white via-primary-50/30 to-accent-50/30 border border-primary-200/50 shadow-lg",
  traditional: "bg-white border-2 border-traditional-ink/10 shadow-lg hover:shadow-xl transition-all duration-300",
}

const sizeClasses = {
  sm: "p-4 rounded-lg",
  md: "p-6 rounded-xl",
  lg: "p-8 rounded-2xl",
}

export function EnhancedCard({
  children,
  variant = "default",
  size = "md",
  interactive = false,
  glowEffect = false,
  className,
}: EnhancedCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        variantClasses[variant],
        sizeClasses[size],
        interactive && "cursor-pointer transform hover:scale-[1.02] hover:-translate-y-1",
        glowEffect && "hover:shadow-primary-500/25 hover:shadow-2xl",
        className,
      )}
    >
      {/* 装饰性渐变背景 */}
      {variant === "traditional" && (
        <div className="absolute inset-0 bg-gradient-to-br from-traditional-azure/5 via-transparent to-traditional-jade/5 pointer-events-none" />
      )}

      {/* 内容区域 */}
      <div className="relative z-10">{children}</div>

      {/* 光效装饰 */}
      {glowEffect && (
        <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary-400 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent-400 to-transparent" />
        </div>
      )}
    </div>
  )
}
