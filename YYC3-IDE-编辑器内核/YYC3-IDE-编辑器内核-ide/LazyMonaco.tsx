/**
 * @file: LazyMonaco.tsx
 * @description: Monaco Editor 懒加载包装器，支持预加载、渐进式 Worker 加载、
 *              加载进度反馈，减少首屏 bundle 大小和加载时间
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.0.0
 * @created: 2026-03-30
 * @updated: 2026-04-17
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: lazy-loading,monaco,performance,code-split,preload
 */

import { lazy, Suspense, useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";

const MonacoWrapperLazy = lazy(() => import("./MonacoWrapper"));

type LoadPhase = "idle" | "core" | "worker" | "ready";

let preloadPromise: Promise<typeof import("./MonacoWrapper")> | null = null;
let preloaded = false;

export function preloadMonaco(): Promise<typeof import("./MonacoWrapper")> {
  if (preloaded && preloadPromise) return preloadPromise;
  preloadPromise = import("./MonacoWrapper");
  preloaded = true;
  return preloadPromise;
}

export function schedulePreload(delayMs: number = 2000): void {
  if (preloaded) return;
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(
      () => setTimeout(preloadMonaco, delayMs),
      { timeout: delayMs + 3000 },
    );
  } else {
    setTimeout(preloadMonaco, delayMs);
  }
}

function MonacoLoading() {
  const [phase, setPhase] = useState<LoadPhase>("idle");
  const [dots, setDots] = useState("");

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase("core"), 300),
      setTimeout(() => setPhase("worker"), 1200),
      setTimeout(() => setPhase("ready"), 2500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (phase === "ready") return;
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 500);
    return () => clearInterval(interval);
  }, [phase]);

  const phaseText: Record<LoadPhase, string> = {
    idle: "准备加载",
    core: "加载编辑器核心",
    worker: "初始化语言服务",
    ready: "即将就绪",
  };

  return (
    <div className="flex items-center justify-center h-full w-full bg-[#0a1929]">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          {phase !== "idle" && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-blue-500/30 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            </div>
          )}
        </div>
        <p className="text-sm text-gray-400">
          {phaseText[phase]}{dots}
        </p>
        <div className="w-32 h-0.5 bg-gray-800 rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-blue-400/60 rounded-full transition-all duration-700 ease-out"
            style={{
              width: phase === "idle" ? "0%" : phase === "core" ? "30%" : phase === "worker" ? "70%" : "100%",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function LazyMonacoWrapper(props: React.ComponentProps<typeof MonacoWrapperLazy>) {
  const [preloadedModule, setPreloadedModule] = useState<typeof import("./MonacoWrapper") | null>(null);

  const triggerPreload = useCallback(() => {
    if (!preloaded) {
      preloadMonaco().then((mod) => {
        setPreloadedModule(mod);
      });
    }
  }, []);

  useEffect(() => {
    schedulePreload(1500);
  }, []);

  if (preloadedModule) {
    const PreloadedComponent = preloadedModule.default;
    return (
      <Suspense fallback={<MonacoLoading />}>
        <PreloadedComponent {...(props as any)} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<MonacoLoading />}>
      <MonacoWrapperLazy {...props} />
    </Suspense>
  );
}

export default LazyMonacoWrapper;
