import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { unzip } from 'fflate';
import { AppError } from '../../../utils/errorHandler.js';

// File size limits for pack operations
export const FILE_SIZE_LIMITS = {
  MAX_REQUEST_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_ZIP_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_UNCOMPRESSED_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_FILES: 1000, // Maximum number of files in zip
} as const;

// Helper function to format size for error messages
export const formatFileSize = (bytes: number): string => {
  return `${bytes / 1024 / 1024}MB`;
};

// Enhanced ZIP extraction limits (aligned with processZipFile.ts)
const ZIP_SECURITY_LIMITS = {
  MAX_FILES: 10000, // Maximum number of files in the archive
  MAX_UNCOMPRESSED_SIZE: 100_000_000, // Maximum total uncompressed size (100MB)
  MAX_COMPRESSION_RATIO: 100, // Maximum compression ratio to prevent ZIP bombs
  MAX_PATH_LENGTH: 200, // Maximum file path length
  MAX_NESTING_LEVEL: 50, // Maximum directory nesting level
};

export async function extractZip(file: File, destPath: string): Promise<void> {
  try {
    // Validate file size before processing
    if (file.size > FILE_SIZE_LIMITS.MAX_ZIP_SIZE) {
      throw new AppError(`File size exceeds maximum limit of ${formatFileSize(FILE_SIZE_LIMITS.MAX_ZIP_SIZE)}`);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Unzip using fflate with promise wrapper
    const files = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
      unzip(buffer, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    const filePaths = Object.keys(files);

    // 1. Check number of files
    if (filePaths.length > ZIP_SECURITY_LIMITS.MAX_FILES) {
      throw new AppError(
        `ZIP contains too many files (${filePaths.length}). Maximum allowed: ${ZIP_SECURITY_LIMITS.MAX_FILES}`,
      );
    }

    // 2. Calculate total uncompressed size
    const totalUncompressedSize = Object.values(files).reduce((sum, data) => sum + data.length, 0);
    if (totalUncompressedSize > ZIP_SECURITY_LIMITS.MAX_UNCOMPRESSED_SIZE) {
      throw new AppError(
        `Uncompressed size (${(totalUncompressedSize / 1_000_000).toFixed(2)}MB) exceeds maximum limit of ${
          ZIP_SECURITY_LIMITS.MAX_UNCOMPRESSED_SIZE / 1_000_000
        }MB`,
      );
    }

    // 3. Check compression ratio (ZIP bomb detection)
    if (file.size > 0) {
      const compressionRatio = totalUncompressedSize / file.size;
      if (compressionRatio > ZIP_SECURITY_LIMITS.MAX_COMPRESSION_RATIO) {
        throw new AppError(
          `Suspicious compression ratio (${compressionRatio.toFixed(2)}:1). Maximum allowed: ${ZIP_SECURITY_LIMITS.MAX_COMPRESSION_RATIO}:1`,
        );
      }
    }

    // 4. Validate all entries for path traversal, file extensions, and nesting level
    const processedPaths = new Set<string>();

    for (const entryPath of filePaths) {
      // Skip directories (fflate doesn't include directory entries, only files)
      if (entryPath.endsWith('/')) continue;

      // 4.1 Check for unsafe paths (directory traversal prevention)
      const fullPath = path.resolve(destPath, entryPath);
      const relativePath = path.relative(destPath, fullPath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        throw new AppError(`Security violation: Potential directory traversal attack detected in path: ${entryPath}`);
      }

      // 4.2 Check path length
      if (entryPath.length > ZIP_SECURITY_LIMITS.MAX_PATH_LENGTH) {
        throw new AppError(
          `File path exceeds maximum length: ${entryPath.length} > ${ZIP_SECURITY_LIMITS.MAX_PATH_LENGTH}`,
        );
      }

      // 4.3 Check nesting level
      const nestingLevel = entryPath.split('/').length - 1;
      if (nestingLevel > ZIP_SECURITY_LIMITS.MAX_NESTING_LEVEL) {
        throw new AppError(
          `Directory nesting level exceeds maximum: ${nestingLevel} > ${ZIP_SECURITY_LIMITS.MAX_NESTING_LEVEL}`,
        );
      }

      // 4.4 Check for duplicate paths (could indicate ZipSlip vulnerability attempts)
      const normalizedPath = path.normalize(fullPath);
      if (processedPaths.has(normalizedPath)) {
        throw new AppError(`Duplicate file path detected: ${entryPath}. This could indicate a malicious archive.`);
      }
      processedPaths.add(normalizedPath);
    }

    await fs.mkdir(destPath, { recursive: true });

    // Extract files using fflate with parallel writes
    const writePromises = Object.entries(files)
      .filter(([filePath]) => !filePath.endsWith('/')) // Skip directories
      .map(async ([filePath, data]) => {
        const fullPath = path.join(destPath, filePath);
        const dirPath = path.dirname(fullPath);

        // Create directory if it doesn't exist
        await fs.mkdir(dirPath, { recursive: true });

        // Write the file
        await fs.writeFile(fullPath, data);
      });

    await Promise.all(writePromises);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`Failed to extract ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const createTempDirectory = async (): Promise<string> => {
  try {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-'));
    return tempDir;
  } catch (error) {
    throw new AppError(`Failed to create temporary directory: ${(error as Error).message}`);
  }
};

export const cleanupTempDirectory = async (directory: string): Promise<void> => {
  try {
    if (!directory.includes('repomix-')) {
      throw new AppError('Invalid temporary directory path');
    }
    await fs.rm(directory, { recursive: true, force: true });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error(`Failed to cleanup temporary directory: ${directory}`, error);
  }
};

export const copyOutputToCurrentDirectory = async (
  sourceDir: string,
  targetDir: string,
  outputFileName: string,
): Promise<void> => {
  // Sanitize file paths
  const sanitizedFileName = path.basename(outputFileName);
  const sourcePath = path.join(sourceDir, sanitizedFileName);
  const targetPath = path.join(targetDir, sanitizedFileName);

  try {
    // Verify source exists
    await fs.access(sourcePath);

    // Ensure target directory exists
    await fs.mkdir(targetDir, { recursive: true });

    await fs.copyFile(sourcePath, targetPath);
  } catch (error) {
    throw new AppError(
      `Failed to copy output file: ${(error as Error).message}. Source: ${sourcePath}, Target: ${targetPath}`,
    );
  }
};
