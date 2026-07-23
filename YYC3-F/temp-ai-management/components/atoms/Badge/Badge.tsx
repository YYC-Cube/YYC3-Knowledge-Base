"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-gray-800 hover:bg-gray-200",
        primary: "bg-blue-100 text-blue-800 hover:bg-blue-200",
        success: "bg-green-100 text-green-800 hover:bg-green-200",
        warning: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
        danger: "bg-red-100 text-red-800 hover:bg-red-200",
        info: "bg-cyan-100 text-cyan-800 hover:bg-cyan-200",
        purple: "bg-purple-100 text-purple-800 hover:bg-purple-200",
        outline: "border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50",
      },
      size: {
        sm: "text-xs px-2 py-0.5",
        md: "text-sm px-2.5 py-0.5",
        lg: "text-base px-3 py-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  onRemove?: () => void
  removable?: boolean
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, leftIcon, rightIcon, onRemove, removable, children, ...props }, ref) => {
    return (
      <span className={cn(badgeVariants({ variant, size }), className)} ref={ref} {...props}>
        {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {(removable || onRemove) && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center rounded-full hover:bg-black/10 p-0.5 transition-colors"
            aria-label="Remove"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        {!removable && !onRemove && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </span>
    )
  },
)
Badge.displayName = "Badge"

export { Badge, badgeVariants }
