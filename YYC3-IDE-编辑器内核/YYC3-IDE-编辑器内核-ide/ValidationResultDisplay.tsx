// @ts-nocheck
/**
 * @file: ValidationResultDisplay.tsx
 * @description: 验证结果展示组件，显示代码验证的错误、警告、建议和指标
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: ui,validation,result,display
 */

import React, { useState } from "react";
import type { ValidationResult } from "../CodeValidator";

// ================================================================
// ValidationResultDisplay — 验证结果展示组件
// ================================================================

interface ValidationResultDisplayProps {
  /** 文件路径 */
  filepath: string;
  /** 验证结果 */
  result: ValidationResult;
  /** 是否默认展开 */
  defaultExpanded?: boolean;
  /** 是否显示代码指标 */
  showMetrics?: boolean;
}

/**
 * 验证结果展示组件
 *
 * 功能：
 * - 显示错误、警告、建议
 * - 显示代码指标
 * - 可折叠/展开
 * - 颜色编码（错误红色、警告黄色、建议蓝色）
 */
export function ValidationResultDisplay({
  filepath,
  result,
  defaultExpanded = false,
  showMetrics = true,
}: ValidationResultDisplayProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const hasErrors = result.errors.length > 0;
  const hasWarnings = result.warnings.length > 0;
  const hasSuggestions = result.suggestions.length > 0;
  const hasIssues = hasErrors || hasWarnings || hasSuggestions;

  // 决定状态颜色
  const getStatusColor = () => {
    if (hasErrors) return "text-red-500";
    if (hasWarnings) return "text-yellow-500";
    if (hasSuggestions) return "text-blue-500";
    return "text-green-500";
  };

  // 决定状态图标
  const getStatusIcon = () => {
    if (hasErrors) return "✗";
    if (hasWarnings) return "⚠";
    if (hasSuggestions) return "ℹ";
    return "✓";
  };

  // 决定状态文本
  const getStatusText = () => {
    if (hasErrors) return "验证失败";
    if (hasWarnings) return "验证通过（有警告）";
    if (hasSuggestions) return "验证通过（有建议）";
    return "验证通过";
  };

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden bg-[var(--ide-bg)]">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-800/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${getStatusColor()}`}>
            {getStatusIcon()}
          </span>
          <div>
            <div className="text-sm font-medium text-slate-200">{filepath}</div>
            <div className="text-xs text-slate-400">{getStatusText()}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {showMetrics && (
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span>{result.metrics.lines} 行</span>
              <span>•</span>
              <span>{result.metrics.complexity} 复杂度</span>
            </div>
          )}

          {hasIssues && (
            <div className="flex items-center gap-2 text-xs">
              {hasErrors && (
                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                  {result.errors.length} 错误
                </span>
              )}
              {hasWarnings && (
                <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                  {result.warnings.length} 警告
                </span>
              )}
              {hasSuggestions && (
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                  {result.suggestions.length} 建议
                </span>
              )}
            </div>
          )}

          <span className="text-slate-500 text-sm">
            {expanded ? "▼" : "▶"}
          </span>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && hasIssues && (
        <div className="border-t border-slate-700 p-3 space-y-3">
          {/* Errors */}
          {hasErrors && (
            <div>
              <h4 className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1">
                <span>✗</span>
                错误
              </h4>
              <ul className="space-y-1">
                {result.errors.map((error, index) => (
                  <li
                    key={index}
                    className="text-xs text-red-300 pl-4 border-l-2 border-red-500/50"
                  >
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {hasWarnings && (
            <div>
              <h4 className="text-xs font-semibold text-yellow-400 mb-2 flex items-center gap-1">
                <span>⚠</span>
                警告
              </h4>
              <ul className="space-y-1">
                {result.warnings.map((warning, index) => (
                  <li
                    key={index}
                    className="text-xs text-yellow-300 pl-4 border-l-2 border-yellow-500/50"
                  >
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          {hasSuggestions && (
            <div>
              <h4 className="text-xs font-semibold text-blue-400 mb-2 flex items-center gap-1">
                <span>ℹ</span>
                建议
              </h4>
              <ul className="space-y-1">
                {result.suggestions.map((suggestion, index) => (
                  <li
                    key={index}
                    className="text-xs text-blue-300 pl-4 border-l-2 border-blue-500/50"
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Metrics (if shown and expanded) */}
      {expanded && showMetrics && (
        <div className="border-t border-slate-700 p-3">
          <h4 className="text-xs font-semibold text-slate-400 mb-2">代码指标</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-slate-200">
                {result.metrics.lines}
              </div>
              <div className="text-xs text-slate-500">行数</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-slate-200">
                {result.metrics.characters}
              </div>
              <div className="text-xs text-slate-500">字符数</div>
            </div>
            <div className="text-center">
              <div
                className={`text-lg font-bold ${
                  result.metrics.complexity === "low"
                    ? "text-green-400"
                    : result.metrics.complexity === "medium"
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >
                {result.metrics.complexity === "low"
                  ? "低"
                  : result.metrics.complexity === "medium"
                  ? "中"
                  : "高"}
              </div>
              <div className="text-xs text-slate-500">复杂度</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================================
// ValidationResultsList — 验证结果列表组件
// ================================================================

interface ValidationResultsListProps {
  /** 验证结果映射 */
  results: Map<string, ValidationResult>;
  /** 是否默认展开所有结果 */
  defaultExpandAll?: boolean;
}

/**
 * 验证结果列表组件
 *
 * 显示多个文件的验证结果
 */
export function ValidationResultsList({
  results,
  defaultExpandAll = false,
}: ValidationResultsListProps) {
  const entries = Array.from(results.entries());

  if (entries.length === 0) {
    return (
      <div className="text-sm text-slate-500 text-center py-4">
        无验证结果
      </div>
    );
  }

  // 统计信息
  const totalErrors = entries.reduce(
    (sum, [, result]) => sum + result.errors.length,
    0
  );
  const totalWarnings = entries.reduce(
    (sum, [, result]) => sum + result.warnings.length,
    0
  );
  const totalSuggestions = entries.reduce(
    (sum, [, result]) => sum + result.suggestions.length,
    0
  );

  return (
    <div className="space-y-2">
      {/* Summary */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 rounded">
        <div className="text-sm font-medium text-slate-200">
          验证结果 ({entries.length} 个文件)
        </div>
        <div className="flex items-center gap-2 text-xs">
          {totalErrors > 0 && (
            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400">
              {totalErrors} 错误
            </span>
          )}
          {totalWarnings > 0 && (
            <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
              {totalWarnings} 警告
            </span>
          )}
          {totalSuggestions > 0 && (
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
              {totalSuggestions} 建议
            </span>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-2">
        {entries.map(([filepath, result]) => (
          <ValidationResultDisplay
            key={filepath}
            filepath={filepath}
            result={result}
            defaultExpanded={defaultExpandAll}
          />
        ))}
      </div>
    </div>
  );
}
