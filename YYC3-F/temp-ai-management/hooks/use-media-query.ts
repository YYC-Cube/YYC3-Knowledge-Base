import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // 设置初始值
    setMatches(mediaQueryList.matches);

    // 添加监听器
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener("change", listener);
    } else {
      // 兼容旧版浏览器
      mediaQueryList.addListener(listener);
    }

    // 清理函数
    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener("change", listener);
      } else {
        // 兼容旧版浏览器
        mediaQueryList.removeListener(listener);
      }
    };
  }, [query]);

  return matches;
}

// 预定义的常用媒体查询
export const useBreakpoint = (
  breakpoint: "sm" | "md" | "lg" | "xl" | "2xl"
) => {
  const breakpoints = {
    sm: "(min-width: 640px)",
    md: "(min-width: 768px)",
    lg: "(min-width: 1024px)",
    xl: "(min-width: 1280px)",
    "2xl": "(min-width: 1536px)",
  };

  return useMediaQuery(breakpoints[breakpoint]);
};

// 方向检测
export const useOrientation = () => {
  const isLandscape = useMediaQuery("(orientation: landscape)");
  return isLandscape ? "landscape" : "portrait";
};

// 用户偏好检测
export const usePrefersReducedMotion = () => {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
};

export const usePrefersDarkMode = () => {
  return useMediaQuery("(prefers-color-scheme: dark)");
};
