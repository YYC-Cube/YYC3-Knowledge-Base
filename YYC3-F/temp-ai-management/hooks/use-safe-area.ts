import { useState, useEffect } from "react";

interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function useSafeArea(): SafeAreaInsets {
  const [safeArea, setSafeArea] = useState<SafeAreaInsets>({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateSafeArea = () => {
      // 获取CSS环境变量（iOS Safari支持）
      const computedStyle = getComputedStyle(document.documentElement);

      const top = parseInt(
        computedStyle.getPropertyValue("env(safe-area-inset-top)") || "0",
        10
      );
      const right = parseInt(
        computedStyle.getPropertyValue("env(safe-area-inset-right)") || "0",
        10
      );
      const bottom = parseInt(
        computedStyle.getPropertyValue("env(safe-area-inset-bottom)") || "0",
        10
      );
      const left = parseInt(
        computedStyle.getPropertyValue("env(safe-area-inset-left)") || "0",
        10
      );

      setSafeArea({ top, right, bottom, left });
    };

    updateSafeArea();

    // 监听方向变化
    const handleOrientationChange = () => {
      // 延迟更新，确保CSS变量已更新
      setTimeout(updateSafeArea, 100);
    };

    window.addEventListener("orientationchange", handleOrientationChange);
    window.addEventListener("resize", updateSafeArea);

    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange);
      window.removeEventListener("resize", updateSafeArea);
    };
  }, []);

  return safeArea;
}

// CSS样式工具函数
export function getSafeAreaStyle(safeArea: SafeAreaInsets) {
  return {
    paddingTop: `${safeArea.top}px`,
    paddingRight: `${safeArea.right}px`,
    paddingBottom: `${safeArea.bottom}px`,
    paddingLeft: `${safeArea.left}px`,
  };
}

// CSS变量工具函数
export function useSafeAreaCSS() {
  const safeArea = useSafeArea();

  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    root.style.setProperty("--safe-area-inset-top", `${safeArea.top}px`);
    root.style.setProperty("--safe-area-inset-right", `${safeArea.right}px`);
    root.style.setProperty("--safe-area-inset-bottom", `${safeArea.bottom}px`);
    root.style.setProperty("--safe-area-inset-left", `${safeArea.left}px`);
  }, [safeArea]);

  return safeArea;
}

// 检测是否在iOS Safari中
export function useIsIOSSafari() {
  const [isIOSSafari, setIsIOSSafari] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const userAgent = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isSafari =
      /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(userAgent);

    setIsIOSSafari(isIOS && isSafari);
  }, []);

  return isIOSSafari;
}
