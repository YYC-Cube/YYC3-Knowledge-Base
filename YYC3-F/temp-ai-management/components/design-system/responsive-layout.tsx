"use client"

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import { useState, useEffect } from "react"

interface ResponsiveLayoutProps {
  children: ReactNode
  className?: string
}

// 设备类型检测 Hook
export function useDeviceType() {
  const [deviceType, setDeviceType] = useState<"mobile" | "tablet" | "desktop">("desktop")

  useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth
      if (width < 768) {
        setDeviceType("mobile")
      } else if (width < 1024) {
        setDeviceType("tablet")
      } else {
        setDeviceType("desktop")
      }
    }

    checkDeviceType()
    window.addEventListener("resize", checkDeviceType)
    return () => window.removeEventListener("resize", checkDeviceType)
  }, [])

  return deviceType
}

// 响应式容器组件
export function ResponsiveContainer({ children, className }: ResponsiveLayoutProps) {
  const deviceType = useDeviceType()

  return (
    <div
      className={cn(
        // 基础布局
        "w-full h-screen flex",
        // 响应式断点
        "min-h-screen max-h-screen",
        // 防止内容溢出
        "overflow-hidden",
        // 移动端优化
        deviceType === "mobile" && "flex-col",
        className,
      )}
    >
      {children}
    </div>
  )
}

// 侧边栏容器 - 增强移动端适配
export function SidebarContainer({ children, className }: ResponsiveLayoutProps) {
  const deviceType = useDeviceType()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  return (
    <>
      {/* 移动端侧边栏遮罩 */}
      {deviceType === "mobile" && isMobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileSidebarOpen(false)} />
      )}

      <aside
        className={cn(
          // 基础样式
          "bg-white/95 backdrop-blur-sm border-r border-secondary-200/50",
          // 桌面端固定宽度
          "hidden lg:flex lg:flex-col",
          // 响应式宽度 - 根据屏幕尺寸调整
          deviceType === "desktop" && "lg:w-52 xl:w-56 2xl:w-60", // 208px, 224px, 240px
          deviceType === "tablet" && "lg:w-48 xl:w-52", // 192px, 208px
          // 移动端全屏侧边栏
          deviceType === "mobile" &&
            isMobileSidebarOpen && [
              "fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw]",
              "flex flex-col lg:hidden",
              "transform transition-transform duration-300 ease-in-out",
            ],
          // 高度和溢出控制
          "h-full flex-shrink-0",
          className,
        )}
      >
        {children}
      </aside>
    </>
  )
}

// 主内容区域 - 增强移动端体验
export function MainContentContainer({ children, className }: ResponsiveLayoutProps) {
  const deviceType = useDeviceType()

  return (
    <main
      className={cn(
        // Flex布局
        "flex-1 flex flex-col",
        // 防止内容溢出
        "min-w-0 overflow-hidden",
        // 高度控制
        "h-full",
        // 移动端优化
        deviceType === "mobile" && [
          "w-full",
          "touch-pan-y", // 支持垂直滚动手势
        ],
        className,
      )}
    >
      {children}
    </main>
  )
}

// 头部容器 - 移动端优化
export function HeaderContainer({ children, className }: ResponsiveLayoutProps) {
  const deviceType = useDeviceType()

  return (
    <header
      className={cn(
        // 基础样式
        "border-b border-secondary-200/50 bg-white/90 backdrop-blur-sm",
        // 响应式高度
        deviceType === "mobile" ? "h-14" : deviceType === "tablet" ? "h-15" : "h-16",
        // Flex布局
        "flex items-center flex-shrink-0",
        // 响应式内边距
        deviceType === "mobile" ? "px-3" : deviceType === "tablet" ? "px-4" : "px-6",
        // 移动端触摸优化
        deviceType === "mobile" && [
          "sticky top-0 z-30",
          "safe-area-inset-top", // 适配刘海屏
        ],
        className,
      )}
      role="banner"
    >
      <div
        className={cn(
          "flex items-center w-full",
          deviceType === "mobile" ? "gap-2" : deviceType === "tablet" ? "gap-3" : "gap-4",
        )}
      >
        {children}
      </div>
    </header>
  )
}

// 内容区域容器 - 移动端滚动优化
export function ContentContainer({ children, className }: ResponsiveLayoutProps) {
  const deviceType = useDeviceType()

  return (
    <div
      className={cn(
        // Flex布局
        "flex-1 overflow-auto",
        // 响应式内边距
        deviceType === "mobile" ? "p-3" : deviceType === "tablet" ? "p-4" : "p-6",
        // 背景渐变
        "bg-gradient-to-br from-white via-secondary-50/30 to-primary-50/20",
        // 移动端滚动优化
        deviceType === "mobile" && [
          "overscroll-behavior-y-contain", // 防止过度滚动
          "-webkit-overflow-scrolling: touch", // iOS 平滑滚动
          "scroll-behavior-smooth", // 平滑滚动
        ],
        // 安全区域适配
        deviceType === "mobile" && "safe-area-inset-bottom",
        className,
      )}
      role="main"
    >
      <div className={cn("mx-auto w-full", deviceType === "desktop" ? "max-w-7xl" : "max-w-full")}>{children}</div>
    </div>
  )
}

// Logo区域容器 - 移动端适配
export function LogoContainer({ children, className }: ResponsiveLayoutProps) {
  const deviceType = useDeviceType()

  return (
    <div
      className={cn(
        // 基础样式
        "border-b border-secondary-200/50 flex-shrink-0",
        // 响应式内边距
        deviceType === "mobile" ? "p-2" : deviceType === "tablet" ? "p-3" : "p-4",
        // 居中对齐
        "flex items-center justify-center",
        // 移动端高度优化
        deviceType === "mobile" && "min-h-[60px]",
        className,
      )}
    >
      {children}
    </div>
  )
}

// 导航区域容器 - 移动端滚动优化
export function NavigationContainer({ children, className }: ResponsiveLayoutProps) {
  const deviceType = useDeviceType()

  return (
    <div
      className={cn(
        // Flex布局 - 关键：确保可以收缩
        "flex-1 min-h-0",
        // 溢出控制
        "overflow-hidden",
        // 移动端导航优化
        deviceType === "mobile" && [
          "overflow-y-auto",
          "overscroll-behavior-y-contain",
          "-webkit-overflow-scrolling: touch",
        ],
        className,
      )}
    >
      {children}
    </div>
  )
}

// Footer区域容器 - 移动端适配
export function FooterContainer({ children, className }: ResponsiveLayoutProps) {
  const deviceType = useDeviceType()

  return (
    <div
      className={cn(
        // 基础样式
        "border-t border-secondary-200/50 flex-shrink-0",
        // 响应式内边距
        deviceType === "mobile" ? "p-2" : deviceType === "tablet" ? "p-3" : "p-4",
        // 文本居中
        "text-center",
        // 移动端安全区域
        deviceType === "mobile" && "safe-area-inset-bottom",
        className,
      )}
    >
      {children}
    </div>
  )
}

// 搜索框容器 - 移动端优化
export function SearchContainer({ children, className }: ResponsiveLayoutProps) {
  const deviceType = useDeviceType()

  return (
    <div
      className={cn(
        // 响应式宽度
        deviceType === "mobile" ? "flex-1 min-w-0" : deviceType === "tablet" ? "flex-1 max-w-sm" : "flex-1 max-w-md",
        // 最小宽度防止过度收缩
        "min-w-0",
        className,
      )}
    >
      {children}
    </div>
  )
}

// 操作按钮组容器 - 移动端触摸优化
export function ActionsContainer({ children, className }: ResponsiveLayoutProps) {
  const deviceType = useDeviceType()

  return (
    <div
      className={cn(
        // Flex布局
        "flex items-center flex-shrink-0",
        // 响应式间距
        deviceType === "mobile" ? "space-x-1" : deviceType === "tablet" ? "space-x-2" : "space-x-3",
        // 移动端触摸目标优化
        deviceType === "mobile" && [
          "min-h-[44px]", // iOS 推荐的最小触摸目标
          "[&>button]:min-h-[44px]",
          "[&>button]:min-w-[44px]",
        ],
        className,
      )}
    >
      {children}
    </div>
  )
}

// 移动端专用组件
export function MobileDrawer({
  isOpen,
  onClose,
  children,
  className,
}: {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}) {
  const deviceType = useDeviceType()

  if (deviceType !== "mobile") return null

  return (
    <>
      {/* 遮罩层 */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />}

      {/* 抽屉内容 */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw]",
          "bg-white shadow-xl",
          "transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className,
        )}
      >
        {children}
      </div>
    </>
  )
}

// 移动端底部导航栏
export function MobileBottomNav({ children, className }: ResponsiveLayoutProps) {
  const deviceType = useDeviceType()

  if (deviceType !== "mobile") return null

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30",
        "bg-white/95 backdrop-blur-sm border-t border-secondary-200/50",
        "safe-area-inset-bottom",
        "h-16 flex items-center justify-around",
        "px-4",
        className,
      )}
    >
      {children}
    </nav>
  )
}

// 移动端手势支持组件
export function SwipeableContainer({
  children,
  onSwipeLeft,
  onSwipeRight,
  className,
}: ResponsiveLayoutProps & {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}) {
  const deviceType = useDeviceType()

  if (deviceType !== "mobile") {
    return <div className={className}>{children}</div>
  }

  return (
    <div
      className={cn("touch-pan-x", className)}
      onTouchStart={(e) => {
        const touch = e.touches[0]
        const startX = touch.clientX

        const handleTouchEnd = (endEvent: TouchEvent) => {
          const endTouch = endEvent.changedTouches[0]
          const endX = endTouch.clientX
          const diffX = startX - endX

          if (Math.abs(diffX) > 50) {
            // 最小滑动距离
            if (diffX > 0 && onSwipeLeft) {
              onSwipeLeft()
            } else if (diffX < 0 && onSwipeRight) {
              onSwipeRight()
            }
          }

          document.removeEventListener("touchend", handleTouchEnd)
        }

        document.addEventListener("touchend", handleTouchEnd)
      }}
    >
      {children}
    </div>
  )
}

// 响应式网格容器
export function ResponsiveGrid({
  children,
  className,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
}: ResponsiveLayoutProps & {
  cols?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
}) {
  const deviceType = useDeviceType()

  const getGridCols = () => {
    switch (deviceType) {
      case "mobile":
        return `grid-cols-${cols.mobile || 1}`
      case "tablet":
        return `grid-cols-${cols.tablet || 2}`
      case "desktop":
        return `grid-cols-${cols.desktop || 3}`
      default:
        return "grid-cols-1"
    }
  }

  return <div className={cn("grid gap-4", getGridCols(), className)}>{children}</div>
}
