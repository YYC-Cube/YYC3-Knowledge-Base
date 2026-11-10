/**
 * @file: generateId.ts
 * @description: 生成唯一ID的工具函数
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: utils,id,unique
 */

/**
 * 生成唯一ID
 * @param prefix ID前缀
 * @returns 唯一ID字符串
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  const counter = (generateId as any)._counter = ((generateId as any)._counter || 0) + 1;

  return prefix ? `${prefix}_${timestamp}_${random}_${counter}` : `${timestamp}_${random}_${counter}`;
}

/**
 * 生成UUID v4格式
 * @returns UUID字符串
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 生成短ID（8位）
 * @returns 短ID字符串
 */
export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 10);
}
