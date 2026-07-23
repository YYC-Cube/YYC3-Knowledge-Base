"use client"

import { cn } from "@/lib/utils"
import Image from "next/image"

interface LogoEnhancedProps {
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "full" | "icon" | "text"
  className?: string
  animated?: boolean
  layout?: "horizontal" | "vertical"
}

const sizeClasses = {
  sm: { logo: "h-6", text: "text-sm", spacing: "space-y-0.5" },
  md: { logo: "h-8", text: "text-base", spacing: "space-y-1" },
  lg: { logo: "h-10", text: "text-lg", spacing: "space-y-1" },
  xl: { logo: "h-12", text: "text-xl", spacing: "space-y-1.5" },
}

export function LogoEnhanced({
  size = "md",
  variant = "full",
  className,
  animated = false,
  layout = "vertical",
}: LogoEnhancedProps) {
  const sizes = sizeClasses[size]

  if (layout === "horizontal") {
    return (
      <div
        className={cn(
          "flex items-center space-x-3",
          animated && "transition-all duration-300 hover:scale-105",
          className,
        )}
      >
        {(variant === "full" || variant === "icon") && (
          <div className={cn("relative flex-shrink-0", sizes.logo, animated && "animate-pulse")}>
            <Image
              src="/logo.png"
              alt="YanYu Cloud³"
              width={48}
              height={48}
              className="w-auto h-full object-contain drop-shadow-lg"
              priority
            />
          </div>
        )}

        {(variant === "full" || variant === "text") && (
          <div className="flex flex-col">
            <h1
              className={cn(
                "font-bold bg-gradient-to-r from-primary-500 via-primary-400 to-accent-500 bg-clip-text text-transparent",
                sizes.text,
              )}
            >
              YanYu Cloud³
            </h1>
          </div>
        )}
      </div>
    )
  }

  // 垂直布局 - 导航栏专用
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        sizes.spacing,
        animated && "transition-all duration-300 hover:scale-105",
        className,
      )}
    >
      {(variant === "full" || variant === "icon") && (
        <div className={cn("relative flex-shrink-0", sizes.logo, animated && "animate-pulse")}>
          <Image
            src="/logo.png"
            alt="YanYu Cloud³"
            width={48}
            height={48}
            className="w-auto h-full object-contain drop-shadow-lg"
            priority
          />
        </div>
      )}

      {(variant === "full" || variant === "text") && (
        <div className="flex flex-col items-center">
          <h1
            className={cn(
              "font-bold bg-gradient-to-r from-primary-500 via-primary-400 to-accent-500 bg-clip-text text-transparent leading-tight",
              sizes.text,
            )}
          >
            YanYu Cloud³
          </h1>
          <p
            className={cn(
              "text-secondary-500 font-medium leading-tight",
              size === "sm" && "text-xs",
              size === "md" && "text-xs",
              size === "lg" && "text-sm",
              size === "xl" && "text-base",
            )}
          >
            Smart Business Center
          </p>
        </div>
      )}
    </div>
  )
}
