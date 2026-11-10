/**
 * @file: types/previewTypes.ts
 * @description: 预览系统共享类型定义，解决循环依赖问题
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-04
 * @updated: 2026-04-04
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: types,preview,shared
 */

export type PreviewMode = "realtime" | "manual" | "delayed" | "smart";
export type DeviceType = "desktop" | "tablet" | "mobile" | "custom";
export type PreviewEngineType = "iframe" | "sandpack";

export interface DevicePreset {
  id: string;
  name: string;
  type: DeviceType;
  width: number;
  height: number;
  userAgent?: string;
  pixelRatio?: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
}

export interface ConsoleLog {
  id: string;
  type: "log" | "warn" | "error" | "info" | "debug";
  message: string;
  timestamp: number;
  count: number;
}

export interface PreviewSnapshot {
  id: string;
  code: string;
  language: string;
  timestamp: number;
  label?: string;
}
