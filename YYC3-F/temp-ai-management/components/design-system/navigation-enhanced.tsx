"use client"

import type React from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { AnimatedContainer } from "./animation-system"
import { SoundButton } from "./sound-system"
import { useNavigation, MenuHighlight } from "../navigation/enhanced-navigation"

interface MenuItem {
  title: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  children?: MenuItem[]
}

interface NavigationEnhancedProps {
  menuItems: MenuItem[]
  activeMenu: string
  openMenus: string[]
  onMenuClick: (title: string) => void
  onToggleMenu: (title: string) => void
}

export function NavigationEnhanced({
  menuItems,
  activeMenu,
  openMenus,
  onMenuClick,
  onToggleMenu,
}: NavigationEnhancedProps) {
  const navigation = useNavigation()

  // 使用导航上下文中的状态
  const currentActiveMenu = navigation?.activeMenu || activeMenu
  const currentOpenMenus = navigation?.openMenus || openMenus

  return (
    <div className="flex-1 relative">
      {/* 顶部渐变遮罩 */}
      <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white/90 to-transparent z-10 pointer-events-none" />

      {/* 底部渐变遮罩 */}
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white/90 to-transparent z-10 pointer-events-none" />

      <nav
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-primary-300 scrollbar-track-transparent p-3 space-y-1 max-h-full"
        role="navigation"
        aria-label="主导航菜单"
      >
        {menuItems.map((item, index) => (
          <AnimatedContainer key={item.title} animation="slideRight" delay={index * 50}>
            <MenuHighlight
              menuTitle={item.title}
              isActive={currentActiveMenu === item.title}
              isParentActive={item.children?.some((child) => child.title === currentActiveMenu) || false}
            >
              {item.children ? (
                <Collapsible open={currentOpenMenus.includes(item.title)} onOpenChange={() => onToggleMenu(item.title)}>
                  <CollapsibleTrigger asChild>
                    <SoundButton
                      variant="ghost"
                      className={cn(
                        "w-full justify-between text-left px-3 py-2.5 rounded-lg transition-all duration-300",
                        "hover:bg-primary-50 hover:text-primary-700 hover:shadow-sm",
                        // 主菜单选中状态
                        currentActiveMenu === item.title && "bg-primary-100 text-primary-800 shadow-sm font-medium",
                        // 子菜单被选中时的主菜单状态
                        item.children?.some((child) => child.title === currentActiveMenu) &&
                          "bg-primary-50 text-primary-700 border-l-2 border-primary-400",
                      )}
                      soundType="hover"
                      aria-expanded={currentOpenMenus.includes(item.title)}
                      aria-label={`${item.title}菜单，${currentOpenMenus.includes(item.title) ? "已展开" : "已收起"}`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <item.icon
                          className={cn(
                            "w-4 h-4 transition-colors duration-300",
                            currentActiveMenu === item.title && "text-primary-600",
                            item.children?.some((child) => child.title === currentActiveMenu) && "text-primary-500",
                          )}
                        />
                        <span className="text-sm font-medium">{item.title}</span>
                      </div>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 transition-all duration-300",
                          currentOpenMenus.includes(item.title) && "rotate-180",
                          (currentActiveMenu === item.title ||
                            item.children?.some((child) => child.title === currentActiveMenu)) &&
                            "text-primary-600",
                        )}
                      />
                    </SoundButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-0.5 mt-1 ml-2">
                    {item.children.map((child) => (
                      <SoundButton
                        key={child.title}
                        variant="ghost"
                        className={cn(
                          "w-full justify-start text-left px-3 py-2 rounded-md text-sm transition-all duration-300",
                          "hover:bg-primary-50 hover:text-primary-700 hover:translate-x-1",
                          // 子菜单选中状态 - 与主菜单形成对比
                          currentActiveMenu === child.title &&
                            "bg-primary-500 text-white shadow-md font-medium border-l-2 border-primary-300",
                        )}
                        onClick={() => onMenuClick(child.title)}
                        soundType="click"
                        aria-label={`进入${child.title}页面${currentActiveMenu === child.title ? "（当前页面）" : ""}`}
                      >
                        <child.icon
                          className={cn(
                            "w-4 h-4 mr-2.5 transition-colors duration-300",
                            currentActiveMenu === child.title && "text-white",
                          )}
                        />
                        {child.title}
                      </SoundButton>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <SoundButton
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-left px-3 py-2.5 rounded-lg transition-all duration-300",
                    "hover:bg-primary-50 hover:text-primary-700 hover:shadow-sm",
                    currentActiveMenu === item.title && "bg-primary-500 text-white shadow-md font-medium",
                  )}
                  onClick={() => onMenuClick(item.title)}
                  soundType="click"
                  aria-label={`进入${item.title}页面${currentActiveMenu === item.title ? "（当前页面）" : ""}`}
                >
                  <item.icon
                    className={cn(
                      "w-4 h-4 mr-2.5 transition-colors duration-300",
                      currentActiveMenu === item.title && "text-white",
                    )}
                  />
                  <span className="text-sm font-medium">{item.title}</span>
                </SoundButton>
              )}
            </MenuHighlight>
          </AnimatedContainer>
        ))}
      </nav>
    </div>
  )
}
