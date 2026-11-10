/**
 * @file: PreviewModeControl.tsx
 * @description: 预览模式控制组件，提供模式切换、延迟设置、手动触发等功能
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: ui,preview,mode-control,settings
 */

import React, { useState } from "react";
import {
  Zap,
  MousePointer,
  Clock,
  Brain,
  Play,
  Settings,
  ChevronDown,
} from "lucide-react";
import { usePreviewStore, type PreviewMode } from "./stores/usePreviewStore";

// ================================================================
// PreviewModeControl — 预览模式控制组件
// ================================================================

interface PreviewModeControlProps {
  /** 是否显示为紧凑模式 */
  compact?: boolean;
  /** 是否显示手动触发按钮 */
  showManualTrigger?: boolean;
  /** 是否显示延迟设置 */
  showDelaySettings?: boolean;
}

/**
 * 预览模式控制组件
 *
 * 功能：
 * - 实时/手动/延迟/智能四种模式切换
 * - 延迟时间滑块（延迟模式）
 * - 手动触发按钮（手动模式）
 * - 当前模式状态指示
 */
export function PreviewModeControl({
  compact = false,
  showManualTrigger = true,
  showDelaySettings = true,
}: PreviewModeControlProps) {
  const {
    mode,
    setMode,
    previewDelay,
    setPreviewDelay,
    manualTriggerPreview,
    getModeControllerStatus,
    hasPendingPreviewUpdate,
  } = usePreviewStore();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const status = getModeControllerStatus();
  const hasPending = hasPendingPreviewUpdate();

  // 模式配置
  const MODE_CONFIG: Record<
    PreviewMode,
    {
      icon: React.ReactNode;
      label: string;
      description: string;
      color: string;
    }
  > = {
    realtime: {
      icon: <Zap className="w-4 h-4" />,
      label: "实时",
      description: "编辑时立即更新预览",
      color: "text-green-500",
    },
    manual: {
      icon: <MousePointer className="w-4 h-4" />,
      label: "手动",
      description: "手动点击触发预览",
      color: "text-blue-500",
    },
    delayed: {
      icon: <Clock className="w-4 h-4" />,
      label: "延迟",
      description: "编辑后延迟更新预览",
      color: "text-yellow-500",
    },
    smart: {
      icon: <Brain className="w-4 h-4" />,
      label: "智能",
      description: "根据编辑频率自动选择模式",
      color: "text-purple-500",
    },
  };

  const currentMode = MODE_CONFIG[mode];

  return (
    <div className="relative">
      {/* 模式选择器 */}
      <div className="flex items-center gap-2">
        {/* 当前模式显示 */}
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-md
            bg-slate-800/50 hover:bg-slate-800 transition-colors
            border border-slate-700
            ${compact ? "text-sm" : "text-sm"}
          `}
        >
          <span className={currentMode.color}>{currentMode.icon}</span>
          <span className="text-slate-200">{currentMode.label}</span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${
              showDropdown ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* 手动触发按钮 */}
        {showManualTrigger && mode === "manual" && (
          <button
            onClick={manualTriggerPreview}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md
              bg-blue-600 hover:bg-blue-700 transition-colors
              ${hasPending ? "animate-pulse" : ""}
            `}
            title="手动触发预览"
          >
            <Play className="w-4 h-4" />
            <span className="text-sm text-white">触发预览</span>
          </button>
        )}

        {/* 设置按钮 */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`
            p-1.5 rounded-md hover:bg-slate-800 transition-colors
            ${showSettings ? "bg-slate-800" : ""}
          `}
          title="设置"
        >
          <Settings className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* 下拉菜单 */}
      {showDropdown && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
          {Object.entries(MODE_CONFIG).map(([modeKey, config]) => (
            <button
              key={modeKey}
              onClick={() => {
                setMode(modeKey as PreviewMode);
                setShowDropdown(false);
              }}
              className={`
                w-full flex items-start gap-3 p-3 hover:bg-slate-700/50 transition-colors
                ${mode === modeKey ? "bg-slate-700/30" : ""}
                first:rounded-t-lg last:rounded-b-lg
              `}
            >
              <span className={config.color}>{config.icon}</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-slate-200">
                  {config.label}
                </div>
                <div className="text-xs text-slate-400">
                  {config.description}
                </div>
              </div>
              {mode === modeKey && (
                <span className="text-blue-400 text-sm">✓</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 设置面板 */}
      {showSettings && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 p-4">
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-slate-200 mb-2">
                预览设置
              </div>

              {/* 延迟设置 */}
              {showDelaySettings && mode === "delayed" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">延迟时间</span>
                    <span className="text-sm text-blue-400 font-mono">
                      {previewDelay}ms
                    </span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="5000"
                    step="100"
                    value={previewDelay}
                    onChange={(e) => setPreviewDelay(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>200ms</span>
                    <span>5000ms</span>
                  </div>
                </div>
              )}

              {/* 状态显示 */}
              {status && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <div className="text-xs text-slate-400 mb-2">
                    控制器状态
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">模式</span>
                      <span className="text-xs text-slate-300">
                        {MODE_CONFIG[status.mode].label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">延迟</span>
                      <span className="text-xs text-slate-300">
                        {status.delay}ms
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">待更新</span>
                      <span
                        className={`text-xs ${
                          status.hasPendingUpdate
                            ? "text-yellow-400"
                            : "text-slate-300"
                        }`}
                      >
                        {status.hasPendingUpdate ? "是" : "否"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">计时器</span>
                      <span
                        className={`text-xs ${
                          status.hasActiveTimer
                            ? "text-green-400"
                            : "text-slate-300"
                        }`}
                      >
                        {status.hasActiveTimer ? "活跃" : "空闲"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 点击外部关闭 */}
      {(showDropdown || showSettings) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowDropdown(false);
            setShowSettings(false);
          }}
        />
      )}
    </div>
  );
}

export default PreviewModeControl;
