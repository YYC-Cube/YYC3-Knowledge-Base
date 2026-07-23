"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export type Season = "spring" | "summer" | "autumn" | "winter"

interface SeasonalThemeContextType {
  season: Season
  autoDetect: boolean
  changeSeason: (season: Season) => void
  enableAutoDetect: (enabled: boolean) => void
}

const SeasonalThemeContext = createContext<SeasonalThemeContextType | null>(null)

export function useSeasonalTheme() {
  const context = useContext(SeasonalThemeContext)
  if (!context) {
    // Return default values instead of throwing error
    return {
      season: "spring" as Season,
      autoDetect: false,
      changeSeason: () => {},
      enableAutoDetect: () => {},
    }
  }
  return context
}

interface SeasonalThemeProviderProps {
  children: ReactNode
  defaultSeason?: Season
  defaultAutoDetect?: boolean
}

export function SeasonalThemeProvider({
  children,
  defaultSeason = "spring",
  defaultAutoDetect = true,
}: SeasonalThemeProviderProps) {
  const [season, setSeason] = useState<Season>(defaultSeason)
  const [autoDetect, setAutoDetect] = useState(defaultAutoDetect)

  // 自动检测季节
  useEffect(() => {
    if (autoDetect) {
      const now = new Date()
      const month = now.getMonth() + 1 // 0-11 -> 1-12

      let detectedSeason: Season
      if (month >= 3 && month <= 5) {
        detectedSeason = "spring"
      } else if (month >= 6 && month <= 8) {
        detectedSeason = "summer"
      } else if (month >= 9 && month <= 11) {
        detectedSeason = "autumn"
      } else {
        detectedSeason = "winter"
      }

      setSeason(detectedSeason)
    }
  }, [autoDetect])

  const changeSeason = (newSeason: Season) => {
    if (!newSeason) return
    setSeason(newSeason)
    setAutoDetect(false) // 手动选择时关闭自动检测
  }

  const enableAutoDetect = (enabled: boolean) => {
    setAutoDetect(enabled)
  }

  return (
    <SeasonalThemeContext.Provider
      value={{
        season,
        autoDetect,
        changeSeason,
        enableAutoDetect,
      }}
    >
      {children}
    </SeasonalThemeContext.Provider>
  )
}

interface SeasonalThemeProps {
  season: Season
  autoDetect: boolean
  children: ReactNode
  className?: string
}

export function SeasonalTheme({ season = "spring", autoDetect, children, className }: SeasonalThemeProps) {
  const getSeasonalClasses = (currentSeason: Season) => {
    const seasonClasses = {
      spring: "seasonal-spring",
      summer: "seasonal-summer",
      autumn: "seasonal-autumn",
      winter: "seasonal-winter",
    }

    return seasonClasses[currentSeason] || seasonClasses.spring
  }

  const getSeasonalStyles = (currentSeason: Season) => {
    const seasonStyles = {
      spring: {
        "--seasonal-primary": "120, 100%, 25%", // 春绿
        "--seasonal-secondary": "60, 100%, 85%", // 嫩黄
        "--seasonal-accent": "300, 50%, 70%", // 樱花粉
        "--seasonal-background": "120, 30%, 97%",
        "--seasonal-text": "120, 20%, 20%",
      },
      summer: {
        "--seasonal-primary": "200, 100%, 40%", // 海蓝
        "--seasonal-secondary": "45, 100%, 80%", // 阳光黄
        "--seasonal-accent": "15, 100%, 60%", // 橙红
        "--seasonal-background": "200, 30%, 98%",
        "--seasonal-text": "200, 30%, 15%",
      },
      autumn: {
        "--seasonal-primary": "25, 80%, 45%", // 枫叶红
        "--seasonal-secondary": "35, 90%, 70%", // 金黄
        "--seasonal-accent": "15, 70%, 55%", // 橘色
        "--seasonal-background": "35, 20%, 96%",
        "--seasonal-text": "25, 30%, 20%",
      },
      winter: {
        "--seasonal-primary": "210, 50%, 35%", // 冬日蓝
        "--seasonal-secondary": "0, 0%, 90%", // 雪白
        "--seasonal-accent": "340, 60%, 65%", // 梅花红
        "--seasonal-background": "210, 20%, 98%",
        "--seasonal-text": "210, 30%, 15%",
      },
    }

    return seasonStyles[currentSeason] || seasonStyles.spring
  }

  return (
    <div
      className={cn(
        "seasonal-theme-container transition-all duration-1000 ease-in-out",
        getSeasonalClasses(season),
        className,
      )}
      style={getSeasonalStyles(season) as React.CSSProperties}
      data-season={season}
      data-auto-detect={autoDetect}
    >
      {children}
    </div>
  )
}

// 季节主题Hook，用于获取当前季节的样式
export function useSeasonalStyles() {
  const { season } = useSeasonalTheme()

  const getSeasonalColor = (type: "primary" | "secondary" | "accent" | "background" | "text") => {
    const element = document.documentElement
    return getComputedStyle(element).getPropertyValue(`--seasonal-${type}`)
  }

  const getSeasonalGradient = () => {
    const seasonGradients = {
      spring: "linear-gradient(135deg, hsl(120, 100%, 25%) 0%, hsl(60, 100%, 85%) 50%, hsl(300, 50%, 70%) 100%)",
      summer: "linear-gradient(135deg, hsl(200, 100%, 40%) 0%, hsl(45, 100%, 80%) 50%, hsl(15, 100%, 60%) 100%)",
      autumn: "linear-gradient(135deg, hsl(25, 80%, 45%) 0%, hsl(35, 90%, 70%) 50%, hsl(15, 70%, 55%) 100%)",
      winter: "linear-gradient(135deg, hsl(210, 50%, 35%) 0%, hsl(0, 0%, 90%) 50%, hsl(340, 60%, 65%) 100%)",
    }

    return seasonGradients[season] || seasonGradients.spring
  }

  return {
    season,
    getSeasonalColor,
    getSeasonalGradient,
  }
}
