"use client";

import React, { useEffect, useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSafeArea } from "@/hooks/use-safe-area";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  mobileBreakpoint?: string;
  mobileSidebar?: React.ReactNode;
  sidebarWidth?: string;
  showBottomNav?: boolean;
  bottomNavItems?: Array<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    active?: boolean;
  }>;
}

export function ResponsiveLayout({
  children,
  mobileBreakpoint = "768px",
  mobileSidebar,
  sidebarWidth = "280px",
  showBottomNav = true,
  bottomNavItems = [],
}: ResponsiveLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useMediaQuery(`(max-width: ${mobileBreakpoint})`);
  const safeArea = useSafeArea();

  // 关闭侧边栏（点击内容区域时）
  const closeSidebar = () => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  };

  // 监听窗口尺寸变化
  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  // 阻止背景滚动
  useEffect(() => {
    if (sidebarOpen && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [sidebarOpen, isMobile]);

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* 移动端抽屉式侧边栏 */}
      <AnimatePresence>
        {isMobile && mobileSidebar && sidebarOpen && (
          <>
            {/* 背景遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setSidebarOpen(false)}
            />

            {/* 抽屉内容 */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 z-50 flex h-full bg-white shadow-xl"
              style={{
                width: sidebarWidth,
                paddingTop: `${safeArea.top}px`,
                paddingBottom: `${safeArea.bottom}px`,
              }}
            >
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* 关闭按钮 */}
                <div className="flex justify-end p-4 border-b">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarOpen(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* 侧边栏内容 */}
                <div className="flex-1 overflow-auto">{mobileSidebar}</div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 桌面端侧边栏 */}
      {!isMobile && mobileSidebar && (
        <div
          className="flex-shrink-0 bg-white border-r"
          style={{ width: sidebarWidth }}
        >
          {mobileSidebar}
        </div>
      )}

      {/* 主内容区域 */}
      <div
        className="flex-1 flex flex-col h-full overflow-hidden"
        onClick={closeSidebar}
      >
        {/* 移动端顶部栏 */}
        {isMobile && (
          <div
            className="flex items-center justify-between px-4 py-3 bg-white border-b z-30"
            style={{ paddingTop: `${Math.max(12, safeArea.top)}px` }}
          >
            {mobileSidebar && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSidebarOpen(!sidebarOpen);
                }}
                className="h-8 w-8 p-0"
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1 text-center font-medium">YanYu Cloud³</div>
            <div className="w-8" /> {/* 占位符保持居中 */}
          </div>
        )}

        {/* 页面内容 */}
        <div
          className="flex-1 overflow-auto"
          style={{
            paddingBottom: isMobile && showBottomNav ? "80px" : "0",
          }}
        >
          {children}
        </div>
      </div>

      {/* 移动端底部导航栏 */}
      {isMobile && showBottomNav && bottomNavItems.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 bg-white border-t z-30 flex items-center justify-around"
          style={{
            height: `${64 + safeArea.bottom}px`,
            paddingBottom: `${safeArea.bottom}px`,
          }}
        >
          {bottomNavItems.map((item, index) => (
            <Button
              key={index}
              variant="ghost"
              className={`flex flex-col items-center justify-center h-14 px-2 text-xs gap-1 ${
                item.active ? "text-primary" : "text-muted-foreground"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                item.onClick();
              }}
            >
              <div className="h-5 w-5">{item.icon}</div>
              <span className="truncate max-w-[50px]">{item.label}</span>
            </Button>
          ))}
        </div>
      )}

      {/* 移动端底部导航栏（简化版本） */}
      {isMobile &&
        showBottomNav &&
        bottomNavItems.length === 0 &&
        mobileSidebar && (
          <div
            className="fixed bottom-0 left-0 right-0 bg-white border-t z-30 flex items-center justify-center"
            style={{
              height: `${64 + safeArea.bottom}px`,
              paddingBottom: `${safeArea.bottom}px`,
            }}
          >
            <Button
              variant="ghost"
              className="flex flex-col items-center justify-center h-14 px-4 text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                setSidebarOpen(!sidebarOpen);
              }}
            >
              <Menu className="h-5 w-5" />
              <span>菜单</span>
            </Button>
          </div>
        )}
    </div>
  );
}
