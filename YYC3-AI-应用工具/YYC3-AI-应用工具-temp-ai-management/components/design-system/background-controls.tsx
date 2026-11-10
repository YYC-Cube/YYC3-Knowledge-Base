"use client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Palette, Cloud, Waves, Sparkles, Zap, Mountain, Settings } from "lucide-react"

interface BackgroundControlsProps {
  onVariantChange: (variant: string) => void
  onIntensityChange: (intensity: string) => void
  currentVariant: string
  currentIntensity: string
}

const backgroundOptions = [
  { id: "cloud", name: "云端", icon: Cloud, description: "轻盈云朵效果" },
  { id: "aurora", name: "极光", icon: Zap, description: "绚烂极光效果" },
  { id: "ocean", name: "海洋", icon: Waves, description: "深邃海洋效果" },
  { id: "galaxy", name: "星系", icon: Sparkles, description: "神秘星系效果" },
  { id: "gradient", name: "渐变", icon: Mountain, description: "简约渐变效果" },
  { id: "particles", name: "粒子", icon: Settings, description: "动态粒子效果" },
]

const intensityOptions = [
  { id: "subtle", name: "轻柔", description: "淡雅效果" },
  { id: "medium", name: "适中", description: "平衡效果" },
  { id: "strong", name: "强烈", description: "鲜明效果" },
]

export function BackgroundControls({
  onVariantChange,
  onIntensityChange,
  currentVariant,
  currentIntensity,
}: BackgroundControlsProps) {
  const currentBg = backgroundOptions.find((bg) => bg.id === currentVariant)
  const currentInt = intensityOptions.find((int) => int.id === currentIntensity)

  return (
    <div className="flex items-center space-x-2">
      {/* 背景类型选择 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="cloud-card bg-transparent">
            {currentBg?.icon && <currentBg.icon className="w-4 h-4 mr-2" />}
            {currentBg?.name}
            <Badge variant="secondary" className="ml-2">
              背景
            </Badge>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>选择背景效果</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {backgroundOptions.map((option) => (
            <DropdownMenuItem
              key={option.id}
              onClick={() => onVariantChange(option.id)}
              className={currentVariant === option.id ? "bg-blue-50 dark:bg-blue-950" : ""}
            >
              <option.icon className="w-4 h-4 mr-2" />
              <div className="flex flex-col">
                <span className="font-medium">{option.name}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 强度选择 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="cloud-card bg-transparent">
            <Palette className="w-4 h-4 mr-2" />
            {currentInt?.name}
            <Badge variant="secondary" className="ml-2">
              强度
            </Badge>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48">
          <DropdownMenuLabel>调整效果强度</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {intensityOptions.map((option) => (
            <DropdownMenuItem
              key={option.id}
              onClick={() => onIntensityChange(option.id)}
              className={currentIntensity === option.id ? "bg-blue-50 dark:bg-blue-950" : ""}
            >
              <div className="flex flex-col">
                <span className="font-medium">{option.name}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
