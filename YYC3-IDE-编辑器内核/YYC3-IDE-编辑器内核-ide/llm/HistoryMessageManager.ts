/**
 * @file: llm/HistoryMessageManager.ts
 * @description: 历史消息管理 - 存储、限制、检索
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: llm,message,history,management
 */

/**
 * 消息接口
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  sessionId: string;
  tokenCount: number;
  metadata?: Record<string, any>;
}

/**
 * 会话接口
 */
export interface Session {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  totalTokens: number;
}

/**
 * 搜索条件
 */
export interface SearchCriteria {
  keyword?: string;
  sessionId?: string;
  startTime?: number;
  endTime?: number;
  role?: 'user' | 'assistant' | 'system';
}

/**
 * 管理配置
 */
export interface MessageManagerConfig {
  maxMessages: number;
  maxTokens: number;
  maxSessions: number;
  autoCleanup: boolean;
  cleanupInterval: number; // 小时
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: MessageManagerConfig = {
  maxMessages: 50,
  maxTokens: 8000,
  maxSessions: 100,
  autoCleanup: true,
  cleanupInterval: 24,
};

/**
 * 历史消息管理器
 */
export class HistoryMessageManager {
  private messages: Map<string, Message> = new Map();
  private sessions: Map<string, Session> = new Map();
  private config: MessageManagerConfig;

  constructor(config: Partial<MessageManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.autoCleanup) {
      this.scheduleCleanup();
    }
  }

  /**
   * 保存消息
   */
  saveMessage(message: Omit<Message, 'id' | 'timestamp' | 'tokenCount'>): Message {
    const id = this.generateId();
    const timestamp = Date.now();
    const tokenCount = this.estimateTokens(message.content);

    const fullMessage: Message = {
      ...message,
      id,
      timestamp,
      tokenCount,
    };

    this.messages.set(id, fullMessage);
    this.updateSession(message.sessionId);

    // 自动清理
    if (this.messages.size > this.config.maxMessages) {
      this.cleanupMessages();
    }

    return fullMessage;
  }

  /**
   * 获取消息
   */
  getMessage(id: string): Message | undefined {
    return this.messages.get(id);
  }

  /**
   * 获取会话消息
   */
  getSessionMessages(sessionId: string): Message[] {
    return Array.from(this.messages.values())
      .filter(msg => msg.sessionId === sessionId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 限制消息
   */
  limitMessages(sessionId?: string): Message[] {
    const messages = sessionId
      ? this.getSessionMessages(sessionId)
      : Array.from(this.messages.values()).sort((a, b) => a.timestamp - b.timestamp);

    // Token限制
    let totalTokens = 0;
    const limited: Message[] = [];

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (totalTokens + msg.tokenCount <= this.config.maxTokens) {
        limited.unshift(msg);
        totalTokens += msg.tokenCount;
      } else {
        break;
      }
    }

    // 数量限制
    return limited.slice(-this.config.maxMessages);
  }

  /**
   * 搜索消息
   */
  searchMessages(criteria: SearchCriteria): Message[] {
    let results = Array.from(this.messages.values());

    if (criteria.keyword) {
      const keyword = criteria.keyword.toLowerCase();
      results = results.filter(msg =>
        msg.content.toLowerCase().includes(keyword)
      );
    }

    if (criteria.sessionId) {
      results = results.filter(msg => msg.sessionId === criteria.sessionId);
    }

    if (criteria.startTime) {
      results = results.filter(msg => msg.timestamp >= (criteria.startTime as any));
    }

    if (criteria.endTime) {
      results = results.filter(msg => msg.timestamp <= (criteria.endTime as any));
    }

    if (criteria.role) {
      results = results.filter(msg => msg.role === criteria.role);
    }

    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 删除消息
   */
  deleteMessage(id: string): boolean {
    return this.messages.delete(id);
  }

  /**
   * 清空会话消息
   */
  clearSession(sessionId: string): number {
    let count = 0;
    for (const [id, msg] of this.messages.entries()) {
      if (msg.sessionId === sessionId) {
        this.messages.delete(id);
        count++;
      }
    }
    return count;
  }

  /**
   * 获取统计信息
   */
  getStatistics(): {
    totalMessages: number;
    totalTokens: number;
    sessionCount: number;
    avgTokensPerMessage: number;
  } {
    const totalMessages = this.messages.size;
    const totalTokens = Array.from(this.messages.values())
      .reduce((sum, msg) => sum + msg.tokenCount, 0);

    return {
      totalMessages,
      totalTokens,
      sessionCount: this.sessions.size,
      avgTokensPerMessage: totalMessages > 0 ? Math.round(totalTokens / totalMessages) : 0,
    };
  }

  /**
   * 导出消息
   */
  exportMessages(sessionId?: string): Message[] {
    return sessionId
      ? this.getSessionMessages(sessionId)
      : Array.from(this.messages.values());
  }

  /**
   * 更新会话
   */
  private updateSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    const messages = this.getSessionMessages(sessionId);

    if (session) {
      session.updatedAt = Date.now();
      session.messageCount = messages.length;
      session.totalTokens = messages.reduce((sum, msg) => sum + msg.tokenCount, 0);
    } else {
      this.sessions.set(sessionId, {
        id: sessionId,
        title: `会话 ${this.sessions.size + 1}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: messages.length,
        totalTokens: messages.reduce((sum, msg) => sum + msg.tokenCount, 0),
      });
    }
  }

  /**
   * 清理消息
   */
  private cleanupMessages(): void {
    const messages = Array.from(this.messages.values())
      .sort((a, b) => b.timestamp - a.timestamp);

    const _toKeep = messages.slice(0, this.config.maxMessages);
    const toDelete = messages.slice(this.config.maxMessages);

    for (const msg of toDelete) {
      this.messages.delete(msg.id);
    }
  }

  /**
   * 安排清理
   */
  private scheduleCleanup(): void {
    setInterval(() => {
      this.cleanupOldMessages();
    }, this.config.cleanupInterval * 60 * 60 * 1000);
  }

  /**
   * 清理旧消息
   */
  private cleanupOldMessages(): void {
    const cutoffTime = Date.now() - (this.config.cleanupInterval * 60 * 60 * 1000);

    for (const [id, msg] of this.messages.entries()) {
      if (msg.timestamp < cutoffTime) {
        this.messages.delete(id);
      }
    }
  }

  /**
   * 生成ID
   */
  private generateId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 估算Token数
   */
  private estimateTokens(content: string): number {
    // 简化的Token估算：英文按单词，中文按字符
    const englishWords = (content.match(/[a-zA-Z]+/g) || []).length;
    const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherChars = content.length - englishWords - chineseChars;

    return Math.ceil(englishWords * 1.3 + chineseChars * 0.5 + otherChars * 0.3);
  }
}
