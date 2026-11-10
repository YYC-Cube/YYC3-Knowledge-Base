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
import { Leaf, Sun, TreePine, Snowflake, Calendar, Sparkles } from "lucide-react"
import type { Season } from "./seasonal-themes"
import { useSound } from "./sound-system"

interface SeasonalControlsProps {
  onSeasonChange: (season: Season) => void
  onAutoDetectToggle: () => void
  currentSeason: Season
  autoDetect: boolean
}

const seasonOptions = [
  {
    id: "spring" as Season,
    name: "春季",
    icon: Leaf,
    description: "樱花飞舞，生机盎然",
    colors: "from-green-400 to-pink-400",
    bgColor: "bg-green-50 dark:bg-green-950",
  },
  {
    id: "summer" as Season,
    name: "夏季",
    icon: Sun,
    description: "阳光明媚，活力四射",
    colors: "from-blue-400 to-orange-400",
    bgColor: "bg-blue-50 dark:bg-blue-950",
  },
  {
    id: "autumn" as Season,
    name: "秋季",
    icon: TreePine,
    description: "枫叶满山，金桂飘香",
    colors: "from-orange-400 to-red-400",
    bgColor: "bg-orange-50 dark:bg-orange-950",
  },
  {
    id: "winter" as Season,
    name: "冬季",
    icon: Snowflake,
    description: "雪花纷飞，银装素裹",
    colors: "from-blue-400 to-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-950",
  },
]

export function SeasonalControls({
  onSeasonChange,
  onAutoDetectToggle,
  currentSeason,
  autoDetect,
}: SeasonalControlsProps) {
  const { playSound } = useSound()
  const currentSeasonOption = seasonOptions.find((season) => season.id === currentSeason)

  const handleSeasonChange = (season: Season) => {
    playSound("seasonal")
    onSeasonChange(season)
  }

  const handleAutoDetectToggle = () => {
    playSound("click")
    onAutoDetectToggle()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="cloud-card bg-transparent"
          aria-label={`当前季节主题：${currentSeasonOption?.name}，${autoDetect ? "自动检测模式" : "手动选择模式"}，点击查看更多选项`}
        >
          {currentSeasonOption?.icon && <currentSeasonOption.icon className="w-4 h-4 mr-2" />}
          {currentSeasonOption?.name}
          <Badge variant="secondary" className="ml-2">
            {autoDetect ? "自动" : "手动"}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" aria-describedby="seasonal-controls-description">
        <div id="seasonal-controls-description" className="sr-only">
          季节主题控制面板，可以选择不同的季节主题或开启自动检测模式
        </div>

        <DropdownMenuLabel className="flex items-center justify-between">
          <span>季节主题</span>
          <Sparkles className="h-4 w-4 text-yellow-500" />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* 自动检测选项 */}
        <DropdownMenuItem
          onClick={handleAutoDetectToggle}
          className={autoDetect ? "bg-blue-50 dark:bg-blue-950" : ""}
          aria-label={autoDetect ? "当前为自动检测模式，点击切换到手动模式" : "当前为手动模式，点击切换到自动检测模式"}
        >
          <Calendar className="w-4 h-4 mr-2" />
          <div className="flex flex-col">
            <span className="font-medium">自动检测</span>
            <span className="text-xs text-muted-foreground">根据当前日期自动切换</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* 季节选项 */}
        {seasonOptions.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => handleSeasonChange(option.id)}
            className={currentSeason === option.id && !autoDetect ? option.bgColor : ""}
            aria-label={`选择${option.name}主题：${option.description}${currentSeason === option.id ? "（当前选中）" : ""}`}
          >
            <div className="flex items-center w-full">
              <div className={`p-1 rounded-full bg-gradient-to-r ${option.colors} mr-3`}>
                <option.icon className="w-3 h-3 text-white" />
              </div>
              <div className="flex flex-col flex-1">
                <span className="font-medium">{option.name}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </div>
              {currentSeason === option.id && (
                <Badge variant="outline" className="ml-2 text-xs">
                  当前
                </Badge>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
