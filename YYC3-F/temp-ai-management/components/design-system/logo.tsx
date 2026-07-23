"use client"

import { cn } from "@/lib/utils"
import Image from "next/image"

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "full" | "icon" | "text"
  className?: string
  animated?: boolean
}

const sizeClasses = {
  sm: "h-8",
  md: "h-12",
  lg: "h-16",
  xl: "h-24",
}

export function Logo({ size = "md", variant = "full", className, animated = false }: LogoProps) {
  return (
    <div
      className={cn(
        "flex items-center space-x-3",
        animated && "transition-all duration-300 hover:scale-105",
        className,
      )}
    >
      {(variant === "full" || variant === "icon") && (
        <div className={cn("relative flex-shrink-0", sizeClasses[size], animated && "animate-pulse")}>
          <Image
            src="/logo.png"
            alt="言语云 YanYu Cloud"
            width={96}
            height={96}
            className="w-auto h-full object-contain drop-shadow-lg"
            priority
          />
        </div>
      )}

      {(variant === "full" || variant === "text") && (
        <div className="flex flex-col">
          <h1
            className={cn(
              "font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent",
              size === "sm" && "text-lg",
              size === "md" && "text-xl",
              size === "lg" && "text-2xl",
              size === "xl" && "text-3xl",
            )}
          >
            言语云
          </h1>
          <p
            className={cn(
              "text-muted-foreground font-medium",
              size === "sm" && "text-xs",
              size === "md" && "text-sm",
              size === "lg" && "text-base",
              size === "xl" && "text-lg",
            )}
          >
            YanYu Cloud
          </p>
        </div>
      )}
    </div>
  )
}
