import { describe, it, expect } from 'vitest';
import { MCPClient } from '../src/index';
import type { MCPClientConfig, MCPConnection } from '../src/index';

describe('MCP Client', () => {
  describe('MCPClient', () => {
    it('should create an MCP client', () => {
      const client = new MCPClient();
      expect(client).toBeDefined();
    });

    it('should create with config', () => {
      const config: MCPClientConfig = {
        timeout: 30000,
        retryCount: 3,
        retryDelay: 1000,
      };
      const client = new MCPClient(config);
      expect(client).toBeDefined();
    });

    it('should have connect method', () => {
      const client = new MCPClient();
      expect(typeof client.connect).toBe('function');
    });

    it('should have disconnect method', () => {
      const client = new MCPClient();
      expect(typeof client.disconnect).toBe('function');
    });

    it('should have listTools method', () => {
      const client = new MCPClient();
      expect(typeof client.listTools).toBe('function');
    });

    it('should have callTool method', () => {
      const client = new MCPClient();
      expect(typeof client.callTool).toBe('function');
    });
  });

  describe('MCPConnection Types', () => {
    it('should support connection config', () => {
      const connection: MCPConnection = {
        id: 'conn-1',
        serverName: 'test-server',
        status: 'connected',
        lastPing: Date.now(),
      };
      expect(connection.id).toBe('conn-1');
      expect(connection.serverName).toBe('test-server');
      expect(connection.status).toBe('connected');
    });

    it('should support disconnected status', () => {
      const connection: MCPConnection = {
        id: 'conn-2',
        serverName: 'another-server',
        status: 'disconnected',
      };
      expect(connection.status).toBe('disconnected');
    });
  });
});
