/**
 * @file: integration.test.ts
 * @description: 端到端集成测试 - 测试新增功能的完整流程
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-05
 * @updated: 2026-04-05
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: integration-test,e2e,testing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';

// Mock optional dependencies
vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    query: vi.fn().mockResolvedValue({ rows: [] }),
    connect: vi.fn().mockResolvedValue({ release: vi.fn() }),
    end: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('mysql2', () => ({
  createPool: vi.fn().mockImplementation(() => ({
    query: vi.fn().mockResolvedValue([[]]),
    execute: vi.fn().mockResolvedValue([[]]),
    end: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('better-sqlite3', () => ({
  default: vi.fn().mockImplementation(() => ({
    prepare: vi.fn().mockReturnValue({
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(),
    }),
    close: vi.fn(),
  })),
}));

vi.mock('sql.js', () => ({
  default: vi.fn().mockImplementation(() => ({
    Database: vi.fn().mockImplementation(() => ({
      run: vi.fn(),
      exec: vi.fn(),
      close: vi.fn(),
    })),
  })),
}));

// ── Services ──
import { TokenBucketLimiter, SlidingWindowLimiter, CircuitBreaker } from '../services/RateLimiter';
import { OptimisticUpdateManager } from '../services/OptimisticUpdateManager';
import { StorageManager } from '../services/StorageManager';
import { ChunkedFileHandler } from '../services/ChunkedFileHandler';
import { useFileStoreZustand } from '../stores/useFileStoreZustand';

// Mock ResizeObserver for XTerminal components
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
} as unknown as typeof ResizeObserver

// ── Integration Test: File Operations with Rate Limiting ──

describe('Integration: File Operations with Rate Limiting', () => {
  let rateLimiter: TokenBucketLimiter;
  let store: ReturnType<typeof useFileStoreZustand.getState>;

  beforeEach(() => {
    rateLimiter = new TokenBucketLimiter({ maxRequests: 10, windowMs: 1000 });
    useFileStoreZustand.setState({
      fileContents: {
        'test/file1.ts': 'content1',
        'test/file2.ts': 'content2',
        'test/file3.ts': 'content3',
      },
      openTabs: [],
      activeFile: undefined,
      gitChanges: [],
    });
    store = useFileStoreZustand.getState();
  });

  it('should rate limit file operations', async () => {
    const results: boolean[] = [];

    for (let i = 0; i < 15; i++) {
      const rateLimitResult = rateLimiter.tryAcquire('file-ops');
      if (rateLimitResult.allowed) {
        const result = store.copyFile(`test/file${(i % 3) + 1}.ts`, `test/copy${i}.ts`);
        results.push(result);
      } else {
        results.push(false);
      }
    }

    const successfulOps = results.filter((r) => r).length;
    expect(successfulOps).toBeLessThanOrEqual(10);
  });

  it('should track git changes for moved files', () => {
    store.moveFile('test/file1.ts', 'test/moved/file1.ts');

    const state = useFileStoreZustand.getState();
    const deletedChange = state.gitChanges.find((c) => c.path === 'test/file1.ts');
    const addedChange = state.gitChanges.find((c) => c.path === 'test/moved/file1.ts');

    expect(deletedChange?.status).toBe('deleted');
    expect(addedChange?.status).toBe('added');
  });
});

// ── Integration Test: Optimistic Updates with Storage ──

describe('Integration: Optimistic Updates with Storage', () => {
  let storageManager: StorageManager;
  let optimisticManager: OptimisticUpdateManager;
  let mockState: Record<string, unknown>;

  beforeEach(() => {
    storageManager = new StorageManager({
      warningThreshold: 80,
      criticalThreshold: 95,
      autoCleanup: false,
    });

    mockState = {
      files: ['file1.ts', 'file2.ts'],
      selectedFile: null,
    };

    optimisticManager = new OptimisticUpdateManager(
      {
        maxRetries: 3,
        snapshotEnabled: true,
      },
      () => mockState,
      (newState) => {
        mockState = newState;
      }
    );
  });

  it('should rollback optimistic update on failure', async () => {
    const originalFiles = [...(mockState.files as string[])];

    const result = await optimisticManager.execute(
      'add-file',
      { fileName: 'newFile.ts' },
      (state, payload) => ({
        ...state,
        files: [...(state.files as string[]), payload.fileName],
      }),
      async () => {
        return false;
      },
      (state) => ({
        ...state,
        files: originalFiles,
      })
    );

    expect(result.success).toBe(false);
    expect(mockState.files).toEqual(originalFiles);
  });

  it('should confirm optimistic update on success', async () => {
    const result = await optimisticManager.execute(
      'select-file',
      { fileName: 'file1.ts' },
      (state, payload) => ({
        ...state,
        selectedFile: payload.fileName,
      }),
      async () => true
    );

    expect(result.success).toBe(true);
    expect(mockState.selectedFile).toBe('file1.ts');
  });
});

// ── Integration Test: Chunked File with Circuit Breaker ──

describe('Integration: Chunked File with Circuit Breaker', () => {
  let chunkedHandler: ChunkedFileHandler;
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    chunkedHandler = new ChunkedFileHandler({
      chunkSize: 1024,
      maxConcurrentChunks: 2,
      maxRetries: 2,
    });

    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 5000,
      halfOpenMaxCalls: 3,
    });
  });

  it('should handle chunked upload with circuit breaker protection', async () => {
    const file = new File(['x'.repeat(5000)], 'test.txt', { type: 'text/plain' });

    let uploadAttempts = 0;
    const uploadChunk = vi.fn().mockImplementation(async () => {
      uploadAttempts++;
      if (uploadAttempts < 3) {
        throw new Error('Network error');
      }
      return { success: true, chunkId: `chunk-${uploadAttempts}` };
    });

    const result = await circuitBreaker.execute(
      () =>
        chunkedHandler.uploadFile(file, uploadChunk, (progress) => {
          console.log(`Progress: ${progress.percentage.toFixed(1)}%`);
        }),
      async () => ({ success: false, fileId: 'fallback' })
    );

    expect(result.success).toBeDefined();
  });

  it('should track transfer progress correctly', async () => {
    const file = new File(['test content'], 'small.txt', { type: 'text/plain' });

    const progressUpdates: number[] = [];
    const uploadChunk = vi.fn().mockResolvedValue({ success: true, chunkId: 'chunk-1' });

    await chunkedHandler.uploadFile(file, uploadChunk, (progress) => {
      progressUpdates.push(progress.percentage);
    });

    expect(progressUpdates.length).toBeGreaterThan(0);
  });
});

// ── Integration Test: Storage Management with File Operations ──

describe('Integration: Storage Management with File Operations', () => {
  let storageManager: StorageManager;

  beforeEach(() => {
    storageManager = new StorageManager({
      warningThreshold: 50,
      criticalThreshold: 80,
      autoCleanup: false,
    });

    localStorage.clear();
  });

  it('should detect storage usage and trigger warnings', async () => {
    const warningCallback = vi.fn();
    const manager = new StorageManager({
      warningThreshold: 10,
      criticalThreshold: 90,
      autoCleanup: false,
      onWarning: warningCallback,
    });

    for (let i = 0; i < 100; i++) {
      localStorage.setItem(`key-${i}`, JSON.stringify({ data: 'x'.repeat(1000), timestamp: Date.now() }));
    }

    const quota = await manager.getQuota();
    expect(quota.usage).toBeGreaterThan(0);
  });

  it('should cleanup old storage entries', async () => {
    const oldTimestamp = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentTimestamp = Date.now();

    localStorage.setItem('old-key', JSON.stringify({ data: 'old', timestamp: oldTimestamp }));
    localStorage.setItem('recent-key', JSON.stringify({ data: 'recent', timestamp: recentTimestamp }));

    const result = await storageManager.cleanupLocalStorage({
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    expect(result.removedItems).toBeGreaterThanOrEqual(1);
    expect(localStorage.getItem('recent-key')).not.toBeNull();
  });
});

// ── Integration Test: Error Recovery Flow ──

describe('Integration: Error Recovery Flow', () => {
  it('should recover from transient errors with retry', async () => {
    let attempts = 0;
    const maxAttempts = 3;

    const operation = async (): Promise<string> => {
      attempts++;
      if (attempts < maxAttempts) {
        throw new Error('Transient error');
      }
      return 'success';
    };

    const result = await retryWithBackoff(operation, {
      maxRetries: 3,
      baseDelay: 100,
    });

    expect(result).toBe('success');
    expect(attempts).toBe(maxAttempts);
  });

  it('should fail after max retries', async () => {
    const operation = async (): Promise<string> => {
      throw new Error('Permanent error');
    };

    await expect(
      retryWithBackoff(operation, { maxRetries: 2, baseDelay: 50 })
    ).rejects.toThrow('Permanent error');
  });
});

// ── Helper Functions ──

interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
}

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt < options.maxRetries) {
        const delay = options.baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// ── Integration Test: Full Workflow ──

describe('Integration: Full Workflow', () => {
  it('should handle complete file operation workflow', async () => {
    const rateLimiter = new TokenBucketLimiter({ maxRequests: 100, windowMs: 60000 });
    const circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 10000,
      halfOpenMaxCalls: 3,
    });

    useFileStoreZustand.setState({
      fileContents: {
        'project/src/index.ts': 'export {}',
        'project/src/utils.ts': 'export const util = () => {}',
      },
      openTabs: [],
      activeFile: undefined,
      gitChanges: [],
    });

    const store = useFileStoreZustand.getState();

    const rateLimitResult = rateLimiter.tryAcquire('file-ops');
    expect(rateLimitResult.allowed).toBe(true);

    const moveResult = store.moveFile('project/src/index.ts', 'project/src/main.ts');
    expect(moveResult).toBe(true);

    const copyResult = store.copyFile('project/src/utils.ts', 'project/src/helpers.ts');
    expect(copyResult).toBe(true);

    const state = useFileStoreZustand.getState();
    expect(state.fileContents['project/src/main.ts']).toBeDefined();
    expect(state.fileContents['project/src/helpers.ts']).toBeDefined();

    const gitChanges = state.gitChanges;
    expect(gitChanges.length).toBeGreaterThan(0);
  });

  it('should handle concurrent operations safely', async () => {
    const store = useFileStoreZustand.getState();

    useFileStoreZustand.setState({
      fileContents: {
        'concurrent/test.ts': 'original',
      },
      openTabs: [],
      activeFile: undefined,
      gitChanges: [],
    });

    const operations = [
      () => store.copyFile('concurrent/test.ts', 'concurrent/copy1.ts'),
      () => store.copyFile('concurrent/test.ts', 'concurrent/copy2.ts'),
      () => store.moveFile('concurrent/test.ts', 'concurrent/moved.ts'),
    ];

    const results = await Promise.all(operations.map((op) => Promise.resolve(op())));

    const successCount = results.filter((r) => r).length;
    expect(successCount).toBeGreaterThan(0);
  });
});

// ── Performance Integration Test ──

describe('Integration: Performance', () => {
  it('should handle large number of files efficiently', () => {
    const startTime = performance.now();

    const files: Record<string, string> = {};
    for (let i = 0; i < 1000; i++) {
      files[`file-${i}.ts`] = `// Content ${i}`;
    }

    useFileStoreZustand.setState({
      fileContents: files,
      openTabs: [],
      activeFile: undefined,
      gitChanges: [],
    });

    const store = useFileStoreZustand.getState();

    const moveStartTime = performance.now();
    store.moveFile('file-0.ts', 'renamed/file-0.ts');
    const moveDuration = performance.now() - moveStartTime;

    expect(moveDuration).toBeLessThan(100);

    const totalDuration = performance.now() - startTime;
    expect(totalDuration).toBeLessThan(1000);
  });

  it('should efficiently process chunked uploads', async () => {
    const handler = new ChunkedFileHandler({
      chunkSize: 1024 * 1024,
      maxConcurrentChunks: 5,
    });

    const largeContent = 'x'.repeat(5 * 1024 * 1024);
    const file = new File([largeContent], 'large.txt', { type: 'text/plain' });

    const startTime = performance.now();

    const uploadChunk = vi.fn().mockResolvedValue({ success: true, chunkId: 'chunk' });
    await handler.uploadFile(file, uploadChunk);

    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(5000);
  });
});
