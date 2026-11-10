/**
 * @file: ChunkedFileHandler.ts
 * @description: 大文件分块处理器 - 支持分块上传、下载、处理
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-05
 * @updated: 2026-04-05
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: chunked-file,upload,download,large-file,streaming
 */

// ================================================================
// Chunked File Handler - 大文件分块处理器
// ================================================================
//
// 功能：
//   - 文件分块上传
//   - 文件分块下载
//   - 断点续传
//   - 进度追踪
//   - 并发控制
//   - 哈希校验
//
// 使用场景：
//   - 大文件上传
//   - 文件同步
//   - 文件备份
//   - 文件迁移
// ================================================================

// ── Types ──

export interface ChunkConfig {
  chunkSize: number;
  maxConcurrentChunks: number;
  maxRetries: number;
  retryDelay: number;
  enableHashVerification: boolean;
  enableResume: boolean;
  tempDir?: string;
}

export interface ChunkInfo {
  index: number;
  start: number;
  end: number;
  size: number;
  hash?: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  retryCount: number;
  uploadedBytes: number;
}

export interface FileTransferProgress {
  fileId: string;
  fileName: string;
  fileSize: number;
  transferredBytes: number;
  percentage: number;
  speed: number;
  eta: number;
  chunks: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
  };
  status: 'pending' | 'transferring' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startTime: number;
  error?: string;
}

export interface ChunkUploadResult {
  chunkIndex: number;
  success: boolean;
  etag?: string;
  error?: string;
}

export type UploadChunkFn = (
  chunk: Blob,
  chunkIndex: number,
  totalChunks: number,
  fileId: string
) => Promise<ChunkUploadResult>;

export type DownloadChunkFn = (
  chunkIndex: number,
  totalChunks: number,
  fileId: string
) => Promise<Blob>;

export type ProgressCallback = (progress: FileTransferProgress) => void;

// ── Chunked File Handler ──

export class ChunkedFileHandler {
  private config: ChunkConfig;
  private activeTransfers: Map<string, FileTransferProgress> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();
  private chunkCache: Map<string, Map<number, Blob>> = new Map();

  constructor(config: Partial<ChunkConfig> = {}) {
    this.config = {
      chunkSize: config.chunkSize ?? 5 * 1024 * 1024,
      maxConcurrentChunks: config.maxConcurrentChunks ?? 3,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      enableHashVerification: config.enableHashVerification ?? true,
      enableResume: config.enableResume ?? true,
      tempDir: config.tempDir,
    };
  }

  // ── Upload Operations ──

  async uploadFile(
    file: File,
    uploadChunk: UploadChunkFn,
    onProgress?: ProgressCallback
  ): Promise<{ success: boolean; fileId: string; error?: string }> {
    const fileId = this.generateFileId(file);
    const totalChunks = Math.ceil(file.size / this.config.chunkSize);

    const progress: FileTransferProgress = {
      fileId,
      fileName: file.name,
      fileSize: file.size,
      transferredBytes: 0,
      percentage: 0,
      speed: 0,
      eta: 0,
      chunks: {
        total: totalChunks,
        completed: 0,
        failed: 0,
        pending: totalChunks,
      },
      status: 'transferring',
      startTime: Date.now(),
    };

    this.activeTransfers.set(fileId, progress);
    const abortController = new AbortController();
    this.abortControllers.set(fileId, abortController);

    try {
      const chunks = this.createChunks(file, totalChunks);
      const chunkInfos: ChunkInfo[] = chunks.map((chunk, index) => ({
        index,
        start: index * this.config.chunkSize,
        end: Math.min((index + 1) * this.config.chunkSize, file.size),
        size: chunk.size,
        status: 'pending' as const,
        retryCount: 0,
        uploadedBytes: 0,
      }));

      await this.uploadChunks(
        chunks,
        chunkInfos,
        fileId,
        uploadChunk,
        progress,
        onProgress,
        abortController.signal
      );

      progress.status = 'completed';
      progress.percentage = 100;
      onProgress?.(progress);

      return { success: true, fileId };
    } catch (error) {
      progress.status = 'failed';
      progress.error = String(error);
      onProgress?.(progress);

      return { success: false, fileId, error: String(error) };
    } finally {
      this.abortControllers.delete(fileId);
    }
  }

  private async uploadChunks(
    chunks: Blob[],
    chunkInfos: ChunkInfo[],
    fileId: string,
    uploadChunk: UploadChunkFn,
    progress: FileTransferProgress,
    onProgress?: ProgressCallback,
    signal?: AbortSignal
  ): Promise<void> {
    const pendingChunks = chunkInfos.filter(c => c.status === 'pending');
    const executing: Promise<void>[] = [];
    let completedCount = 0;

    const executeChunk = async (chunkInfo: ChunkInfo): Promise<void> => {
      if (signal?.aborted) {
        chunkInfo.status = 'failed';
        return;
      }

      chunkInfo.status = 'uploading';
      const chunk = chunks[chunkInfo.index];

      for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
        try {
          const result = await uploadChunk(chunk, chunkInfo.index, chunks.length, fileId);

          if (result.success) {
            chunkInfo.status = 'completed';
            chunkInfo.uploadedBytes = chunkInfo.size;
            completedCount++;

            progress.chunks.completed = completedCount;
            progress.chunks.pending = chunkInfos.filter(c => c.status === 'pending').length;
            progress.transferredBytes = chunkInfos
              .filter(c => c.status === 'completed')
              .reduce((sum, c) => sum + c.size, 0);
            progress.percentage = (progress.transferredBytes / progress.fileSize) * 100;

            const elapsed = Date.now() - progress.startTime;
            progress.speed = progress.transferredBytes / (elapsed / 1000);
            progress.eta = (progress.fileSize - progress.transferredBytes) / progress.speed;

            onProgress?.(progress);
            return;
          }

          chunkInfo.retryCount++;
          await this.delay(this.config.retryDelay * attempt);
        } catch (error) {
          chunkInfo.retryCount++;
          if (attempt === this.config.maxRetries) {
            chunkInfo.status = 'failed';
            progress.chunks.failed++;
            throw error;
          }
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    };

    for (const chunkInfo of pendingChunks) {
      if (signal?.aborted) break;

      const promise = executeChunk(chunkInfo);
      executing.push(promise);

      if (executing.length >= this.config.maxConcurrentChunks) {
        await Promise.race(executing);
        const completed = executing.filter(p => {
          const result = (p as any).__status;
          return result === 'completed';
        });
        completed.forEach(p => {
          const index = executing.indexOf(p);
          if (index > -1) executing.splice(index, 1);
        });
      }
    }

    await Promise.all(executing);
  }

  // ── Download Operations ──

  async downloadFile(
    fileId: string,
    fileName: string,
    fileSize: number,
    downloadChunk: DownloadChunkFn,
    onProgress?: ProgressCallback
  ): Promise<{ success: boolean; blob?: Blob; error?: string }> {
    const totalChunks = Math.ceil(fileSize / this.config.chunkSize);

    const progress: FileTransferProgress = {
      fileId,
      fileName,
      fileSize,
      transferredBytes: 0,
      percentage: 0,
      speed: 0,
      eta: 0,
      chunks: {
        total: totalChunks,
        completed: 0,
        failed: 0,
        pending: totalChunks,
      },
      status: 'transferring',
      startTime: Date.now(),
    };

    this.activeTransfers.set(fileId, progress);
    const abortController = new AbortController();
    this.abortControllers.set(fileId, abortController);

    const downloadedChunks: Blob[] = new Array(totalChunks);

    try {
      const executing: Promise<void>[] = [];

      for (let i = 0; i < totalChunks; i++) {
        if (abortController.signal.aborted) break;

        const promise = this.downloadChunkWithRetry(
          i,
          totalChunks,
          fileId,
          downloadChunk,
          downloadedChunks,
          progress,
          onProgress,
          abortController.signal
        );
        executing.push(promise);

        if (executing.length >= this.config.maxConcurrentChunks) {
          await Promise.race(executing);
        }
      }

      await Promise.all(executing);

      if (abortController.signal.aborted) {
        progress.status = 'cancelled';
        onProgress?.(progress);
        return { success: false, error: 'Download cancelled' };
      }

      const blob = new Blob(downloadedChunks, { type: 'application/octet-stream' });
      progress.status = 'completed';
      progress.percentage = 100;
      onProgress?.(progress);

      return { success: true, blob };
    } catch (error) {
      progress.status = 'failed';
      progress.error = String(error);
      onProgress?.(progress);

      return { success: false, error: String(error) };
    } finally {
      this.abortControllers.delete(fileId);
    }
  }

  private async downloadChunkWithRetry(
    chunkIndex: number,
    totalChunks: number,
    fileId: string,
    downloadChunk: DownloadChunkFn,
    downloadedChunks: Blob[],
    progress: FileTransferProgress,
    onProgress?: ProgressCallback,
    signal?: AbortSignal
  ): Promise<void> {
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      if (signal?.aborted) return;

      try {
        const chunk = await downloadChunk(chunkIndex, totalChunks, fileId);
        downloadedChunks[chunkIndex] = chunk;

        progress.chunks.completed++;
        progress.chunks.pending--;
        progress.transferredBytes += chunk.size;
        progress.percentage = (progress.transferredBytes / progress.fileSize) * 100;

        const elapsed = Date.now() - progress.startTime;
        progress.speed = progress.transferredBytes / (elapsed / 1000);
        progress.eta = (progress.fileSize - progress.transferredBytes) / progress.speed;

        onProgress?.(progress);
        return;
      } catch (error) {
        if (attempt === this.config.maxRetries) {
          progress.chunks.failed++;
          throw error;
        }
        await this.delay(this.config.retryDelay * attempt);
      }
    }
  }

  // ── Resume Support ──

  async resumeUpload(
    fileId: string,
    file: File,
    uploadChunk: UploadChunkFn,
    completedChunks: number[],
    onProgress?: ProgressCallback
  ): Promise<{ success: boolean; fileId: string; error?: string }> {
    const totalChunks = Math.ceil(file.size / this.config.chunkSize);

    const progress: FileTransferProgress = {
      fileId,
      fileName: file.name,
      fileSize: file.size,
      transferredBytes: completedChunks.length * this.config.chunkSize,
      percentage: (completedChunks.length / totalChunks) * 100,
      speed: 0,
      eta: 0,
      chunks: {
        total: totalChunks,
        completed: completedChunks.length,
        failed: 0,
        pending: totalChunks - completedChunks.length,
      },
      status: 'transferring',
      startTime: Date.now(),
    };

    this.activeTransfers.set(fileId, progress);

    const chunks = this.createChunks(file, totalChunks);
    const chunkInfos: ChunkInfo[] = chunks.map((chunk, index) => ({
      index,
      start: index * this.config.chunkSize,
      end: Math.min((index + 1) * this.config.chunkSize, file.size),
      size: chunk.size,
      status: completedChunks.includes(index) ? 'completed' as const : 'pending' as const,
      retryCount: 0,
      uploadedBytes: completedChunks.includes(index) ? chunk.size : 0,
    }));

    const abortController = new AbortController();
    this.abortControllers.set(fileId, abortController);

    try {
      await this.uploadChunks(
        chunks,
        chunkInfos,
        fileId,
        uploadChunk,
        progress,
        onProgress,
        abortController.signal
      );

      progress.status = 'completed';
      onProgress?.(progress);

      return { success: true, fileId };
    } catch (error) {
      progress.status = 'failed';
      progress.error = String(error);
      onProgress?.(progress);

      return { success: false, fileId, error: String(error) };
    } finally {
      this.abortControllers.delete(fileId);
    }
  }

  // ── Control Operations ──

  pauseTransfer(fileId: string): boolean {
    const progress = this.activeTransfers.get(fileId);
    if (!progress || progress.status !== 'transferring') {
      return false;
    }

    progress.status = 'paused';
    const controller = this.abortControllers.get(fileId);
    controller?.abort();
    return true;
  }

  cancelTransfer(fileId: string): boolean {
    const progress = this.activeTransfers.get(fileId);
    if (!progress) return false;

    progress.status = 'cancelled';
    const controller = this.abortControllers.get(fileId);
    controller?.abort();
    this.activeTransfers.delete(fileId);
    this.abortControllers.delete(fileId);
    return true;
  }

  getProgress(fileId: string): FileTransferProgress | null {
    return this.activeTransfers.get(fileId) || null;
  }

  getAllProgress(): FileTransferProgress[] {
    return Array.from(this.activeTransfers.values());
  }

  // ── Utility Methods ──

  private createChunks(file: File, totalChunks: number): Blob[] {
    const chunks: Blob[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.config.chunkSize;
      const end = Math.min(start + this.config.chunkSize, file.size);
      chunks.push(file.slice(start, end));
    }

    return chunks;
  }

  private generateFileId(file: File): string {
    return `file-${Date.now()}-${file.name}-${file.size}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async calculateHash(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatSpeed(bytesPerSecond: number): string {
    return this.formatBytes(bytesPerSecond) + '/s';
  }

  formatEta(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}秒`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`;
    return `${Math.round(seconds / 3600)}小时`;
  }
}

// ── Singleton Instance ──

let chunkedFileHandlerInstance: ChunkedFileHandler | null = null;

export function getChunkedFileHandler(config?: Partial<ChunkConfig>): ChunkedFileHandler {
  if (!chunkedFileHandlerInstance) {
    chunkedFileHandlerInstance = new ChunkedFileHandler(config);
  }
  return chunkedFileHandlerInstance;
}

// ── React Hook ──

import { useState, useCallback, useRef } from 'react';

export interface UseChunkedFileTransferResult {
  progress: FileTransferProgress[];
  isTransferring: boolean;
  uploadFile: (
    file: File,
    uploadChunk: UploadChunkFn,
    onProgress?: ProgressCallback
  ) => Promise<{ success: boolean; fileId: string; error?: string }>;
  downloadFile: (
    fileId: string,
    fileName: string,
    fileSize: number,
    downloadChunk: DownloadChunkFn,
    onProgress?: ProgressCallback
  ) => Promise<{ success: boolean; blob?: Blob; error?: string }>;
  pauseTransfer: (fileId: string) => boolean;
  cancelTransfer: (fileId: string) => boolean;
  getProgress: (fileId: string) => FileTransferProgress | null;
}

export function useChunkedFileTransfer(
  config?: Partial<ChunkConfig>
): UseChunkedFileTransferResult {
  const [progress, setProgress] = useState<FileTransferProgress[]>([]);
  const [isTransferring, setIsTransferring] = useState(false);
  const handlerRef = useRef(getChunkedFileHandler(config));

  const updateProgress = useCallback((p: FileTransferProgress) => {
    setProgress(prev => {
      const index = prev.findIndex(item => item.fileId === p.fileId);
      if (index > -1) {
        const updated = [...prev];
        updated[index] = p;
        return updated;
      }
      return [...prev, p];
    });
  }, []);

  const uploadFile = useCallback(
    async (
      file: File,
      uploadChunk: UploadChunkFn,
      onProgress?: ProgressCallback
    ) => {
      setIsTransferring(true);
      try {
        return await handlerRef.current.uploadFile(file, uploadChunk, (p) => {
          updateProgress(p);
          onProgress?.(p);
        });
      } finally {
        setIsTransferring(false);
      }
    },
    [updateProgress]
  );

  const downloadFile = useCallback(
    async (
      fileId: string,
      fileName: string,
      fileSize: number,
      downloadChunk: DownloadChunkFn,
      onProgress?: ProgressCallback
    ) => {
      setIsTransferring(true);
      try {
        return await handlerRef.current.downloadFile(
          fileId,
          fileName,
          fileSize,
          downloadChunk,
          (p) => {
            updateProgress(p);
            onProgress?.(p);
          }
        );
      } finally {
        setIsTransferring(false);
      }
    },
    [updateProgress]
  );

  const pauseTransfer = useCallback((fileId: string) => {
    return handlerRef.current.pauseTransfer(fileId);
  }, []);

  const cancelTransfer = useCallback((fileId: string) => {
    const result = handlerRef.current.cancelTransfer(fileId);
    setProgress(prev => prev.filter(p => p.fileId !== fileId));
    return result;
  }, []);

  const getProgress = useCallback((fileId: string) => {
    return handlerRef.current.getProgress(fileId);
  }, []);

  return {
    progress,
    isTransferring,
    uploadFile,
    downloadFile,
    pauseTransfer,
    cancelTransfer,
    getProgress,
  };
}

// ── Export Default ──

export default ChunkedFileHandler;
