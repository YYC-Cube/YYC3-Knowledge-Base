"use client"

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface DynamicBackgroundProps {
  children: ReactNode
  variant?: "aurora" | "cloud" | "ocean" | "galaxy" | "gradient" | "particles"
  intensity?: "subtle" | "medium" | "strong"
  className?: string
}

const backgroundVariants = {
  aurora: {
    subtle: "bg-gradient-to-br from-purple-100/30 via-blue-100/30 to-cyan-100/30",
    medium: "bg-gradient-to-br from-purple-200/50 via-blue-200/50 to-cyan-200/50",
    strong: "bg-gradient-to-br from-purple-300/70 via-blue-300/70 to-cyan-300/70",
  },
  cloud: {
    subtle: "bg-gradient-to-br from-blue-50/40 via-white/60 to-cyan-50/40",
    medium: "bg-gradient-to-br from-blue-100/60 via-white/80 to-cyan-100/60",
    strong: "bg-gradient-to-br from-blue-200/80 via-white to-cyan-200/80",
  },
  ocean: {
    subtle: "bg-gradient-to-br from-blue-100/30 via-teal-100/30 to-cyan-100/30",
    medium: "bg-gradient-to-br from-blue-200/50 via-teal-200/50 to-cyan-200/50",
    strong: "bg-gradient-to-br from-blue-300/70 via-teal-300/70 to-cyan-300/70",
  },
  galaxy: {
    subtle: "bg-gradient-to-br from-indigo-100/30 via-purple-100/30 to-pink-100/30",
    medium: "bg-gradient-to-br from-indigo-200/50 via-purple-200/50 to-pink-200/50",
    strong: "bg-gradient-to-br from-indigo-300/70 via-purple-300/70 to-pink-300/70",
  },
  gradient: {
    subtle: "bg-gradient-to-br from-gray-50 via-blue-50/50 to-cyan-50",
    medium: "bg-gradient-to-br from-gray-100 via-blue-100/70 to-cyan-100",
    strong: "bg-gradient-to-br from-gray-200 via-blue-200 to-cyan-200",
  },
  particles: {
    subtle: "bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50",
    medium: "bg-gradient-to-br from-slate-100 via-blue-100/50 to-indigo-100",
    strong: "bg-gradient-to-br from-slate-200 via-blue-200/70 to-indigo-200",
  },
}

export function DynamicBackground({
  children,
  variant = "cloud",
  intensity = "subtle",
  className,
}: DynamicBackgroundProps) {
  return (
    <div
      className={cn(
        "relative min-h-screen overflow-hidden",
        "animate-gradient-shift",
        backgroundVariants[variant][intensity],
        className,
      )}
      style={{
        backgroundSize: "400% 400%",
      }}
    >
      {/* 动态粒子效果 */}
      {variant === "particles" && <ParticleEffect />}

      {/* 浮动云朵效果 */}
      {variant === "cloud" && <FloatingClouds />}

      {/* 极光效果 */}
      {variant === "aurora" && <AuroraEffect />}

      {/* 内容区域 */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}

function ParticleEffect() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-blue-400/30 rounded-full animate-float-random"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
          }}
        />
      ))}
    </div>
  )
}

function FloatingClouds() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="absolute opacity-20 animate-cloud-drift"
          style={{
            left: `${-10 + Math.random() * 120}%`,
            top: `${Math.random() * 80}%`,
            animationDelay: `${Math.random() * 10}s`,
            animationDuration: `${20 + Math.random() * 20}s`,
          }}
        >
          <div className="w-16 h-8 bg-white rounded-full blur-sm" />
          <div className="w-12 h-6 bg-white rounded-full blur-sm -mt-4 ml-4" />
          <div className="w-8 h-4 bg-white rounded-full blur-sm -mt-3 ml-8" />
        </div>
      ))}
    </div>
  )
}

function AuroraEffect() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 animate-aurora-wave" />
      <div className="absolute inset-0 bg-gradient-to-l from-pink-500/10 via-purple-500/10 to-blue-500/10 animate-aurora-wave-reverse" />
    </div>
  )
}
