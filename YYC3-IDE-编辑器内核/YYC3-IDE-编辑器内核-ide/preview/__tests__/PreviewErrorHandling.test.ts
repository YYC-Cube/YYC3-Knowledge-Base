// @ts-nocheck
/**
 * @file: PreviewErrorHandling.test.ts
 * @description: 预览错误处理增强系统测试套件
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: test,error,console,filter,preview
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PreviewErrorCapturer,
  ErrorType,
  ErrorLevel,
  ErrorSource,
  getPreviewErrorCapturer,
} from '../PreviewErrorCapturer';
import {
  ConsoleManager,
  LogType,
  getConsoleManager,
} from '../ConsoleManager';
import { ErrorFilter } from '../ErrorFilter';

// ── PreviewErrorCapturer 测试 ────────────────────────────────────────

describe('PreviewErrorCapturer', () => {
  let capturer: PreviewErrorCapturer;

  beforeEach(() => {
    capturer = new PreviewErrorCapturer({ maxEntries: 100 });
  });

  afterEach(() => {
    capturer.stop();
    capturer.clearErrors();
  });

  describe('错误捕获', () => {
    it('应该捕获运行时错误', () => {
      capturer.start();
      
      // 触发运行时错误
      const error = new Error('Test runtime error');
      window.onerror!(
        error.message,
        'test.js',
        1,
        1,
        error
      );

      const errors = capturer.getErrors();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].type).toBe(ErrorType.RUNTIME);
      expect(errors[0].message).toContain('Test runtime error');
    });

    it('应该捕获Promise未处理异常', () => {
      capturer.start();
      
      // 触发Promise rejection
      const rejectedPromise = Promise.reject(new Error('Promise rejection'));
      rejectedPromise.catch(() => { /* prevent unhandled rejection */ });

      const event = new PromiseRejectionEvent('unhandledrejection', {
        reason: new Error('Promise rejection'),
        promise: rejectedPromise,
      });
      
      window.onunhandledrejection!(event);

      const errors = capturer.getErrors();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].type).toBe(ErrorType.PROMISE);
    });

    it('应该捕获控制台错误', () => {
      capturer.start();
      
      console.error('Test console error');

      const errors = capturer.getErrors();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].type).toBe(ErrorType.CONSOLE);
      expect(errors[0].message).toContain('Test console error');
    });

    it('应该捕获不同级别的控制台日志', () => {
      capturer.start();
      
      console.error('Error message');
      console.warn('Warn message');
      console.info('Info message');
      console.debug('Debug message');

      const errors = capturer.getErrors();
      expect(errors.length).toBe(4);
      
      const levels = errors.map(e => e.level);
      expect(levels).toContain(ErrorLevel.ERROR);
      expect(levels).toContain(ErrorLevel.WARN);
      expect(levels).toContain(ErrorLevel.INFO);
      expect(levels).toContain(ErrorLevel.DEBUG);
    });

    it('应该分类运行时错误类型', () => {
      capturer.start();
      
      // 语法错误
      window.onerror!(
        'Syntax error',
        'test.js',
        1,
        1,
        new SyntaxError('Unexpected token')
      );

      // 类型错误
      window.onerror!(
        'Type error',
        'test.js',
        2,
        1,
        new TypeError('Cannot read property')
      );

      // 引用错误
      window.onerror!(
        'Reference error',
        'test.js',
        3,
        1,
        new ReferenceError('Variable is not defined')
      );

      const errors = capturer.getErrors();
      expect(errors.some(e => e.type === ErrorType.SYNTAX)).toBe(true);
      expect(errors.some(e => e.type === ErrorType.TYPE)).toBe(true);
      expect(errors.some(e => e.type === ErrorType.REFERENCE)).toBe(true);
    });

    it('应该确定错误来源', () => {
      capturer.start();
      
      // 用户代码
      window.onerror!(
        'User error',
        'file:///app/test.js',
        1,
        1,
        new Error('User error')
      );

      // 外部库
      window.onerror!(
        'Library error',
        'https://cdn.example.com/lib.js',
        1,
        1,
        new Error('Library error')
      );

      const errors = capturer.getErrors();
      expect(errors.some(e => e.source === ErrorSource.USER_CODE)).toBe(true);
      expect(errors.some(e => e.source === ErrorSource.EXTERNAL)).toBe(true);
    });
  });

  describe('错误管理', () => {
    it('应该限制错误数量', () => {
      const smallCapturer = new PreviewErrorCapturer({ maxEntries: 5 });
      smallCapturer.start();

      // 添加超过限制的错误
      for (let i = 0; i < 10; i++) {
        smallCapturer.captureManualError(
          ErrorType.RUNTIME,
          `Error ${i}`,
          ErrorLevel.ERROR
        );
      }

      expect(smallCapturer.getErrorCount()).toBe(5);
      smallCapturer.stop();
    });

    it('应该清空错误', () => {
      capturer.start();
      
      capturer.captureManualError(ErrorType.RUNTIME, 'Error 1', ErrorLevel.ERROR);
      capturer.captureManualError(ErrorType.RUNTIME, 'Error 2', ErrorLevel.ERROR);
      
      expect(capturer.getErrorCount()).toBe(2);
      
      capturer.clearErrors();
      
      expect(capturer.getErrorCount()).toBe(0);
    });

    it('应该导出错误', () => {
      capturer.start();
      
      capturer.captureManualError(ErrorType.RUNTIME, 'Test error', ErrorLevel.ERROR);
      
      const exported = capturer.exportErrors();
      const parsed = JSON.parse(exported);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
      expect(parsed[0].message).toBe('Test error');
    });

    it('应该获取统计信息', () => {
      capturer.start();
      
      capturer.captureManualError(ErrorType.RUNTIME, 'Error 1', ErrorLevel.ERROR);
      capturer.captureManualError(ErrorType.PROMISE, 'Error 2', ErrorLevel.WARN);
      capturer.captureManualError(ErrorType.RUNTIME, 'Error 3', ErrorLevel.ERROR);

      const stats = capturer.getStats();
      
      expect(stats.total).toBe(3);
      expect(stats.byType[ErrorType.RUNTIME]).toBe(2);
      expect(stats.byType[ErrorType.PROMISE]).toBe(1);
      expect(stats.byLevel[ErrorLevel.ERROR]).toBe(2);
      expect(stats.byLevel[ErrorLevel.WARN]).toBe(1);
    });

    it('应该支持错误监听器', () => {
      capturer.start();
      
      const listener = vi.fn();
      const unsubscribe = capturer.addListener(listener);
      
      capturer.captureManualError(ErrorType.RUNTIME, 'Test', ErrorLevel.ERROR);
      
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test',
        })
      );

      unsubscribe();
      
      capturer.captureManualError(ErrorType.RUNTIME, 'Test 2', ErrorLevel.ERROR);
      
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('应该忽略匹配模式的错误', () => {
      const customCapturer = new PreviewErrorCapturer({
        ignorePatterns: [/Extension context invalidated/],
      });
      customCapturer.start();

      customCapturer.captureManualError(
        ErrorType.RUNTIME,
        'Extension context invalidated',
        ErrorLevel.ERROR
      );
      customCapturer.captureManualError(
        ErrorType.RUNTIME,
        'Normal error',
        ErrorLevel.ERROR
      );

      expect(customCapturer.getErrorCount()).toBe(1);
      customCapturer.stop();
    });
  });

  describe('手动错误捕获', () => {
    it('应该手动添加错误', () => {
      capturer.start();
      
      capturer.captureManualError(
        ErrorType.NETWORK,
        'Network failed',
        ErrorLevel.ERROR,
        { url: 'https://api.example.com' }
      );

      const errors = capturer.getErrors();
      expect(errors.length).toBe(1);
      expect(errors[0].type).toBe(ErrorType.NETWORK);
      expect(errors[0].message).toBe('Network failed');
      expect(errors[0].data?.url).toBe('https://api.example.com');
    });
  });
});

// ── ConsoleManager 测试 ────────────────────────────────────────

describe('ConsoleManager', () => {
  let manager: ConsoleManager;

  beforeEach(() => {
    manager = new ConsoleManager({ maxEntries: 100 });
  });

  afterEach(() => {
    manager.clearLogs();
  });

  describe('日志管理', () => {
    it('应该添加日志', () => {
      manager.addLog(LogType.LOG, 'Test message');
      
      const logs = manager.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe('Test message');
      expect(logs[0].type).toBe(LogType.LOG);
    });

    it('应该支持不同类型的日志', () => {
      manager.addLog(LogType.LOG, 'Log');
      manager.addLog(LogType.INFO, 'Info');
      manager.addLog(LogType.WARN, 'Warn');
      manager.addLog(LogType.ERROR, 'Error');
      manager.addLog(LogType.DEBUG, 'Debug');

      const logs = manager.getLogs();
      expect(logs.length).toBe(5);
      
      const types = logs.map(l => l.type);
      expect(types).toContain(LogType.LOG);
      expect(types).toContain(LogType.INFO);
      expect(types).toContain(LogType.WARN);
      expect(types).toContain(LogType.ERROR);
      expect(types).toContain(LogType.DEBUG);
    });

    it('应该限制日志数量', () => {
      const smallManager = new ConsoleManager({ maxEntries: 5 });

      for (let i = 0; i < 10; i++) {
        smallManager.addLog(LogType.LOG, `Message ${i}`);
      }

      expect(smallManager.getLogCount()).toBe(5);
    });

    it('应该清空日志', () => {
      manager.addLog(LogType.LOG, 'Message 1');
      manager.addLog(LogType.LOG, 'Message 2');
      
      expect(manager.getLogCount()).toBe(2);
      
      manager.clearLogs();
      
      expect(manager.getLogCount()).toBe(0);
    });

    it('应该合并重复日志', () => {
      manager.addLog(LogType.LOG, 'Same message');
      manager.addLog(LogType.LOG, 'Same message');
      manager.addLog(LogType.LOG, 'Same message');
      manager.addLog(LogType.LOG, 'Different message');

      const logs = manager.getLogs();
      expect(logs.length).toBe(2);
      expect(logs[0].count).toBe(3);
      expect(logs[1].count).toBeUndefined();
    });

    it('应该格式化复杂对象', () => {
      const obj = { name: 'Test', value: 123 };
      manager.addLog(LogType.LOG, 'Object:', obj);

      const logs = manager.getLogs();
      expect(logs[0].message).toContain('Object:');
      expect(logs[0].message).toContain('Test');
    });
  });

  describe('日志过滤', () => {
    it('应该按级别过滤日志', () => {
      manager.addLog(LogType.ERROR, 'Error');
      manager.addLog(LogType.WARN, 'Warn');
      manager.addLog(LogType.INFO, 'Info');

      const errors = manager.filterByLevel(ErrorLevel.ERROR);
      expect(errors.length).toBe(1);
      expect(errors[0].type).toBe(LogType.ERROR);
    });

    it('应该按类型过滤日志', () => {
      manager.addLog(LogType.LOG, 'Log');
      manager.addLog(LogType.ERROR, 'Error');
      manager.addLog(LogType.LOG, 'Log 2');

      const logs = manager.filterByType(LogType.LOG);
      expect(logs.length).toBe(2);
    });

    it('应该搜索日志', () => {
      manager.addLog(LogType.LOG, 'First message');
      manager.addLog(LogType.LOG, 'Second message');
      manager.addLog(LogType.LOG, 'Third test');

      const results = manager.search('test');
      expect(results.length).toBe(1);
      expect(results[0].message).toBe('Third test');
    });
  });

  describe('日志导出', () => {
    it('应该导出JSON格式', () => {
      manager.addLog(LogType.LOG, 'Test');
      
      const json = manager.exportJSON();
      const parsed = JSON.parse(json);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
    });

    it('应该导出文本格式', () => {
      manager.addLog(LogType.ERROR, 'Error message');
      manager.addLog(LogType.WARN, 'Warn message');
      
      const text = manager.exportText();
      
      expect(text).toContain('ERROR');
      expect(text).toContain('Error message');
      expect(text).toContain('WARN');
      expect(text).toContain('Warn message');
    });

    it('应该导出HTML格式', () => {
      manager.addLog(LogType.ERROR, 'Error');
      manager.addLog(LogType.INFO, 'Info');
      
      const html = manager.exportHTML();
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Error');
      expect(html).toContain('Info');
    });
  });

  describe('日志统计', () => {
    it('应该获取统计信息', () => {
      manager.addLog(LogType.ERROR, 'Error 1');
      manager.addLog(LogType.ERROR, 'Error 2');
      manager.addLog(LogType.WARN, 'Warn');

      const stats = manager.getStats();
      
      expect(stats.total).toBe(3);
      expect(stats.byLevel[ErrorLevel.ERROR]).toBe(2);
      expect(stats.byLevel[ErrorLevel.WARN]).toBe(1);
    });
  });

  describe('日志监听', () => {
    it('应该支持日志监听器', () => {
      const listener = vi.fn();
      const unsubscribe = manager.addListener(listener);
      
      manager.addLog(LogType.LOG, 'Test');
      
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test',
        })
      );

      unsubscribe();
      
      manager.addLog(LogType.LOG, 'Test 2');
      
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});

// ── ErrorFilter 测试 ────────────────────────────────────────

describe('ErrorFilter', () => {
  let errors: any[];

  beforeEach(() => {
    errors = [
      {
        id: '1',
        type: ErrorType.RUNTIME,
        level: ErrorLevel.ERROR,
        source: ErrorSource.USER_CODE,
        message: 'Runtime error in app.js',
        timestamp: Date.now() - 3000,
        filename: 'app.js',
        lineno: 10,
        colno: 5,
      },
      {
        id: '2',
        type: ErrorType.PROMISE,
        level: ErrorLevel.WARN,
        source: ErrorSource.USER_CODE,
        message: 'Promise rejection',
        timestamp: Date.now() - 2000,
        filename: 'async.js',
        lineno: 20,
        colno: 10,
      },
      {
        id: '3',
        type: ErrorType.NETWORK,
        level: ErrorLevel.ERROR,
        source: ErrorSource.EXTERNAL,
        message: 'Network timeout',
        timestamp: Date.now() - 1000,
        filename: undefined,
      },
      {
        id: '4',
        type: ErrorType.RESOURCE,
        level: ErrorLevel.WARN,
        source: ErrorSource.EXTERNAL,
        message: 'Failed to load image',
        timestamp: Date.now(),
        filename: undefined,
      },
    ];
  });

  describe('过滤功能', () => {
    it('应该按类型过滤', () => {
      const filtered = ErrorFilter.filter(errors, {
        types: [ErrorType.RUNTIME, ErrorType.PROMISE],
      });
      
      expect(filtered.length).toBe(2);
      expect(filtered.every(e => 
        e.type === ErrorType.RUNTIME || e.type === ErrorType.PROMISE
      )).toBe(true);
    });

    it('应该按级别过滤', () => {
      const filtered = ErrorFilter.filter(errors, {
        levels: [ErrorLevel.ERROR],
      });
      
      expect(filtered.length).toBe(2);
      expect(filtered.every(e => e.level === ErrorLevel.ERROR)).toBe(true);
    });

    it('应该按来源过滤', () => {
      const filtered = ErrorFilter.filter(errors, {
        sources: [ErrorSource.USER_CODE],
      });
      
      expect(filtered.length).toBe(2);
      expect(filtered.every(e => e.source === ErrorSource.USER_CODE)).toBe(true);
    });

    it('应该按关键词搜索', () => {
      const filtered = ErrorFilter.filter(errors, {
        keyword: 'timeout',
      });
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].message).toContain('timeout');
    });

    it('应该按时间范围过滤', () => {
      const now = Date.now();
      const filtered = ErrorFilter.filter(errors, {
        startTime: now - 2500,
        endTime: now - 500,
      });
      
      expect(filtered.length).toBe(2);
    });

    it('应该按文件名过滤', () => {
      const filtered = ErrorFilter.filter(errors, {
        filename: 'app.js',
      });
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].filename).toBe('app.js');
    });

    it('应该排除特定类型', () => {
      const filtered = ErrorFilter.filter(errors, {
        excludeTypes: [ErrorType.RESOURCE],
      });
      
      expect(filtered.length).toBe(3);
      expect(filtered.some(e => e.type === ErrorType.RESOURCE)).toBe(false);
    });

    it('应该排除特定级别', () => {
      const filtered = ErrorFilter.filter(errors, {
        excludeLevels: [ErrorLevel.WARN],
      });
      
      expect(filtered.length).toBe(2);
      expect(filtered.every(e => e.level !== ErrorLevel.WARN)).toBe(true);
    });

    it('应该组合多个过滤条件', () => {
      const filtered = ErrorFilter.filter(errors, {
        levels: [ErrorLevel.ERROR],
        sources: [ErrorSource.USER_CODE],
      });
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('1');
    });
  });

  describe('搜索功能', () => {
    it('应该搜索错误消息', () => {
      const results = ErrorFilter.search(errors, 'runtime');
      expect(results.length).toBe(1);
      expect(results[0].message).toContain('Runtime');
    });

    it('应该搜索堆栈信息', () => {
      const errorsWithStack = [
        ...errors,
        {
          id: '5',
          type: ErrorType.RUNTIME,
          level: ErrorLevel.ERROR,
          source: ErrorSource.USER_CODE,
          message: 'Stack error',
          timestamp: Date.now(),
          stack: 'Error at line 30 in test.js',
        },
      ];

      const results = ErrorFilter.search(errorsWithStack, 'line 30');
      expect(results.length).toBe(1);
    });
  });

  describe('分组功能', () => {
    it('应该按类型分组', () => {
      const groups = ErrorFilter.group(errors, {
        groupBy: 'type',
        sortBy: 'count',
        sortOrder: 'desc',
      });
      
      expect(groups.length).toBeGreaterThan(0);
      expect(groups[0].key).toBeDefined();
      expect(groups[0].count).toBeGreaterThan(0);
    });

    it('应该按级别分组', () => {
      const groups = ErrorFilter.group(errors, {
        groupBy: 'level',
        sortBy: 'count',
        sortOrder: 'desc',
      });
      
      expect(groups.length).toBeGreaterThan(0);
    });

    it('应该按来源分组', () => {
      const groups = ErrorFilter.group(errors, {
        groupBy: 'source',
        sortBy: 'count',
        sortOrder: 'desc',
      });
      
      expect(groups.length).toBeGreaterThan(0);
    });

    it('应该按文件名分组', () => {
      const groups = ErrorFilter.group(errors, {
        groupBy: 'filename',
        sortBy: 'count',
        sortOrder: 'desc',
      });
      
      expect(groups.length).toBeGreaterThan(0);
    });
  });

  describe('统计功能', () => {
    it('应该获取完整统计信息', () => {
      const stats = ErrorFilter.getStatistics(errors);
      
      expect(stats.total).toBe(4);
      expect(stats.byType[ErrorType.RUNTIME]).toBe(1);
      expect(stats.byLevel[ErrorLevel.ERROR]).toBe(2);
      expect(stats.bySource[ErrorSource.USER_CODE]).toBe(2);
      expect(stats.topFilenames.length).toBeGreaterThan(0);
      expect(stats.topMessages.length).toBeGreaterThan(0);
    });
  });

  describe('其他功能', () => {
    it('应该去重错误', () => {
      const duplicateErrors = [
        ...errors,
        errors[0], // 重复
        errors[1], // 重复
      ];

      const deduplicated = ErrorFilter.deduplicate(duplicateErrors);
      expect(deduplicated.length).toBe(4);
    });

    it('应该排序错误', () => {
      const sorted = ErrorFilter.sort(errors, 'timestamp', 'desc');
      expect(sorted[0].timestamp).toBeGreaterThanOrEqual(sorted[1].timestamp);
    });

    it('应该分页错误', () => {
      const page1 = ErrorFilter.paginate(errors, 1, 2);
      expect(page1.data.length).toBe(2);
      expect(page1.total).toBe(4);
      expect(page1.totalPages).toBe(2);

      const page2 = ErrorFilter.paginate(errors, 2, 2);
      expect(page2.data.length).toBe(2);
    });

    it('应该导出JSON格式', () => {
      const exported = ErrorFilter.exportFiltered(errors, 'json');
      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('应该导出CSV格式', () => {
      const exported = ErrorFilter.exportFiltered(errors, 'csv');
      expect(exported).toContain('ID');
      expect(exported).toContain('Type');
      expect(exported).toContain('Message');
    });

    it('应该导出Markdown格式', () => {
      const exported = ErrorFilter.exportFiltered(errors, 'markdown');
      expect(exported).toContain('# Error Report');
      expect(exported).toContain('Total Errors');
    });
  });
});

// ── 集成测试 ────────────────────────────────────────

describe('预览错误处理集成测试', () => {
  it('应该完整处理错误流程', () => {
    const capturer = new PreviewErrorCapturer();
    const consoleManager = new ConsoleManager();
    
    capturer.start();

    // 添加错误
    capturer.captureManualError(ErrorType.RUNTIME, 'Runtime error', ErrorLevel.ERROR);
    capturer.captureManualError(ErrorType.PROMISE, 'Promise error', ErrorLevel.WARN);

    // 添加日志
    consoleManager.addLog(LogType.ERROR, 'Console error');
    consoleManager.addLog(LogType.WARN, 'Console warning');

    // 过滤错误
    const errors = capturer.getErrors();
    const filtered = ErrorFilter.filter(errors, {
      levels: [ErrorLevel.ERROR],
    });

    expect(filtered.length).toBe(1);
    expect(filtered[0].type).toBe(ErrorType.RUNTIME);

    // 导出
    const stats = capturer.getStats();
    expect(stats.total).toBe(2);

    capturer.stop();
  });

  it('应该支持单例模式', () => {
    const instance1 = getPreviewErrorCapturer();
    const instance2 = getPreviewErrorCapturer();
    
    expect(instance1).toBe(instance2);
  });
});
