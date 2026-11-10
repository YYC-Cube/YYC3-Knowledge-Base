import { beforeEach, describe, expect, test, vi } from 'vitest';
import { runMcpAction } from '../../../src/cli/actions/mcpAction.js';
import { runMcpServer } from '../../../src/mcp/mcpServer.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/mcp/mcpServer');
vi.mock('../../../src/shared/logger');

describe('mcpAction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('should start MCP server and log trace message', async () => {
    const mockRunMcpServer = vi.mocked(runMcpServer);
    mockRunMcpServer.mockResolvedValue();

    await runMcpAction();

    expect(logger.trace).toHaveBeenCalledWith('Starting Repomix MCP server...');
    expect(mockRunMcpServer).toHaveBeenCalled();
  });

  test('should handle MCP server startup error', async () => {
    const mockRunMcpServer = vi.mocked(runMcpServer);
    mockRunMcpServer.mockRejectedValue(new Error('Server startup failed'));

    await expect(runMcpAction()).rejects.toThrow('Server startup failed');

    expect(logger.trace).toHaveBeenCalledWith('Starting Repomix MCP server...');
    expect(mockRunMcpServer).toHaveBeenCalled();
  });
});
