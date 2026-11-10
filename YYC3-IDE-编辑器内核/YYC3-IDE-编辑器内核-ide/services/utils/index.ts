/**
 * @file: services/utils/index.ts
 * @description: 统一工具函数 barrel — 集中导出所有 utils 模块
 *              替代原有散落的 7 个 utils 文件直接 import 模式
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.0.0
 * @created: 2026-06-04
 * @updated: 2026-06-04
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: utils,barrel,unified,encapsulation
 */

// ================================================================
// 统一工具函数 barrel — 一键导入所有 utils
// ================================================================
//
// 使用方式：
//   import { debounce, generateId, copyToClipboard, formatBytes } from '@/services/utils';
//
// 替代原有的分散 import：
//   import { copyToClipboard } from '../utils/clipboard';
//   import { generateId } from '../utils/generateId';
// ================================================================

// ── 通用工具 (新增) ──
export {
  assert, assertNonNull, debounce, delay, formatBytes,
  formatDuration, memoize,
  once,
  pipe, retry, safeJSONParse,
  safeJSONStringify, throttle, tryCatch,
  tryCatchSync
} from "./helpers";

export type { RetryOptions } from "./helpers";

// ── 剪贴板 ──
export { copyToClipboard } from "../../utils/clipboard";

// ── ID 生成 ──
export { generateId, generateShortId, generateUUID } from "../../utils/generateId";

// ── XTerm 主题 ──
export {
  XTERM_THEMES,
  convertIDEToXtermTheme, createCustomTheme, getSystemPreferredTheme
} from "../../utils/xterm-theme";

// ── Safari 兼容 ──
export {
  addSafariEventListener, applySafariCSSFixes, applySafariPolyfills, createSafariIndexedDB, initializeSafariCompatibility, isIOS,
  isIOSSafari, isSafari, setupSafariTouchHandling
} from "../../utils/SafariCompat";
