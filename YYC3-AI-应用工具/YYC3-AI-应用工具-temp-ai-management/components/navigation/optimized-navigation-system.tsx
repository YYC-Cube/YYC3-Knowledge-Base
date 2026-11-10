"use client"

import type React from "react"
import { useState, useEffect, createContext, useContext, useCallback } from "react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, Home } from "lucide-react"
import { cn } from "@/lib/utils"
import { SoundButton } from "../design-system/sound-system"
import { AnimatedContainer } from "../design-system/animation-system"

// 定义面包屑项接口
interface BreadcrumbItem {
  title: string
  href?: string
  isActive?: boolean
}

// 定义菜单项接口
interface MenuItem {
  title: string
  icon: React.ElementType
  children?: MenuItem[]
}

// 导航状态接口
interface NavigationState {
  activeMenu: string
  openMenus: string[]
  breadcrumbs: BreadcrumbItem[]
  navigationHistory: string[]
}

// 导航上下文
interface NavigationContextType extends NavigationState {
  setActiveMenu: (menu: string) => void
  setOpenMenus: (menus: string[] | ((prev: string[]) => string[])) => void
  toggleMenu: (menu: string) => void
  navigateToMenu: (menu: string) => void
  goBack: () => void
  canGoBack: boolean
}

const NavigationContext = createContext<NavigationContextType | null>(null)

// 菜单映射关系
const MENU_HIERARCHY: Record<string, string> = {
  // 用户管理
  用户列表: "用户管理",
  用户详情: "用户管理",
  新增用户: "用户管理",
  角色权限: "用户管理",
  用户配置: "用户管理",
  封禁管理: "用户管理",

  // 数据分析
  数据概览: "数据分析",
  用户分析: "数据分析",
  业务分析: "数据分析",
  报表中心: "数据分析",
  实时监控: "数据分析",
  数据预警: "数据分析",

  // 智能引擎
  "AI 智能": "智能引擎",
  机器学习: "智能引擎",
  数据挖掘: "智能引擎",
  存储管理: "智能引擎",
  开发环境: "智能引擎",
  知识智库: "智能引擎",

  // 商务功能
  商务管理: "商务功能",
  财务管理: "商务功能",
  订单管理: "商务功能",
  ERP系统: "商务功能",
  CRM客户: "商务功能",
  供应链: "商务功能",

  // 系统设置
  常规设置: "系统设置",
  安全设置: "系统设置",
  权限管理: "系统设置",
  隐私设置: "系统设置",
  通知设置: "系统设置",
  外观设置: "系统设置",

  // 项目管理
  项目概览: "项目管理",
  任务管理: "项目管理",
  开发执行: "项目管理",
  敏捷工作流: "项目管理",
  "CI/CD流水线": "项目管理",
  开发路线图: "项目管理",

  // 个人资料
  基本信息: "个人资料",
  编辑资料: "个人资料",
  头像设置: "个人资料",
  联系方式: "个人资料",
  地址信息: "个人资料",
  账户安全: "个人资料",
}

// 导航提供者组件
export function OptimizedNavigationProvider({ children }: { children: React.ReactNode }) {
  const [navigationState, setNavigationState] = useState<NavigationState>({
    activeMenu: "AI 智能",
    openMenus: ["智能引擎"],
    breadcrumbs: [],
    navigationHistory: [],
  })

  // 生成面包屑
  const generateBreadcrumbs = useCallback((activeMenu: string): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [{ title: "首页", href: "/" }]

    const parentMenu = MENU_HIERARCHY[activeMenu]
    if (parentMenu) {
      breadcrumbs.push({ title: parentMenu, href: `/${parentMenu}` })
    }

    breadcrumbs.push({ title: activeMenu, isActive: true })
    return breadcrumbs
  }, [])

  // 设置活跃菜单
  const setActiveMenu = useCallback(
    (menu: string) => {
      setNavigationState((prev) => {
        const newHistory = [...prev.navigationHistory]
        if (prev.activeMenu !== menu) {
          newHistory.push(prev.activeMenu)
          // 限制历史记录长度
          if (newHistory.length > 10) {
            newHistory.shift()
          }
        }

        return {
          ...prev,
          activeMenu: menu,
          breadcrumbs: generateBreadcrumbs(menu),
          navigationHistory: newHistory,
        }
      })
    },
    [generateBreadcrumbs],
  )

  // 设置打开的菜单
  const setOpenMenus = useCallback((menus: string[] | ((prev: string[]) => string[])) => {
    setNavigationState((prev) => ({
      ...prev,
      openMenus: typeof menus === "function" ? menus(prev.openMenus) : menus,
    }))
  }, [])

  // 切换菜单展开状态
  const toggleMenu = useCallback(
    (menu: string) => {
      setOpenMenus((prev) => (prev.includes(menu) ? prev.filter((item) => item !== menu) : [...prev, menu]))
    },
    [setOpenMenus],
  )

  // 导航到菜单
  const navigateToMenu = useCallback(
    (menu: string) => {
      setActiveMenu(menu)

      // 自动展开父菜单
      const parentMenu = MENU_HIERARCHY[menu]
      if (parentMenu) {
        setOpenMenus((prev) => (prev.includes(parentMenu) ? prev : [...prev, parentMenu]))
      }
    },
    [setActiveMenu, setOpenMenus],
  )

  // 返回上一页
  const goBack = useCallback(() => {
    setNavigationState((prev) => {
      if (prev.navigationHistory.length === 0) return prev

      const newHistory = [...prev.navigationHistory]
      const previousMenu = newHistory.pop()!

      return {
        ...prev,
        activeMenu: previousMenu,
        breadcrumbs: generateBreadcrumbs(previousMenu),
        navigationHistory: newHistory,
      }
    })
  }, [generateBreadcrumbs])

  // 持久化状态
  useEffect(() => {
    const savedState = localStorage.getItem("yanyu-navigation-state")
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        setNavigationState((prev) => ({
          ...prev,
          activeMenu: parsed.activeMenu || prev.activeMenu,
          openMenus: parsed.openMenus || prev.openMenus,
          breadcrumbs: generateBreadcrumbs(parsed.activeMenu || prev.activeMenu),
        }))
      } catch (error) {
        console.warn("Failed to restore navigation state:", error)
      }
    }
  }, [generateBreadcrumbs])

  // 保存状态
  useEffect(() => {
    localStorage.setItem(
      "yanyu-navigation-state",
      JSON.stringify({
        activeMenu: navigationState.activeMenu,
        openMenus: navigationState.openMenus,
      }),
    )
  }, [navigationState.activeMenu, navigationState.openMenus])

  // 初始化面包屑
  useEffect(() => {
    if (navigationState.breadcrumbs.length === 0) {
      setNavigationState((prev) => ({
        ...prev,
        breadcrumbs: generateBreadcrumbs(prev.activeMenu),
      }))
    }
  }, [navigationState.breadcrumbs.length, navigationState.activeMenu, generateBreadcrumbs])

  const contextValue: NavigationContextType = {
    ...navigationState,
    setActiveMenu,
    setOpenMenus,
    toggleMenu,
    navigateToMenu,
    goBack,
    canGoBack: navigationState.navigationHistory.length > 0,
  }

  return <NavigationContext.Provider value={contextValue}>{children}</NavigationContext.Provider>
}

// 使用导航的Hook
export function useOptimizedNavigation() {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error("useOptimizedNavigation must be used within OptimizedNavigationProvider")
  }
  return context
}

// 优化的面包屑组件
export function OptimizedBreadcrumb() {
  const { breadcrumbs, navigateToMenu } = useOptimizedNavigation()

  if (breadcrumbs.length <= 1) return null

  return (
    <AnimatedContainer animation="slideDown" className="mb-4">
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((item, index) => (
            <div key={index} className="flex items-center">
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {item.isActive ? (
                  <BreadcrumbPage className="font-medium">{item.title}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    href={item.href || "#"}
                    onClick={(e) => {
                      e.preventDefault()
                      if (item.title !== "首页") {
                        navigateToMenu(item.title)
                      }
                    }}
                    className="hover:text-primary-600 transition-colors"
                  >
                    {index === 0 && <Home className="h-4 w-4 mr-1" />}
                    {item.title}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </AnimatedContainer>
  )
}

// 优化的菜单高亮组件
export function OptimizedMenuHighlight({
  menuTitle,
  isActive,
  isParentActive,
  isChildActive,
  children,
}: {
  menuTitle: string
  isActive: boolean
  isParentActive: boolean
  isChildActive: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "transition-all duration-300 rounded-lg relative",
        // 当前激活的菜单项
        isActive && "bg-primary-500 text-white shadow-lg ring-2 ring-primary-200",
        // 父菜单有子项被激活
        isParentActive && !isActive && "bg-primary-50 text-primary-700 border-l-4 border-primary-400",
        // 子菜单被激活时的父菜单状态
        isChildActive && !isActive && "bg-primary-100 text-primary-800",
        // 默认悬停状态
        !isActive && !isParentActive && !isChildActive && "hover:bg-primary-50 hover:text-primary-700",
      )}
    >
      {/* 激活状态指示器 */}
      {isActive && (
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full opacity-80" />
      )}
      {children}
    </div>
  )
}

// 优化的导航菜单组件
interface OptimizedNavigationMenuProps {
  menuItems: MenuItem[]
}

export function OptimizedNavigationMenu({ menuItems }: OptimizedNavigationMenuProps) {
  const { activeMenu, openMenus, toggleMenu, navigateToMenu } = useOptimizedNavigation()

  // 检查子菜单是否有激活项
  const hasActiveChild = (children: MenuItem[] = []) => {
    return children.some(child => child.title === activeMenu || (child.children && hasActiveChild(child.children)));
  };

  return (
    <div className="flex-1 relative">
      {/* 渐变遮罩 */}
      <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white/90 to-transparent z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white/90 to-transparent z-10 pointer-events-none" />

      <nav
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-primary-300 scrollbar-track-transparent p-3 space-y-1 max-h-full"
        role="navigation"
        aria-label="主导航菜单"
      >
        {menuItems.map((item, index) => (
          <AnimatedContainer key={item.title} animation="slideRight" delay={index * 50}>
            <OptimizedMenuHighlight
              menuTitle={item.title}
              isActive={activeMenu === item.title}
              isParentActive={item.children ? hasActiveChild(item.children) : false}
              isChildActive={false}
            >
              {item.children ? (
                <Collapsible open={openMenus.includes(item.title)} onOpenChange={() => toggleMenu(item.title)}>
                  <CollapsibleTrigger asChild>
                    <SoundButton
                      variant="ghost"
                      className="w-full justify-between text-left px-3 py-2.5 rounded-lg transition-all duration-300"
                      soundType="hover"
                      aria-expanded={openMenus.includes(item.title)}
                      aria-label={`${item.title}菜单，${openMenus.includes(item.title) ? "已展开" : "已收起"}`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <item.icon
                          className={cn(
                            "w-4 h-4 transition-colors duration-300",
                            activeMenu === item.title && "text-white",
                            item.children && hasActiveChild(item.children) && "text-primary-600",
                          )}
                        />
                        <span className="text-sm font-medium">{item.title}</span>
                      </div>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 transition-all duration-300",
                          openMenus.includes(item.title) && "rotate-180",
                          (activeMenu === item.title || (item.children && hasActiveChild(item.children))) &&
                            "text-primary-600",
                          activeMenu === item.title && "text-white",
                        )}
                      />
                    </SoundButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-0.5 mt-1 ml-2">
                    {item.children.map((child) => (
                      <OptimizedMenuHighlight
                        key={child.title}
                        menuTitle={child.title}
                        isActive={activeMenu === child.title}
                        isParentActive={child.children ? hasActiveChild(child.children) : false}
                        isChildActive={false}
                      >
                        {child.children ? (
                          <Collapsible open={openMenus.includes(child.title)} onOpenChange={() => toggleMenu(child.title)}>
                            <CollapsibleTrigger asChild>
                              <SoundButton
                                variant="ghost"
                                className="w-full justify-between text-left px-3 py-2 rounded-md text-sm transition-all duration-300"
                                soundType="hover"
                                aria-expanded={openMenus.includes(child.title)}
                              >
                                <div className="flex items-center">
                                  <child.icon
                                    className={cn(
                                      "w-4 h-4 mr-2.5 transition-colors duration-300",
                                      activeMenu === child.title && "text-white",
                                    )}
                                  />
                                  {child.title}
                                </div>
                                <ChevronDown
                                  className={cn(
                                    "w-4 h-4 transition-all duration-300",
                                    openMenus.includes(child.title) && "rotate-180",
                                  )}
                                />
                              </SoundButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-0.5 mt-1 ml-4">
                              {child.children.map((grandchild) => (
                                <SoundButton
                                  key={grandchild.title}
                                  variant="ghost"
                                  className={cn(
                                    "w-full justify-start text-left px-3 py-2 rounded-md text-sm transition-all duration-300",
                                    "hover:bg-primary-50 hover:text-primary-700 hover:translate-x-1",
                                    activeMenu === grandchild.title &&
                                      "bg-primary-500 text-white shadow-md font-medium border-l-2 border-primary-300",
                                  )}
                                  onClick={() => navigateToMenu(grandchild.title)}
                                  soundType="click"
                                  aria-label={`进入${grandchild.title}页面${activeMenu === grandchild.title ? "（当前页面）" : ""}`}
                                >
                                  <grandchild.icon
                                    className={cn(
                                      "w-4 h-4 mr-2.5 transition-colors duration-300",
                                      activeMenu === grandchild.title && "text-white",
                                    )}
                                  />
                                  {grandchild.title}
                                </SoundButton>
                              ))}
                            </CollapsibleContent>
                          </Collapsible>
                        ) : (
                          <SoundButton
                            variant="ghost"
                            className={cn(
                              "w-full justify-start text-left px-3 py-2 rounded-md text-sm transition-all duration-300",
                              "hover:bg-primary-50 hover:text-primary-700 hover:translate-x-1",
                              activeMenu === child.title &&
                                "bg-primary-500 text-white shadow-md font-medium border-l-2 border-primary-300",
                            )}
                            onClick={() => navigateToMenu(child.title)}
                            soundType="click"
                            aria-label={`进入${child.title}页面${activeMenu === child.title ? "（当前页面）" : ""}`}
                          >
                            <child.icon
                              className={cn(
                                "w-4 h-4 mr-2.5 transition-colors duration-300",
                                activeMenu === child.title && "text-white",
                              )}
                            />
                            {child.title}
                          </SoundButton>
                        )}
                      </OptimizedMenuHighlight>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <SoundButton
                  variant="ghost"
                  className="w-full justify-start text-left px-3 py-2.5 rounded-lg transition-all duration-300"
                  onClick={() => navigateToMenu(item.title)}
                  soundType="click"
                  aria-label={`进入${item.title}页面${activeMenu === item.title ? "（当前页面）" : ""}`}
                >
                  <item.icon
                    className={cn(
                      "w-4 h-4 mr-2.5 transition-colors duration-300",
                      activeMenu === item.title && "text-white",
                    )}
                  />
                  <span className="text-sm font-medium">{item.title}</span>
                </SoundButton>
              )}
            </OptimizedMenuHighlight>
          </AnimatedContainer>
        ))}
      </nav>
    </div>
  )
}

// 导航历史组件
export function NavigationHistory() {
  const { navigationHistory, goBack, canGoBack } = useOptimizedNavigation()

  if (!canGoBack) return null

  return (
    <div className="p-2 border-t">
      <SoundButton
        variant="ghost"
        size="sm"
        onClick={goBack}
        className="w-full text-xs text-muted-foreground hover:text-primary-600"
        soundType="click"
      >
        ← 返回上一页
      </SoundButton>
    </div>
  )
}
