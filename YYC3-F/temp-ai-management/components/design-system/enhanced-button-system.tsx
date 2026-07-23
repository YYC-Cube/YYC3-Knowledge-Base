"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"

interface EnhancedButtonProps {
  children: ReactNode
  variant?: "default" | "primary" | "secondary" | "ghost" | "accent" | "traditional"
  size?: "sm" | "md" | "lg"
  loading?: boolean
  glowEffect?: boolean
  className?: string
  onClick?: () => void
  disabled?: boolean
}

const variantClasses = {
  default: "bg-white hover:bg-secondary-50 text-secondary-900 border border-secondary-200",
  primary:
    "bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg hover:shadow-xl",
  secondary: "bg-secondary-100 hover:bg-secondary-200 text-secondary-900 border border-secondary-300",
  ghost: "hover:bg-primary-50 hover:text-primary-700 text-secondary-700",
  accent:
    "bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white shadow-lg hover:shadow-xl",
  traditional:
    "bg-gradient-to-r from-traditional-azure to-traditional-jade hover:from-traditional-azure/90 hover:to-traditional-jade/90 text-white shadow-lg hover:shadow-xl",
}

export function EnhancedButton({
  children,
  variant = "default",
  size = "md",
  loading = false,
  glowEffect = false,
  className,
  onClick,
  disabled,
}: EnhancedButtonProps) {
  return (
    <Button
      className={cn(
        "transition-all duration-300 transform hover:scale-105 font-medium",
        variantClasses[variant],
        glowEffect && "hover:shadow-2xl hover:shadow-primary-500/25",
        className,
      )}
      size={size}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  )
}
