/**
 * @file: constants/storage-migration.ts
 * @description: 存储键迁移辅助 — 标准化 yyc3_ 前缀，提供兼容层和迁移工具
 *              解决 yyc3- (连字符) 与 yyc3_ (下划线) 混用问题
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.0.0
 * @created: 2026-06-04
 * @updated: 2026-06-04
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: storage,keys,migration,normalization,encapsulation
 */

// ================================================================
// 存储键迁移辅助 — 标准化存储键前缀为 yyc3_
// ================================================================
//
// 问题：现有键混用 yyc3- (遗留) 与 yyc3_ (新标准)
//   遗留键：yyc3-theme, yyc3-provider-api-keys, yyc3-model-store
//   标准键：yyc3_custom_themes, yyc3_proxy_config, yyc3_panel_layout
//
// 迁移策略：
//   1. 读取时兼容两种前缀 (getItem)
//   2. 写入时统一使用标准前缀 (setItem)
//   3. 提供一键迁移函数 (migrateAll)
// ================================================================

/** 键名映射表 — 遗留键 → 标准键 */
export const LEGACY_TO_STANDARD: Record<string, string> = {
  // 主题
  "yyc3-theme": "yyc3_theme",
  // Provider/API
  "yyc3-provider-api-keys": "yyc3_provider_api_keys",
  "yyc3-provider-urls": "yyc3_provider_urls",
  "yyc3-custom-providers": "yyc3_custom_providers",
  "yyc3-mcp-servers": "yyc3_mcp_servers",
  // Zustand persist
  "yyc3-model-store": "yyc3_model_store_legacy",
  "yyc3-proxy-store": "yyc3_proxy_store_legacy",
};

/** 标准化键名 — 统一为 yyc3_ 前缀 + 下划线分隔 */
export function normalizeKey(key: string): string {
  // 如果已经是标准格式，直接返回
  if (key.startsWith("yyc3_") && !key.includes("-")) {
    return key;
  }
  // 查映射表
  if (LEGACY_TO_STANDARD[key]) {
    return LEGACY_TO_STANDARD[key];
  }
  // 自动转换：yyc3-xxx-yyy → yyc3_xxx_yyy
  return key.replace(/^yyc3-/, "yyc3_").replace(/-/g, "_");
}

/** 安全读取 — 先查标准键，再查遗留键 */
export function getStorageItem(key: string): string | null {
  const standardKey = normalizeKey(key);
  // 优先标准键
  const value = localStorage.getItem(standardKey);
  if (value !== null) return value;
  // 回退遗留键
  if (standardKey !== key) {
    return localStorage.getItem(key);
  }
  return null;
}

/** 统一写入 — 总是写入标准键 */
export function setStorageItem(key: string, value: string): void {
  const standardKey = normalizeKey(key);
  localStorage.setItem(standardKey, value);
}

/** 读取 JSON */
export function getStorageJSON<T>(key: string, fallback: T): T {
  const raw = getStorageItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** 写入 JSON */
export function setStorageJSON(key: string, value: unknown): void {
  setStorageItem(key, JSON.stringify(value));
}

/** 删除 — 同时删除标准键和遗留键 */
export function removeStorageItem(key: string): void {
  const standardKey = normalizeKey(key);
  localStorage.removeItem(standardKey);
  if (standardKey !== key) {
    localStorage.removeItem(key);
  }
}

/** 一键迁移所有遗留键到标准键 */
export function migrateAllLegacyKeys(): { migrated: string[]; skipped: string[] } {
  const migrated: string[] = [];
  const skipped: string[] = [];

  for (const [legacyKey, standardKey] of Object.entries(LEGACY_TO_STANDARD)) {
    try {
      const value = localStorage.getItem(legacyKey);
      if (value !== null) {
        // 如果标准键已有值，不覆盖
        if (localStorage.getItem(standardKey) !== null) {
          skipped.push(`${legacyKey} → ${standardKey} (already exists, kept legacy)`);
          continue;
        }
        localStorage.setItem(standardKey, value);
        // 不删除遗留键，保留兼容
        migrated.push(`${legacyKey} → ${standardKey}`);
      }
    } catch {
      skipped.push(`${legacyKey} → ${standardKey} (error)`);
    }
  }

  return { migrated, skipped };
}

/** 检查是否存在未迁移的遗留键 */
export function getLegacyKeys(): string[] {
  const legacyKeys: string[] = [];
  for (const legacyKey of Object.keys(LEGACY_TO_STANDARD)) {
    if (localStorage.getItem(legacyKey) !== null) {
      legacyKeys.push(legacyKey);
    }
  }
  return legacyKeys;
}
