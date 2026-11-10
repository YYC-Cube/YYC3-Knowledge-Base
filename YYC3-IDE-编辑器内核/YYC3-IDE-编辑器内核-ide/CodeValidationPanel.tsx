// @ts-nocheck
/**
 * @file: CodeValidationPanel.tsx
 * @description: 代码验证结果面板组件，显示多个文件的验证结果、统计信息和筛选功能
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: ui,validation,panel,results
 */

import React, { useState, useMemo } from "react";
import {
  AlertCircle,
  AlertTriangle,
  _Info,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  _X,
  FileCode,
  BarChart,
} from "lucide-react";
import { ValidationResultDisplay } from "./ValidationResultDisplay";
import type { ValidationResult } from "./CodeValidator";
import type { ParseAndValidateResult } from "./ai/CodeApplicator";

// ================================================================
// CodeValidationPanel — 代码验证结果面板组件
// ================================================================

interface CodeValidationPanelProps {
  /** 验证结果 */
  validationResult?: ParseAndValidateResult;
  /** 是否默认展开 */
  defaultExpanded?: boolean;
  /** 是否显示筛选器 */
  showFilters?: boolean;
  /** 是否显示统计信息 */
  showStats?: boolean;
}

type FilterType = "all" | "errors" | "warnings" | "suggestions";

/**
 * 代码验证结果面板组件
 *
 * 功能：
 * - 显示多个文件的验证结果
 * - 错误/警告/建议分类显示
 * - 代码指标统计
 * - 可折叠/展开
 * - 筛选功能
 */
export function CodeValidationPanel({
  validationResult,
  defaultExpanded = true,
  showFilters = true,
  showStats = true,
}: CodeValidationPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [filter, setFilter] = useState<FilterType>("all");
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  // 计算统计信息
  const stats = useMemo(() => {
    if (!validationResult) {
      return {
        totalFiles: 0,
        totalErrors: 0,
        totalWarnings: 0,
        totalSuggestions: 0,
        validFiles: 0,
        filesWithIssues: 0,
        avgComplexity: 0,
        totalLines: 0,
      };
    }

    let totalErrors = 0;
    let totalWarnings = 0;
    let totalSuggestions = 0;
    let validFiles = 0;
    let totalComplexity = 0;
    let totalLines = 0;

    validationResult.validations.forEach((result) => {
      totalErrors += result.errors.length;
      totalWarnings += result.warnings.length;
      totalSuggestions += result.suggestions.length;
      totalComplexity += result.metrics.complexity;
      totalLines += result.metrics.lines;

      if (result.errors.length === 0) {
        validFiles++;
      }
    });

    return {
      totalFiles: validationResult.plan.blocks.length,
      totalErrors,
      totalWarnings,
      totalSuggestions,
      validFiles,
      filesWithIssues: validationResult.plan.blocks.length - validFiles,
      avgComplexity:
        validationResult.validations.size > 0
          ? Math.round(totalComplexity / validationResult.validations.size)
          : 0,
      totalLines,
    };
  }, [validationResult]);

  // 筛选文件
  const filteredFiles = useMemo(() => {
    if (!validationResult) return [];

    const files: Array<{
      filepath: string;
      result: ValidationResult;
    }> = [];

    validationResult.validations.forEach((result, filepath) => {
      const hasErrors = result.errors.length > 0;
      const hasWarnings = result.warnings.length > 0;
      const hasSuggestions = result.suggestions.length > 0;

      let shouldShow = true;
      switch (filter) {
        case "errors":
          shouldShow = hasErrors;
          break;
        case "warnings":
          shouldShow = hasWarnings && !hasErrors;
          break;
        case "suggestions":
          shouldShow = hasSuggestions && !hasErrors && !hasWarnings;
          break;
        case "all":
        default:
          shouldShow = true;
          break;
      }

      if (shouldShow) {
        files.push({ filepath, result });
      }
    });

    // 按错误数量排序
    return files.sort((a, b) => {
      const aErrors = a.result.errors.length;
      const bErrors = b.result.errors.length;
      if (aErrors !== bErrors) return bErrors - aErrors;

      const aWarnings = a.result.warnings.length;
      const bWarnings = b.result.warnings.length;
      if (aWarnings !== bWarnings) return bWarnings - aWarnings;

      return 0;
    });
  }, [validationResult, filter]);

  // 切换文件展开状态
  const _toggleFileExpanded = (filepath: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(filepath)) {
      newExpanded.delete(filepath);
    } else {
      newExpanded.add(filepath);
    }
    setExpandedFiles(newExpanded);
  };

  // 全部展开/折叠
  const toggleAllExpanded = () => {
    if (expandedFiles.size === filteredFiles.length) {
      setExpandedFiles(new Set());
    } else {
      setExpandedFiles(new Set(filteredFiles.map((f) => f.filepath)));
    }
  };

  if (!validationResult || validationResult.plan.blocks.length === 0) {
    return null;
  }

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden bg-[var(--ide-bg)]">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 bg-slate-800/50 cursor-pointer hover:bg-slate-800/70 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {validationResult.hasErrors ? (
            <AlertCircle className="w-4 h-4 text-red-500" />
          ) : validationResult.hasWarnings ? (
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
          ) : (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
          <span className="text-sm font-medium text-slate-200">
            代码验证结果
          </span>
          <span className="text-xs text-slate-400">
            ({stats.totalFiles} 个文件)
          </span>
        </div>
        <div className="flex items-center gap-2">
          {stats.totalErrors > 0 && (
            <span className="px-1.5 py-0.5 rounded text-xs bg-red-500/20 text-red-400">
              {stats.totalErrors} 错误
            </span>
          )}
          {stats.totalWarnings > 0 && (
            <span className="px-1.5 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400">
              {stats.totalWarnings} 警告
            </span>
          )}
          {stats.totalSuggestions > 0 && (
            <span className="px-1.5 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
              {stats.totalSuggestions} 建议
            </span>
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
          {/* 统计信息 */}
          {showStats && (
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-slate-800/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileCode className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-400">文件统计</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">总文件数</span>
                    <span className="text-slate-200 font-mono">
                      {stats.totalFiles}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">有效文件</span>
                    <span className="text-green-400 font-mono">
                      {stats.validFiles}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">问题文件</span>
                    <span className="text-red-400 font-mono">
                      {stats.filesWithIssues}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-800/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-400">代码指标</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">总行数</span>
                    <span className="text-slate-200 font-mono">
                      {stats.totalLines}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">平均复杂度</span>
                    <span className="text-slate-200 font-mono">
                      {stats.avgComplexity}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 筛选器 */}
          {showFilters && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              {[
                { value: "all", label: "全部" },
                { value: "errors", label: "错误" },
                { value: "warnings", label: "警告" },
                { value: "suggestions", label: "建议" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value as FilterType)}
                  className={`
                    px-3 py-1 rounded text-xs transition-colors
                    ${
                      filter === option.value
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
              <button
                onClick={toggleAllExpanded}
                className="ml-auto px-3 py-1 rounded text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
              >
                {expandedFiles.size === filteredFiles.length
                  ? "全部折叠"
                  : "全部展开"}
              </button>
            </div>
          )}

          {/* 验证结果列表 */}
          {filteredFiles.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <div>没有找到符合筛选条件的文件</div>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredFiles.map(({ filepath, result }) => (
                <ValidationResultDisplay
                  key={filepath}
                  filepath={filepath}
                  result={result}
                  defaultExpanded={expandedFiles.has(filepath)}
                  showMetrics={true}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CodeValidationPanel;
