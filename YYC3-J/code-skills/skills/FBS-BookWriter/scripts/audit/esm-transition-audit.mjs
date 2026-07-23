/**
 * U12: 状态转换审计日志 (P1)
 * 
 * 功能:
 * - 记录每个ESM转换
 * - 触发条件、检查结果、执行动作
 * - 可追溯性
 */

import fs from 'fs';
import path from 'path';
import EventEmitter from 'events';

/**
 * ESM状态转换审计器
 */
export class ESMTransitionAuditor extends EventEmitter {
  constructor(bookRoot) {
    super();
    
    this.bookRoot = bookRoot;
    this.auditLogPath = path.join(bookRoot, '.fbs', 'esm-transition-audit.jsonl');
    this.auditIndex = 0;
    this.sessionId = this.generateSessionId();
    
    console.log(`📝 [U12-P1] ESM状态转换审计器初始化完成`);
    console.log(`   Session ID: ${this.sessionId}`);
  }

  /**
   * 生成Session ID
   * @returns {string}
   */
  generateSessionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `session_${timestamp}_${random}`;
  }

  /**
   * 记录状态转换
   * @param {string} from - 起始状态
   * @param {string} to - 目标状态
   * @param {Object} details - 转换详情
   * @returns {Promise<void>}
   */
  async logTransition(from, to, details = {}) {
    this.auditIndex++;
    
    const entry = {
      auditId: `${this.sessionId}_${this.auditIndex}`,
      sessionId: this.sessionId,
      auditIndex: this.auditIndex,
      timestamp: Date.now(),
      isoTimestamp: new Date().toISOString(),
      transition: {
        from,
        to
      },
      trigger: details.trigger || 'manual',
      triggerCondition: details.triggerCondition || null,
      checks: details.checks || [],
      actions: details.actions || [],
      duration: details.duration || 0,
      result: details.result || 'success',
      error: details.error || null,
      metadata: details.metadata || {}
    };
    
    // 写入审计日志
    await this.appendLog(entry);
    
    // 触发事件
    this.emit('transition', entry);
    
    console.log(`📝 [U12-P1] 记录状态转换: ${from} → ${to}`);
  }

  /**
   * 追加审计日志
   * @param {Object} entry - 审计条目
   * @returns {Promise<void>}
   */
  async appendLog(entry) {
    const logLine = JSON.stringify(entry) + '\n';
    fs.appendFileSync(this.auditLogPath, logLine, 'utf-8');
  }

  /**
   * 读取审计日志
   * @param {number} limit - 限制数量
   * @returns {Promise<Array>}
   */
  async readAuditLog(limit = 100) {
    if (!fs.existsSync(this.auditLogPath)) {
      return [];
    }
    
    const content = fs.readFileSync(this.auditLogPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    const entries = lines.slice(-limit).map(line => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return null;
      }
    }).filter(entry => entry !== null);
    
    return entries;
  }

  /**
   * 生成审计报告
   * @returns {Promise<Object>}
   */
  async generateAuditReport() {
    const entries = await this.readAuditLog();
    
    // 统计状态转换
    const transitionStats = {};
    for (const entry of entries) {
      const key = `${entry.transition.from} → ${entry.transition.to}`;
      if (!transitionStats[key]) {
        transitionStats[key] = 0;
      }
      transitionStats[key]++;
    }
    
    // 统计结果
    const resultStats = {
      success: 0,
      failed: 0,
      error: 0
    };
    
    for (const entry of entries) {
      if (resultStats[entry.result] !== undefined) {
        resultStats[entry.result]++;
      }
    }
    
    // 统计Session
    const sessionCount = new Set(entries.map(e => e.sessionId)).size;
    
    const report = {
      version: 'U12-P1-v1.0',
      generatedAt: new Date().toISOString(),
      summary: {
        totalTransitions: entries.length,
        sessionCount,
        transitionTypes: Object.keys(transitionStats).length,
        resultStats
      },
      transitionStats,
      recentTransitions: entries.slice(-10)
    };
    
    return report;
  }

  /**
   * 清理审计日志
   * @param {number} keepDays - 保留天数
   * @returns {Promise<number>}
   */
  async cleanupAuditLog(keepDays = 30) {
    const entries = await this.readAuditLog();
    const cutoffTime = Date.now() - (keepDays * 24 * 60 * 60 * 1000);
    
    const filteredEntries = entries.filter(e => e.timestamp >= cutoffTime);
    
    // 重写审计日志
    const newContent = filteredEntries.map(e => JSON.stringify(e)).join('\n') + '\n';
    fs.writeFileSync(this.auditLogPath, newContent, 'utf-8');
    
    const removedCount = entries.length - filteredEntries.length;
    console.log(`🧹 [U12-P1] 清理审计日志: 移除 ${removedCount} 条记录`);
    
    return removedCount;
  }

  /**
   * 查询审计日志
   * @param {Object} query - 查询条件
   * @returns {Promise<Array>}
   */
  async queryAuditLog(query) {
    const entries = await this.readAuditLog();
    
    return entries.filter(entry => {
      // 状态转换查询
      if (query.from && entry.transition.from !== query.from) {
        return false;
      }
      if (query.to && entry.transition.to !== query.to) {
        return false;
      }
      
      // 结果查询
      if (query.result && entry.result !== query.result) {
        return false;
      }
      
      // 时间范围查询
      if (query.startTime && entry.timestamp < query.startTime) {
        return false;
      }
      if (query.endTime && entry.timestamp > query.endTime) {
        return false;
      }
      
      // Session查询
      if (query.sessionId && entry.sessionId !== query.sessionId) {
        return false;
      }
      
      return true;
    });
  }
}

export default ESMTransitionAuditor;
