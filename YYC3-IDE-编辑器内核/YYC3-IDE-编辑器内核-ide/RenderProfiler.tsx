/**
 * @file: RenderProfiler.tsx
 * @description: YYC³ React 渲染性能监控 — 基于 React Profiler API 的组件级性能追踪
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-16
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: react,profiler,performance,monitor
 */

import React, { Profiler, useCallback, useRef } from "react";
import { logger } from "./services/Logger";

export interface RenderMetric {
  id: string;
  phase: "mount" | "update" | "nested-update";
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
}

interface RenderProfilerProps {
  id: string;
  children: React.ReactNode;
  threshold?: number;
  onSlowRender?: (metric: RenderMetric) => void;
}

const SLOW_RENDER_THRESHOLD = 16;
const metricsBuffer: RenderMetric[] = [];
const MAX_BUFFER_SIZE = 200;

function onRenderCallback(
  id: string,
  phase: "mount" | "update" | "nested-update",
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number,
): void {
  const metric: RenderMetric = {
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
  };

  metricsBuffer.push(metric);
  if (metricsBuffer.length > MAX_BUFFER_SIZE) {
    metricsBuffer.shift();
  }

  if (actualDuration > SLOW_RENDER_THRESHOLD) {
    logger.warn(
      `[RenderProfiler] Slow render detected: ${id} (${phase}) took ${actualDuration.toFixed(2)}ms`,
    );
  }
}

export function getRenderMetrics(): RenderMetric[] {
  return [...metricsBuffer];
}

export function getSlowRenders(threshold = SLOW_RENDER_THRESHOLD): RenderMetric[] {
  return metricsBuffer.filter((m) => m.actualDuration > threshold);
}

export function clearRenderMetrics(): void {
  metricsBuffer.length = 0;
}

export function RenderProfiler({
  id,
  children,
  threshold = SLOW_RENDER_THRESHOLD,
  onSlowRender,
}: RenderProfilerProps) {
  const lastWarnRef = useRef(0);

  const handleRender = useCallback(
    (
      _id: string,
      phase: "mount" | "update" | "nested-update",
      actualDuration: number,
      baseDuration: number,
      startTime: number,
      commitTime: number,
    ) => {
      onRenderCallback(id, phase, actualDuration, baseDuration, startTime, commitTime);

      if (actualDuration > threshold && onSlowRender) {
        const now = Date.now();
        if (now - lastWarnRef.current > 1000) {
          lastWarnRef.current = now;
          onSlowRender({
            id,
            phase,
            actualDuration,
            baseDuration,
            startTime,
            commitTime,
          });
        }
      }
    },
    [id, threshold, onSlowRender],
  );

  return (
    <Profiler id={id} onRender={handleRender}>
      {children}
    </Profiler>
  );
}
