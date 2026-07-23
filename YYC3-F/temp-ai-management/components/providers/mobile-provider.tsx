"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  useIsMobile,
  useIsTablet,
  useDeviceType,
  useIsTouch,
} from "@/hooks/use-mobile";
import {
  useMediaQuery,
  useOrientation,
  usePrefersReducedMotion,
} from "@/hooks/use-media-query";
import { useSafeArea, useIsIOSSafari } from "@/hooks/use-safe-area";

interface MobileContextType {
  // 设备检测
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  deviceType: "mobile" | "tablet" | "desktop";
  isTouch: boolean;

  // 系统偏好
  orientation: "portrait" | "landscape";
  prefersReducedMotion: boolean;
  prefersDarkMode: boolean;

  // 平台检测
  isIOSSafari: boolean;
  isAndroid: boolean;
  isIOS: boolean;

  // 安全区域
  safeArea: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };

  // 功能支持
  supportsHover: boolean;
  supportsVibration: boolean;
  supportsShare: boolean;

  // UI状态
  showMobileOptimizations: boolean;

  // 工具函数
  vibrate: (pattern?: number | number[]) => void;
  share: (data: ShareData) => Promise<void>;
}

const MobileContext = createContext<MobileContextType | undefined>(undefined);

export const useMobile = () => {
  const context = useContext(MobileContext);
  if (context === undefined) {
    throw new Error("useMobile must be used within a MobileProvider");
  }
  return context;
};

interface MobileProviderProps {
  children: React.ReactNode;
  enableMobileOptimizations?: boolean;
}

export function MobileProvider({
  children,
  enableMobileOptimizations = true,
}: MobileProviderProps) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const deviceType = useDeviceType();
  const isTouch = useIsTouch();
  const orientation = useOrientation();
  const prefersReducedMotion = usePrefersReducedMotion();
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const isIOSSafari = useIsIOSSafari();
  const safeArea = useSafeArea();

  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [supportsHover, setSupportsHover] = useState(false);
  const [supportsVibration, setSupportsVibration] = useState(false);
  const [supportsShare, setSupportsShare] = useState(false);

  // 检测平台和功能支持
  useEffect(() => {
    if (typeof window === "undefined") return;

    const userAgent = window.navigator.userAgent;

    // 平台检测
    setIsAndroid(/Android/.test(userAgent));
    setIsIOS(/iPad|iPhone|iPod/.test(userAgent));

    // 功能支持检测
    setSupportsHover(window.matchMedia("(hover: hover)").matches);
    setSupportsVibration("vibrate" in navigator);
    setSupportsShare("share" in navigator);
  }, []);

  // 振动功能
  const vibrate = (pattern: number | number[] = 50) => {
    if (supportsVibration && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  // 分享功能
  const share = async (data: ShareData) => {
    if (supportsShare && navigator.share) {
      try {
        await navigator.share(data);
      } catch (error) {
        console.warn("Share failed:", error);
        // 降级到复制链接
        if (data.url && navigator.clipboard) {
          await navigator.clipboard.writeText(data.url);
        }
      }
    } else if (data.url && navigator.clipboard) {
      // 降级到复制链接
      await navigator.clipboard.writeText(data.url);
    }
  };

  const contextValue: MobileContextType = {
    // 设备检测
    isMobile,
    isTablet,
    isDesktop: deviceType === "desktop",
    deviceType,
    isTouch,

    // 系统偏好
    orientation,
    prefersReducedMotion,
    prefersDarkMode,

    // 平台检测
    isIOSSafari,
    isAndroid,
    isIOS,

    // 安全区域
    safeArea,

    // 功能支持
    supportsHover,
    supportsVibration,
    supportsShare,

    // UI状态
    showMobileOptimizations:
      enableMobileOptimizations && (isMobile || isTablet),

    // 工具函数
    vibrate,
    share,
  };

  return (
    <MobileContext.Provider value={contextValue}>
      {children}
    </MobileContext.Provider>
  );
}

// 设备类型指示器组件
export function DeviceTypeIndicator() {
  const { deviceType, orientation, isTouch } = useMobile();

  return (
    <div className="fixed top-2 right-2 z-50 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-50">
      {deviceType} | {orientation} | {isTouch ? "touch" : "mouse"}
    </div>
  );
}

// 安全区域组件
interface SafeAreaViewProps {
  children: React.ReactNode;
  edges?: ("top" | "right" | "bottom" | "left")[];
  className?: string;
}

export function SafeAreaView({
  children,
  edges = ["top", "right", "bottom", "left"],
  className = "",
}: SafeAreaViewProps) {
  const { safeArea } = useMobile();

  const style = {
    paddingTop: edges.includes("top") ? `${safeArea.top}px` : undefined,
    paddingRight: edges.includes("right") ? `${safeArea.right}px` : undefined,
    paddingBottom: edges.includes("bottom")
      ? `${safeArea.bottom}px`
      : undefined,
    paddingLeft: edges.includes("left") ? `${safeArea.left}px` : undefined,
  };

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

// 条件渲染组件
interface MobileOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function MobileOnly({ children, fallback }: MobileOnlyProps) {
  const { isMobile } = useMobile();
  return <>{isMobile ? children : fallback}</>;
}

export function TabletOnly({ children, fallback }: MobileOnlyProps) {
  const { isTablet } = useMobile();
  return <>{isTablet ? children : fallback}</>;
}

export function DesktopOnly({ children, fallback }: MobileOnlyProps) {
  const { isDesktop } = useMobile();
  return <>{isDesktop ? children : fallback}</>;
}

export function TouchOnly({ children, fallback }: MobileOnlyProps) {
  const { isTouch } = useMobile();
  return <>{isTouch ? children : fallback}</>;
}

// 平台特定组件
export function IOSOnly({ children, fallback }: MobileOnlyProps) {
  const { isIOS } = useMobile();
  return <>{isIOS ? children : fallback}</>;
}

export function AndroidOnly({ children, fallback }: MobileOnlyProps) {
  const { isAndroid } = useMobile();
  return <>{isAndroid ? children : fallback}</>;
}

// 方向感知组件
export function PortraitOnly({ children, fallback }: MobileOnlyProps) {
  const { orientation } = useMobile();
  return <>{orientation === "portrait" ? children : fallback}</>;
}

export function LandscapeOnly({ children, fallback }: MobileOnlyProps) {
  const { orientation } = useMobile();
  return <>{orientation === "landscape" ? children : fallback}</>;
}

// 触觉反馈Hook
export function useHapticFeedback() {
  const { vibrate, supportsVibration } = useMobile();

  return {
    light: () => supportsVibration && vibrate(10),
    medium: () => supportsVibration && vibrate(50),
    heavy: () => supportsVibration && vibrate([50, 50, 50]),
    success: () => supportsVibration && vibrate([10, 50, 10]),
    warning: () => supportsVibration && vibrate([50, 100, 50]),
    error: () => supportsVibration && vibrate([100, 50, 100, 50, 100]),
    supportsVibration,
  };
}

// 分享Hook
export function useShare() {
  const { share, supportsShare } = useMobile();

  return {
    share,
    supportsShare,
    shareText: (text: string, title?: string) => share({ text, title }),
    shareUrl: (url: string, title?: string, text?: string) =>
      share({ url, title, text }),
  };
}
