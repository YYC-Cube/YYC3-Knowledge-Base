"use client"

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface AnimatedContainerProps {
  children: ReactNode
  animation?: "fadeIn" | "slideUp" | "slideDown" | "slideLeft" | "slideRight" | "scale" | "bounce"
  delay?: number
  duration?: number
  className?: string
}

const animationClasses = {
  fadeIn: "animate-in fade-in",
  slideUp: "animate-in slide-in-from-bottom-4",
  slideDown: "animate-in slide-in-from-top-4",
  slideLeft: "animate-in slide-in-from-right-4",
  slideRight: "animate-in slide-in-from-left-4",
  scale: "animate-in zoom-in-95",
  bounce: "animate-bounce",
}

export function AnimatedContainer({
  children,
  animation = "fadeIn",
  delay = 0,
  duration = 300,
  className,
}: AnimatedContainerProps) {
  return (
    <div
      className={cn(animationClasses[animation], className)}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  )
}

export function FloatingElement({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("animate-float", className)}>{children}</div>
}
