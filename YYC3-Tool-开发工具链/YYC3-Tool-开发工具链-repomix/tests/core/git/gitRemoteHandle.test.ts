import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getRemoteRefs } from '../../../src/core/git/gitRemoteHandle.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/shared/logger');

describe('gitRemoteHandle', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getRemoteRefs', () => {
    test('should return refs when URL is valid', async () => {
      const mockOutput = `
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6	refs/heads/main
b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7	refs/heads/develop
c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8	refs/tags/v1.0.0
`.trim();
      const mockExecLsRemote = vi.fn().mockResolvedValue(mockOutput);

      const result = await getRemoteRefs('https://github.com/user/repo.git', {
        execLsRemote: mockExecLsRemote,
      });

      expect(result).toEqual(['main', 'develop', 'v1.0.0']);
      expect(mockExecLsRemote).toHaveBeenCalledWith('https://github.com/user/repo.git');
      expect(logger.trace).toHaveBeenCalledWith('Found 3 refs in repository: https://github.com/user/repo.git');
    });

    test('should return empty array when no refs found', async () => {
      const mockExecLsRemote = vi.fn().mockResolvedValue('');

      const result = await getRemoteRefs('https://github.com/user/repo.git', {
        execLsRemote: mockExecLsRemote,
      });

      expect(result).toEqual([]);
      expect(mockExecLsRemote).toHaveBeenCalledWith('https://github.com/user/repo.git');
      expect(logger.trace).toHaveBeenCalledWith('Found 0 refs in repository: https://github.com/user/repo.git');
    });

    test('should throw error when ls-remote fails', async () => {
      const mockExecLsRemote = vi.fn().mockRejectedValue(new Error('Repository not found'));

      await expect(
        getRemoteRefs('https://github.com/user/nonexistent.git', {
          execLsRemote: mockExecLsRemote,
        }),
      ).rejects.toThrow('Failed to get remote refs: Repository not found');

      expect(mockExecLsRemote).toHaveBeenCalledWith('https://github.com/user/nonexistent.git');
      expect(logger.trace).toHaveBeenCalledWith('Failed to get remote refs:', 'Repository not found');
    });

    test('should handle malformed output lines', async () => {
      const mockOutput = `
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6	refs/heads/main
invalid-line-without-tab
b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7	refs/heads/develop
`.trim();
      const mockExecLsRemote = vi.fn().mockResolvedValue(mockOutput);

      const result = await getRemoteRefs('https://github.com/user/repo.git', {
        execLsRemote: mockExecLsRemote,
      });

      expect(result).toEqual(['main', 'develop']);
      expect(mockExecLsRemote).toHaveBeenCalledWith('https://github.com/user/repo.git');
      expect(logger.trace).toHaveBeenCalledWith('Found 2 refs in repository: https://github.com/user/repo.git');
    });

    test('should throw error for invalid URL', async () => {
      await expect(
        getRemoteRefs('invalid-url', {
          execLsRemote: vi.fn(),
        }),
      ).rejects.toThrow('Invalid URL protocol');
    });

    test('should throw error for dangerous URL parameters', async () => {
      await expect(
        getRemoteRefs('https://github.com/user/repo.git --upload-pack=evil', {
          execLsRemote: vi.fn(),
        }),
      ).rejects.toThrow('Invalid repository URL. URL contains potentially dangerous parameters');
    });
  });
});
