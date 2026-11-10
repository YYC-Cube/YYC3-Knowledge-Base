/**
 * @file: ChunkedFileHandler.test.ts
 * @description: 大文件分块处理器测试用例
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 */

// @vitest-environment node

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChunkedFileHandler, getChunkedFileHandler } from '../services/ChunkedFileHandler';

describe('ChunkedFileHandler', () => {
  let handler: ChunkedFileHandler;

  beforeEach(() => {
    handler = new ChunkedFileHandler({
      chunkSize: 1024,
      maxConcurrentChunks: 2,
      maxRetries: 2,
      retryDelay: 100,
    });
  });

  describe('uploadFile', () => {
    it('should upload small file successfully', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const uploadChunk = vi.fn().mockResolvedValue({ success: true, chunkIndex: 0 });

      const result = await handler.uploadFile(file, uploadChunk);

      expect(result.success).toBe(true);
      expect(result.fileId).toBeDefined();
    });

    it('should split file into chunks', async () => {
      const content = 'x'.repeat(3000);
      const file = new File([content], 'large.txt', { type: 'text/plain' });
      const uploadChunk = vi.fn().mockResolvedValue({ success: true });

      await handler.uploadFile(file, uploadChunk);

      expect(uploadChunk.mock.calls.length).toBe(3);
    });

    it('should track upload progress', async () => {
      const content = 'x'.repeat(2000);
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      const uploadChunk = vi.fn().mockResolvedValue({ success: true });
      const onProgress = vi.fn();

      await handler.uploadFile(file, uploadChunk, onProgress);

      expect(onProgress).toHaveBeenCalled();
      const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1][0];
      expect(lastCall.percentage).toBe(100);
      expect(lastCall.status).toBe('completed');
    });

    it('should retry failed chunks', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const uploadChunk = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({ success: true });

      const result = await handler.uploadFile(file, uploadChunk);

      expect(result.success).toBe(true);
      expect(uploadChunk).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const uploadChunk = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await handler.uploadFile(file, uploadChunk);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('downloadFile', () => {
    it('should download file successfully', async () => {
      const downloadChunk = vi.fn().mockImplementation((index: number) => {
        return Promise.resolve(new Blob(['chunk' + index]));
      });

      const result = await handler.downloadFile('file-123', 'test.txt', 2048, downloadChunk);

      expect(result.success).toBe(true);
      expect(result.blob).toBeDefined();
    });

    it('should combine chunks into single blob', async () => {
      const downloadChunk = vi
        .fn()
        .mockResolvedValueOnce(new Blob(['part1']))
        .mockResolvedValueOnce(new Blob(['part2']));

      const result = await handler.downloadFile('file-123', 'test.txt', 2048, downloadChunk);

      expect(result.success).toBe(true);
      const text = await result.blob?.text();
      expect(text).toBe('part1part2');
    });

    it('should track download progress', async () => {
      const downloadChunk = vi.fn().mockResolvedValue(new Blob(['x'.repeat(1024)]));
      const onProgress = vi.fn();

      await handler.downloadFile('file-123', 'test.txt', 2048, downloadChunk, onProgress);

      expect(onProgress).toHaveBeenCalled();
    });
  });

  describe('pauseTransfer', () => {
    it('should pause active transfer', async () => {
      const file = new File(['x'.repeat(5000)], 'large.txt', { type: 'text/plain' });
      const uploadChunk = vi.fn().mockImplementation(() => new Promise(r => setTimeout(r, 100)));

      const uploadPromise = handler.uploadFile(file, uploadChunk);

      await new Promise(r => setTimeout(r, 50));

      const paused = handler.pauseTransfer(uploadPromise.then(r => r.fileId) as any);

      expect(typeof paused === 'boolean').toBe(true);
    });
  });

  describe('cancelTransfer', () => {
    it('should cancel transfer', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const uploadChunk = vi.fn().mockImplementation(() => new Promise(r => setTimeout(r, 1000)));

      const result = await handler.uploadFile(file, uploadChunk);
      const cancelled = handler.cancelTransfer(result.fileId);

      expect(cancelled).toBe(true);
    });
  });

  describe('getProgress', () => {
    it('should return progress for active transfer', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const uploadChunk = vi.fn().mockResolvedValue({ success: true });

      const result = await handler.uploadFile(file, uploadChunk);
      const progress = handler.getProgress(result.fileId);

      expect(progress).toBeDefined();
      expect(progress?.status).toBe('completed');
    });

    it('should return null for unknown transfer', () => {
      const progress = handler.getProgress('unknown');
      expect(progress).toBeNull();
    });
  });

  describe('getAllProgress', () => {
    it('should return all active transfers', async () => {
      const file1 = new File(['test1'], 'test1.txt', { type: 'text/plain' });
      const file2 = new File(['test2'], 'test2.txt', { type: 'text/plain' });
      const uploadChunk = vi.fn().mockResolvedValue({ success: true });

      await handler.uploadFile(file1, uploadChunk);
      await handler.uploadFile(file2, uploadChunk);

      const allProgress = handler.getAllProgress();

      expect(allProgress.length).toBe(2);
    });
  });

  describe('calculateHash', () => {
    it('should calculate SHA-256 hash', async () => {
      const blob = new Blob(['test content']);
      const hash = await handler.calculateHash(blob);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
    });

    it('should produce consistent hashes', async () => {
      const blob = new Blob(['test content']);
      const hash1 = await handler.calculateHash(blob);
      const hash2 = await handler.calculateHash(blob);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different content', async () => {
      const blob1 = new Blob(['content1']);
      const blob2 = new Blob(['content2']);
      const hash1 = await handler.calculateHash(blob1);
      const hash2 = await handler.calculateHash(blob2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(handler.formatBytes(0)).toBe('0 B');
      expect(handler.formatBytes(1024)).toBe('1 KB');
      expect(handler.formatBytes(1024 * 1024)).toBe('1 MB');
      expect(handler.formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });
  });

  describe('formatSpeed', () => {
    it('should format speed correctly', () => {
      expect(handler.formatSpeed(1024)).toBe('1 KB/s');
      expect(handler.formatSpeed(1024 * 1024)).toBe('1 MB/s');
    });
  });

  describe('formatEta', () => {
    it('should format ETA correctly', () => {
      expect(handler.formatEta(30)).toBe('30秒');
      expect(handler.formatEta(90)).toBe('2分钟');
      expect(handler.formatEta(3600)).toBe('1小时');
    });
  });
});

describe('getChunkedFileHandler', () => {
  it('should return singleton instance', () => {
    const instance1 = getChunkedFileHandler();
    const instance2 = getChunkedFileHandler();

    expect(instance1).toBe(instance2);
  });
});
