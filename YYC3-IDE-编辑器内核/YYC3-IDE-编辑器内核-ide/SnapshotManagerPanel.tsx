// @ts-nocheck
/**
 * @file: SnapshotManagerPanel.tsx
 * @description: 快照管理面板组件，提供创建、恢复、删除、比较快照等功能
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: ui,snapshot,manager,panel
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Camera,
  _Clock,
  RotateCcw,
  Trash2,
  GitCompare,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  Calendar,
  Info,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { usePreviewStore } from "./stores/usePreviewStore";
import { useFileStore } from "./FileStore";
import type { Snapshot, SnapshotComparison } from "./SnapshotManager";
import SnapshotDiffModal from "./SnapshotDiffModal";
import { confirmDialog } from "./stores/useConfirmStore";

// ================================================================
// SnapshotManagerPanel — 快照管理面板组件
// ================================================================

interface SnapshotManagerPanelProps {
  /** 是否默认展开 */
  defaultExpanded?: boolean;
  /** 最大显示快照数 */
  maxSnapshots?: number;
}

/**
 * 快照管理面板组件
 *
 * 功能：
 * - 快照列表展示
 * - 创建快照按钮
 * - 恢复/删除操作
 * - 快照比较视图
 */
export function SnapshotManagerPanel({
  defaultExpanded = true,
  maxSnapshots = 50,
}: SnapshotManagerPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedSnapshots, setSelectedSnapshots] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [comparison, setComparison] = useState<SnapshotComparison | null>(null);
  const [newSnapshotLabel, setNewSnapshotLabel] = useState("");
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoreResult, setRestoreResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const {
    initSnapshotManager,
    createProjectSnapshot,
    listProjectSnapshots,
    deleteProjectSnapshot,
    compareProjectSnapshots,
    getSnapshotStorageStats,
    restoreProjectSnapshot,
  } = usePreviewStore();

  const { files } = useFileStore();

  // 初始化快照管理器
  useEffect(() => {
    initSnapshotManager();
    refreshSnapshots();
  }, [initSnapshotManager]);

  // 刷新快照列表
  const refreshSnapshots = () => {
    const list = listProjectSnapshots();
    setSnapshots(list.slice(0, maxSnapshots));
  };

  // 创建快照
  const handleCreateSnapshot = () => {
    const label = newSnapshotLabel.trim() || `快照 ${new Date().toLocaleString()}`;
    const fileList = Object.entries(files).map(([path, content]) => ({
      path,
      content,
    }));

    const snapshot = createProjectSnapshot(label, fileList);
    if (snapshot) {
      refreshSnapshots();
      setNewSnapshotLabel("");
      setShowCreateInput(false);
    }
  };

  const handleRestoreSnapshot = useCallback(
    async (id: string, label: string) => {
      setRestoringId(id);
      setRestoreResult(null);
      try {
        const result = await restoreProjectSnapshot(id);
        if (result.success) {
          setRestoreResult({
            success: true,
            message: `已恢复快照「${label}」(${result.restoredFiles.length} 个文件)`,
          });
        } else {
          setRestoreResult({
            success: false,
            message: `恢复失败：${result.error || "快照不存在"}`,
          });
        }
      } catch (err) {
        setRestoreResult({
          success: false,
          message: `恢复异常：${err instanceof Error ? err.message : "未知错误"}`,
        });
      } finally {
        setRestoringId(null);
        setTimeout(() => setRestoreResult(null), 4000);
      }
    },
    [restoreProjectSnapshot],
  );

  const handleDeleteSnapshot = async (id: string) => {
    if (await confirmDialog("确定要删除这个快照吗？")) {
      deleteProjectSnapshot(id);
      refreshSnapshots();
      setSelectedSnapshots(selectedSnapshots.filter((sid) => sid !== id));
    }
  };

  // 比较快照
  const handleCompareSnapshots = () => {
    if (selectedSnapshots.length !== 2) {
      setRestoreResult({
        success: false,
        message: "请选择两个快照进行比较",
      });
      setTimeout(() => setRestoreResult(null), 3000);
      return;
    }

    const result = compareProjectSnapshots(
      selectedSnapshots[0],
      selectedSnapshots[1]
    );
    if (result) {
      setComparison(result);
      setShowComparison(true);
    }
  };

  // 切换快照选择
  const toggleSnapshotSelection = (id: string) => {
    if (selectedSnapshots.includes(id)) {
      setSelectedSnapshots(selectedSnapshots.filter((sid) => sid !== id));
    } else {
      if (selectedSnapshots.length >= 2) {
        setSelectedSnapshots([selectedSnapshots[1], id]);
      } else {
        setSelectedSnapshots([...selectedSnapshots, id]);
      }
    }
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 获取存储统计
  const stats = getSnapshotStorageStats();

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden bg-[var(--ide-bg)]">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 bg-slate-800/50 cursor-pointer hover:bg-slate-800/70 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-slate-200">快照管理</span>
          {stats && (
            <span className="text-xs text-slate-400">
              ({stats.snapshotCount} 个快照)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {stats && (
            <span className="text-xs text-slate-500">{stats.estimatedSize}</span>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="p-3 space-y-3">
          {/* 操作栏 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateInput(!showCreateInput)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm"
            >
              <Camera className="w-4 h-4" />
              <span>创建快照</span>
            </button>

            {selectedSnapshots.length === 2 && (
              <button
                onClick={handleCompareSnapshots}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-700 transition-colors text-white text-sm"
              >
                <GitCompare className="w-4 h-4" />
                <span>比较快照</span>
              </button>
            )}
          </div>

          {/* 创建快照输入 */}
          {showCreateInput && (
            <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg">
              <input
                type="text"
                value={newSnapshotLabel}
                onChange={(e) => setNewSnapshotLabel(e.target.value)}
                placeholder="快照标签（可选）"
                className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateSnapshot();
                  if (e.key === "Escape") {
                    setShowCreateInput(false);
                    setNewSnapshotLabel("");
                  }
                }}
              />
              <button
                onClick={handleCreateSnapshot}
                className="px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 transition-colors text-white text-sm"
              >
                创建
              </button>
              <button
                onClick={() => {
                  setShowCreateInput(false);
                  setNewSnapshotLabel("");
                }}
                className="p-1.5 rounded-md hover:bg-slate-700 transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          )}

          {/* 快照列表 */}
          {snapshots.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div>暂无快照</div>
              <div className="text-xs mt-1">点击"创建快照"保存当前项目状态</div>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {snapshots.map((snapshot) => (
                <div
                  key={snapshot.id}
                  className={`
                    p-3 rounded-lg border transition-colors cursor-pointer
                    ${
                      selectedSnapshots.includes(snapshot.id)
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-slate-700 bg-slate-800/30 hover:bg-slate-800/50"
                    }
                  `}
                  onClick={() => toggleSnapshotSelection(snapshot.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-200 mb-1">
                        {snapshot.label}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatTime(snapshot.timestamp)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          <span>{snapshot.files.length} 个文件</span>
                        </div>
                      </div>
                      {snapshot.metadata && (
                        <div className="text-xs text-slate-500 mt-1">
                          {snapshot.metadata.description || ""}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestoreSnapshot(snapshot.id, snapshot.label);
                        }}
                        disabled={restoringId === snapshot.id}
                        className="p-1 rounded hover:bg-slate-700 transition-colors disabled:opacity-40"
                        title="恢复快照"
                      >
                        {restoringId === snapshot.id ? (
                          <RotateCcw className="w-4 h-4 text-blue-400 animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4 text-slate-400 hover:text-blue-400" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSnapshot(snapshot.id);
                        }}
                        className="p-1 rounded hover:bg-slate-700 transition-colors"
                        title="删除快照"
                      >
                        <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 底部信息 */}
          {stats && snapshots.length > 0 && (
            <div className="pt-3 border-t border-slate-700">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  <span>
                    共 {stats.totalFiles} 个文件，{stats.totalLines} 行代码
                  </span>
                </div>
                <div className="text-slate-500">
                  最多保存 {maxSnapshots} 个快照
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {restoreResult && (
        <div
          className={`mx-3 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-opacity ${
            restoreResult.success
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-red-500/15 text-red-400"
          }`}
        >
          {restoreResult.success ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{restoreResult.message}</span>
        </div>
      )}

      {/* 快照比较模态框 */}
      {showComparison && comparison && (
        <SnapshotDiffModal
          comparison={comparison}
          onClose={() => {
            setShowComparison(false);
            setComparison(null);
          }}
        />
      )}
    </div>
  );
}

export default SnapshotManagerPanel;
