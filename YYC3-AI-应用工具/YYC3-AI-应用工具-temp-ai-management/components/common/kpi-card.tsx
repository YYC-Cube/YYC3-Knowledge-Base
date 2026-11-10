"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: LucideIcon
  trend?: "up" | "down" | "neutral"
  iconColor?: string
  iconBgColor?: string
  loading?: boolean
  description?: string
}

export function KpiCard({
  title,
  value,
  change,
  changeLabel = "vs 上期",
  icon: Icon,
  trend,
  iconColor = "text-blue-600",
  iconBgColor = "bg-blue-50",
  loading = false,
  description,
}: KpiCardProps) {
  const getTrendIcon = () => {
    if (trend === "up") return <TrendingUp className="h-3 w-3" />
    if (trend === "down") return <TrendingDown className="h-3 w-3" />
    return <Minus className="h-3 w-3" />
  }

  const getTrendColor = () => {
    if (trend === "up") return "text-green-600 bg-green-50"
    if (trend === "down") return "text-red-600 bg-red-50"
    return "text-gray-600 bg-gray-50"
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
          <div className={cn("p-2 rounded-lg", iconBgColor)}>
            <div className="h-4 w-4 bg-gray-300 animate-pulse rounded" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-8 w-32 bg-gray-200 animate-pulse rounded mb-2" />
          <div className="h-3 w-20 bg-gray-200 animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && (
          <div className={cn("p-2 rounded-lg", iconBgColor)}>
            <Icon className={cn("h-4 w-4", iconColor)} />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-1">{value}</div>
        {change !== undefined && (
          <div className="flex items-center space-x-1">
            <Badge variant="secondary" className={cn("text-xs font-medium", getTrendColor())}>
              {getTrendIcon()}
              <span className="ml-1">
                {change > 0 ? "+" : ""}
                {change}%
              </span>
            </Badge>
            <span className="text-xs text-muted-foreground">{changeLabel}</span>
          </div>
        )}
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  )
}
