import { describe, expect, it } from 'vitest';
import type { RawFile } from '../../../src/core/file/fileTypes.js';
import { filterOutUntrustedFiles } from '../../../src/core/security/filterOutUntrustedFiles.js';
import type { SuspiciousFileResult } from '../../../src/core/security/securityCheck.js';

describe('filterOutUntrustedFiles', () => {
  it('should filter out files marked as suspicious', () => {
    const rawFiles: RawFile[] = [
      { path: 'file1.txt', content: 'content 1' },
      { path: 'file2.txt', content: 'content 2' },
      { path: 'file3.txt', content: 'content 3' },
    ];
    const suspiciousFilesResults: SuspiciousFileResult[] = [
      { filePath: 'file2.txt', messages: ['something suspicious.'], type: 'file' },
    ];
    const expectedGoodFiles = [rawFiles[0], rawFiles[2]];

    const result = filterOutUntrustedFiles(rawFiles, suspiciousFilesResults);

    expect(result).toEqual(expectedGoodFiles);
  });

  it('should return all files if no suspicious files', () => {
    const rawFiles: RawFile[] = [
      { path: 'file1.txt', content: 'content 1' },
      { path: 'file2.txt', content: 'content 2' },
      { path: 'file3.txt', content: 'content 3' },
    ];
    const suspiciousFilesResults: SuspiciousFileResult[] = [];

    const result = filterOutUntrustedFiles(rawFiles, suspiciousFilesResults);

    expect(result).toEqual(rawFiles);
  });
});
