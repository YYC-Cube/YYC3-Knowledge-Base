"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"

interface DesignButtonProps {
  children: ReactNode
  variant?: "default" | "primary" | "secondary" | "ghost" | "cloud"
  size?: "sm" | "md" | "lg"
  loading?: boolean
  className?: string
  onClick?: () => void
  disabled?: boolean
}

const variantClasses = {
  default: "bg-background hover:bg-accent",
  primary:
    "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl",
  secondary: "bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-900",
  ghost: "hover:bg-blue-50 hover:text-blue-600",
  cloud:
    "bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-200 hover:from-blue-500/20 hover:to-cyan-500/20 text-blue-700",
}

export function DesignButton({
  children,
  variant = "default",
  size = "md",
  loading = false,
  className,
  onClick,
  disabled,
}: DesignButtonProps) {
  return (
    <Button
      className={cn("transition-all duration-300 transform hover:scale-105", variantClasses[variant], className)}
      size={size}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  )
}
