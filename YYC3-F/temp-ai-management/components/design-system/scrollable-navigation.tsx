"use client"

import type React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { AnimatedContainer } from "./animation-system"
import { SoundButton } from "./sound-system"

interface MenuItem {
  title: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  children?: MenuItem[]
}

interface ScrollableNavigationProps {
  menuItems: MenuItem[]
  activeMenu: string
  openMenus: string[]
  onMenuClick: (title: string) => void
  onToggleMenu: (title: string) => void
}

export function ScrollableNavigation({
  menuItems,
  activeMenu,
  openMenus,
  onMenuClick,
  onToggleMenu,
}: ScrollableNavigationProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const activeMenuRef = useRef<HTMLDivElement>(null)
  const [canScrollUp, setCanScrollUp] = useState(false)
  const [canScrollDown, setCanScrollDown] = useState(false)
  const [isScrollable, setIsScrollable] = useState(false)

  // 检查滚动状态的函数
  const checkScrollState = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const hasOverflow = scrollHeight > clientHeight
    const threshold = 5

    setIsScrollable(hasOverflow)
    setCanScrollUp(hasOverflow && scrollTop > threshold)
    setCanScrollDown(hasOverflow && scrollTop < scrollHeight - clientHeight - threshold)
  }, [])

  // 滚动到激活的菜单项
  const scrollToActiveMenu = useCallback(() => {
    const container = scrollContainerRef.current
    const activeElement = activeMenuRef.current

    if (!container || !activeElement) return

    const containerRect = container.getBoundingClientRect()
    const elementRect = activeElement.getBoundingClientRect()

    // 计算元素相对于容器的位置
    const elementTop = elementRect.top - containerRect.top + container.scrollTop
    const elementBottom = elementTop + elementRect.height

    // 检查元素是否在可视区域内
    const containerTop = container.scrollTop
    const containerBottom = containerTop + container.clientHeight

    if (elementTop < containerTop || elementBottom > containerBottom) {
      // 滚动到元素位置，居中显示
      const scrollTo = elementTop - container.clientHeight / 2 + elementRect.height / 2
      container.scrollTo({
        top: Math.max(0, scrollTo),
        behavior: "smooth",
      })
    }
  }, [])

  // 防抖的检查函数
  const debouncedCheck = useCallback(() => {
    const timeoutId = setTimeout(checkScrollState, 100)
    return () => clearTimeout(timeoutId)
  }, [checkScrollState])

  // 初始化和事件监听
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    // 立即检查一次
    checkScrollState()

    // 延迟检查确保DOM完全渲染
    const initialTimeout = setTimeout(() => {
      checkScrollState()
      scrollToActiveMenu()
    }, 300)

    // 监听滚动事件
    const handleScroll = () => {
      checkScrollState()
    }

    // 监听窗口大小变化
    const handleResize = () => {
      debouncedCheck()
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("resize", handleResize)

    // 使用 MutationObserver 监听内容变化
    const observer = new MutationObserver(() => {
      debouncedCheck()
    })

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
    })

    return () => {
      clearTimeout(initialTimeout)
      container.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleResize)
      observer.disconnect()
    }
  }, [checkScrollState, debouncedCheck, scrollToActiveMenu])

  // 监听菜单展开状态变化
  useEffect(() => {
    const timeout = setTimeout(() => {
      checkScrollState()
      scrollToActiveMenu()
    }, 350) // 等待动画完成
    return () => clearTimeout(timeout)
  }, [openMenus, checkScrollState, scrollToActiveMenu])

  // 监听激活菜单变化
  useEffect(() => {
    const timeout = setTimeout(scrollToActiveMenu, 200)
    return () => clearTimeout(timeout)
  }, [activeMenu, scrollToActiveMenu])

  // 平滑滚动函数
  const smoothScroll = (direction: "up" | "down") => {
    const container = scrollContainerRef.current
    if (!container) return

    const scrollAmount = 120
    const currentScrollTop = container.scrollTop
    const maxScrollTop = container.scrollHeight - container.clientHeight

    let targetScrollTop: number

    if (direction === "up") {
      targetScrollTop = Math.max(0, currentScrollTop - scrollAmount)
    } else {
      targetScrollTop = Math.min(maxScrollTop, currentScrollTop + scrollAmount)
    }

    container.scrollTo({
      top: targetScrollTop,
      behavior: "smooth",
    })
  }

  return (
    <div className="relative flex flex-col h-full min-h-0">
      {/* 滚动向上按钮 */}
      {isScrollable && canScrollUp && (
        <div className="absolute top-1 left-1/2 transform -translate-x-1/2 z-50">
          <SoundButton
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-white/95 hover:bg-primary-50 shadow-lg rounded-full border border-primary-200/50 backdrop-blur-sm"
            onClick={() => smoothScroll("up")}
            soundType="click"
            aria-label="向上滚动导航菜单"
          >
            <ChevronUp className="h-3.5 w-3.5 text-primary-600" />
          </SoundButton>
        </div>
      )}

      {/* 顶部渐变遮罩 */}
      {isScrollable && (
        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white/95 via-white/70 to-transparent z-40 pointer-events-none" />
      )}

      {/* 滚动容器 - 关键修复 */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-1"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgb(14 165 233 / 0.3) transparent",
          maxHeight: "100%",
        }}
      >
        <nav role="navigation" aria-label="主导航菜单" className="space-y-0.5 py-2">
          {menuItems.map((item, index) => (
            <AnimatedContainer key={item.title} animation="slideRight" delay={index * 20}>
              {item.children ? (
                <Collapsible open={openMenus.includes(item.title)} onOpenChange={() => onToggleMenu(item.title)}>
                  <CollapsibleTrigger asChild>
                    <div
                      ref={activeMenu === item.title ? activeMenuRef : null}
                      className={cn(
                        "w-full transition-all duration-300 rounded-lg",
                        activeMenu === item.title && "ring-2 ring-primary-200 bg-primary-500 text-white shadow-lg",
                        item.children?.some((child) => child.title === activeMenu) &&
                          activeMenu !== item.title &&
                          "bg-primary-50 text-primary-700 border-l-4 border-primary-400",
                      )}
                    >
                      <SoundButton
                        variant="ghost"
                        className={cn(
                          "w-full justify-between text-left px-3 py-2.5 rounded-lg transition-all duration-300",
                          "hover:bg-primary-50 hover:text-primary-700 hover:shadow-sm",
                          activeMenu === item.title &&
                            "bg-transparent text-white hover:bg-primary-600 hover:text-white",
                          item.children?.some((child) => child.title === activeMenu) &&
                            activeMenu !== item.title &&
                            "bg-transparent text-primary-700 hover:bg-primary-100",
                        )}
                        soundType="hover"
                        aria-expanded={openMenus.includes(item.title)}
                        aria-label={`${item.title}菜单，${openMenus.includes(item.title) ? "已展开" : "已收起"}`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <item.icon
                            className={cn(
                              "w-4 h-4 transition-colors duration-300 flex-shrink-0",
                              activeMenu === item.title && "text-white",
                              item.children?.some((child) => child.title === activeMenu) &&
                                activeMenu !== item.title &&
                                "text-primary-600",
                            )}
                          />
                          <span className="text-sm font-medium truncate">{item.title}</span>
                        </div>
                        <ChevronDown
                          className={cn(
                            "w-3.5 h-3.5 transition-all duration-300 flex-shrink-0",
                            openMenus.includes(item.title) && "rotate-180",
                            activeMenu === item.title && "text-white",
                            item.children?.some((child) => child.title === activeMenu) &&
                              activeMenu !== item.title &&
                              "text-primary-600",
                          )}
                        />
                      </SoundButton>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-0.5 mt-1 ml-2">
                    {item.children.map((child) => (
                      <div
                        key={child.title}
                        ref={activeMenu === child.title ? activeMenuRef : null}
                        className={cn(
                          "transition-all duration-300 rounded-md",
                          activeMenu === child.title && "ring-2 ring-primary-200 bg-primary-500 text-white shadow-md",
                        )}
                      >
                        <SoundButton
                          variant="ghost"
                          className={cn(
                            "w-full justify-start text-left px-3 py-2 rounded-md text-sm transition-all duration-300",
                            "hover:bg-primary-50 hover:text-primary-700 hover:translate-x-1",
                            activeMenu === child.title &&
                              "bg-transparent text-white hover:bg-primary-600 hover:text-white hover:translate-x-0",
                          )}
                          onClick={() => onMenuClick(child.title)}
                          soundType="click"
                          aria-label={`进入${child.title}页面${activeMenu === child.title ? "（当前页面）" : ""}`}
                        >
                          <child.icon
                            className={cn(
                              "w-3.5 h-3.5 mr-2.5 transition-colors duration-300 flex-shrink-0",
                              activeMenu === child.title && "text-white",
                            )}
                          />
                          <span className="truncate">{child.title}</span>
                        </SoundButton>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <div
                  ref={activeMenu === item.title ? activeMenuRef : null}
                  className={cn(
                    "transition-all duration-300 rounded-lg",
                    activeMenu === item.title && "ring-2 ring-primary-200 bg-primary-500 text-white shadow-lg",
                  )}
                >
                  <SoundButton
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-left px-3 py-2.5 rounded-lg transition-all duration-300",
                      "hover:bg-primary-50 hover:text-primary-700 hover:shadow-sm",
                      activeMenu === item.title && "bg-transparent text-white hover:bg-primary-600 hover:text-white",
                    )}
                    onClick={() => onMenuClick(item.title)}
                    soundType="click"
                    aria-label={`进入${item.title}页面${activeMenu === item.title ? "（当前页面）" : ""}`}
                  >
                    <item.icon
                      className={cn(
                        "w-4 h-4 mr-2.5 transition-colors duration-300 flex-shrink-0",
                        activeMenu === item.title && "text-white",
                      )}
                    />
                    <span className="text-sm font-medium truncate">{item.title}</span>
                  </SoundButton>
                </div>
              )}
            </AnimatedContainer>
          ))}
        </nav>
      </div>

      {/* 底部渐变遮罩 */}
      {isScrollable && (
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/95 via-white/70 to-transparent z-40 pointer-events-none" />
      )}

      {/* 滚动向下按钮 */}
      {isScrollable && canScrollDown && (
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 z-50">
          <SoundButton
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-white/95 hover:bg-primary-50 shadow-lg rounded-full border border-primary-200/50 backdrop-blur-sm"
            onClick={() => smoothScroll("down")}
            soundType="click"
            aria-label="向下滚动导航菜单"
          >
            <ChevronDown className="h-3.5 w-3.5 text-primary-600" />
          </SoundButton>
        </div>
      )}
    </div>
  )
}
