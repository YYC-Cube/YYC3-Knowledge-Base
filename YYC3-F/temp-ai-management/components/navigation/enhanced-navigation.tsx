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
import { Home, ArrowLeft, Clock } from "lucide-react"
import { AnimatedContainer } from "../design-system/animation-system"
import { SoundButton } from "../design-system/sound-system"

// 定义面包屑项接口
interface BreadcrumbItem {
  title: string
  href?: string
  isActive?: boolean
}

// 导航状态接口
interface NavigationState {
  activeMenu: string
  openMenus: string[]
  navigationHistory: NavigationHistoryItem[]
  scrollPosition: number
  breadcrumbs: BreadcrumbItem[]  // 添加breadcrumbs定义
}

interface NavigationHistoryItem {
  menu: string
  timestamp: number
  scrollPosition: number
}

// 导航上下文
interface NavigationContextType extends NavigationState {
  setActiveMenu: (menu: string, preserveScroll?: boolean) => void
  setOpenMenus: (menus: string[] | ((prev: string[]) => string[])) => void
  toggleMenu: (menu: string) => void
  navigateToMenu: (menu: string, preserveScroll?: boolean) => void
  goBack: () => void
  canGoBack: boolean
  clearHistory: () => void
  getRecentMenus: () => string[]
  saveScrollPosition: (position: number) => void
}

const NavigationContext = createContext<NavigationContextType | null>(null)

// 菜单层级映射
const MENU_HIERARCHY: Record<string, string> = {
  // 数据中心
  数据中心: "",
  实时协作: "数据中心",
  微信集成: "数据中心",

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

// 菜单描述映射
const MENU_DESCRIPTIONS: Record<string, string> = {
  数据中心: "实时数据监控与智能分析中心",
  用户管理: "用户账户和权限管理系统",
  数据分析: "业务数据分析和报表中心",
  智能引擎: "AI和机器学习功能模块",
  商务功能: "业务流程和商务管理",
  系统设置: "系统配置和安全设置",
  项目管理: "项目和任务管理工具",
  个人资料: "个人信息和账户设置",
}

// 导航提供者组件
export function NavigationProvider({ children }: { children: React.ReactNode }) {
  // 初始化面包屑生成函数
  const generateInitialBreadcrumbs = (initialMenu: string): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [{ title: "首页", href: "/" }]
    const parentMenu = MENU_HIERARCHY[initialMenu]
    
    if (parentMenu) {
      breadcrumbs.push({
        title: parentMenu,
        href: `/${parentMenu.toLowerCase().replace(/\s+/g, "-")}`,
      })
    }
    
    breadcrumbs.push({ title: initialMenu, isActive: true })
    return breadcrumbs
  }

  // 初始状态设置，包含breadcrumbs的初始化
  const [navigationState, setNavigationState] = useState<NavigationState>({
    activeMenu: "数据中心",
    openMenus: [],
    navigationHistory: [],
    scrollPosition: 0,
    breadcrumbs: generateInitialBreadcrumbs("数据中心")
  })

  // 生成面包屑
  const generateBreadcrumbs = useCallback((activeMenu: string): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [{ title: "首页", href: "/" }]

    const parentMenu = MENU_HIERARCHY[activeMenu]
    if (parentMenu) {
      breadcrumbs.push({
        title: parentMenu,
        href: `/${parentMenu.toLowerCase().replace(/\s+/g, "-")}`,
      })
    }

    breadcrumbs.push({ title: activeMenu, isActive: true })
    return breadcrumbs
  }, [])

  // 保存滚动位置
  const saveScrollPosition = useCallback((position: number) => {
    setNavigationState((prev) => ({
      ...prev,
      scrollPosition: position,
    }))
  }, [])

  // 设置活跃菜单
  const setActiveMenu = useCallback(
    (menu: string, preserveScroll = false) => {
      setNavigationState((prev) => {
        const newHistory = [...prev.navigationHistory]

        // 只有当菜单真正改变时才添加到历史记录
        if (prev.activeMenu !== menu) {
          newHistory.push({
            menu: prev.activeMenu,
            timestamp: Date.now(),
            scrollPosition: prev.scrollPosition,
          })

          // 限制历史记录长度
          if (newHistory.length > 20) {
            newHistory.shift()
          }
        }

        return {
          ...prev,
          activeMenu: menu,
          breadcrumbs: generateBreadcrumbs(menu),
          navigationHistory: newHistory,
          scrollPosition: preserveScroll ? prev.scrollPosition : 0,
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
    (menu: string, preserveScroll = false) => {
      setActiveMenu(menu, preserveScroll)

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
      const previousItem = newHistory.pop()!

      return {
        ...prev,
        activeMenu: previousItem.menu,
        breadcrumbs: generateBreadcrumbs(previousItem.menu),
        navigationHistory: newHistory,
        scrollPosition: previousItem.scrollPosition,
      }
    })
  }, [generateBreadcrumbs])

  // 清除历史记录
  const clearHistory = useCallback(() => {
    setNavigationState((prev) => ({
      ...prev,
      navigationHistory: [],
    }))
  }, [])

  // 获取最近访问的菜单
  const getRecentMenus = useCallback(() => {
    return navigationState.navigationHistory
      .slice(-5)
      .reverse()
      .map((item) => item.menu)
      .filter((menu, index, arr) => arr.indexOf(menu) === index)
  }, [navigationState.navigationHistory])

  // 持久化状态
  useEffect(() => {
    const savedState = localStorage.getItem("yanyu-navigation-state-v2")
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        const activeMenu = parsed.activeMenu || "数据中心"
        
        setNavigationState((prev) => ({
          ...prev,
          activeMenu,
          openMenus: parsed.openMenus || prev.openMenus,
          breadcrumbs: generateBreadcrumbs(activeMenu),
          navigationHistory: parsed.navigationHistory || [],
        }))
      } catch (error) {
        console.warn("Failed to restore navigation state:", error)
      }
    }
  }, [generateBreadcrumbs])

  // 保存状态
  useEffect(() => {
    const stateToSave = {
      activeMenu: navigationState.activeMenu,
      openMenus: navigationState.openMenus,
      navigationHistory: navigationState.navigationHistory.slice(-10), // 只保存最近10条
    }

    localStorage.setItem("yanyu-navigation-state-v2", JSON.stringify(stateToSave))
  }, [navigationState.activeMenu, navigationState.openMenus, navigationState.navigationHistory])

  const contextValue: NavigationContextType = {
    ...navigationState,
    setActiveMenu,
    setOpenMenus,
    toggleMenu,
    navigateToMenu,
    goBack,
    canGoBack: navigationState.navigationHistory.length > 0,
    clearHistory,
    getRecentMenus,
    saveScrollPosition,
  }

  return <NavigationContext.Provider value={contextValue}>{children}</NavigationContext.Provider>
}

// 使用导航的Hook
export function useNavigationPersistence() {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error("useNavigationPersistence must be used within NavigationProvider")
  }
  return context
}

// 增强的面包屑组件
export function EnhancedBreadcrumb() {
  const { activeMenu, navigateToMenu, breadcrumbs } = useNavigationPersistence()

  if (breadcrumbs.length <= 1) return null

  return (
    <AnimatedContainer animation="slideDown" className="mb-4">
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((item, index) => (
              <div key={index} className="flex items-center">
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {item.isActive ? (
                    <BreadcrumbPage className="font-medium text-primary-700">{item.title}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (item.title !== "首页") {
                          navigateToMenu(item.title, true) // 保持滚动位置
                        }
                      }}
                      className="hover:text-primary-600 transition-colors flex items-center"
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

        {/* 当前页面描述 */}
        <div className="text-sm text-muted-foreground hidden md:block">
          {MENU_DESCRIPTIONS[MENU_HIERARCHY[activeMenu]] || MENU_DESCRIPTIONS[activeMenu] || ""}
        </div>
      </div>
    </AnimatedContainer>
  )
}

// 导航历史和快速访问组件
export function NavigationQuickAccess() {
  const { navigationHistory, goBack, canGoBack, getRecentMenus, navigateToMenu, clearHistory } =
    useNavigationPersistence()

  const recentMenus = getRecentMenus()

  if (!canGoBack && recentMenus.length === 0) return null

  return (
    <div className="border-t border-secondary-200/50 p-2 space-y-2">
      {/* 返回按钮 */}
      {canGoBack && (
        <SoundButton
          variant="ghost"
          size="sm"
          onClick={goBack}
          className="w-full text-xs text-muted-foreground hover:text-primary-600 justify-start"
          soundType="click"
        >
          <ArrowLeft className="h-3 w-3 mr-1" />
          返回上一页
        </SoundButton>
      )}

      {/* 最近访问 */}
      {recentMenus.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground px-2 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            最近访问
          </div>
          {recentMenus.slice(0, 3).map((menu, index) => (
            <SoundButton
              key={`${menu}-${index}`}
              variant="ghost"
              size="sm"
              onClick={() => navigateToMenu(menu, true)}
              className="w-full text-xs text-muted-foreground hover:text-primary-600 justify-start pl-6"
              soundType="click"
            >
              {menu}
            </SoundButton>
          ))}

          {navigationHistory.length > 5 && (
            <SoundButton
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className="w-full text-xs text-muted-foreground hover:text-red-600 justify-start pl-6"
              soundType="click"
            >
              清除历史记录
            </SoundButton>
          )}
        </div>
      )}
    </div>
  )
}

// 导航状态指示器
export function NavigationStatusIndicator() {
  const { activeMenu, openMenus, navigationHistory } = useNavigationPersistence()

  return (
    <div className="hidden lg:flex items-center space-x-4 text-xs text-muted-foreground">
      <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span>当前: {activeMenu}</span>
      </div>
      <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <span>展开: {openMenus.length}</span>
      </div>
      <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
        <span>历史: {navigationHistory.length}</span>
      </div>
    </div>
  )
}
