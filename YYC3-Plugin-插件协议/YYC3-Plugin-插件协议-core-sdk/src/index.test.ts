import { describe, it, expect } from 'vitest';
import { YYC3Hub, SessionManager, MCPManager, YYC3Auth } from '../src/index';

describe('YYC3Hub', () => {
  it('should create a hub instance', () => {
    const hub = new YYC3Hub();
    expect(hub).toBeDefined();
  });

  it('should initialize successfully', async () => {
    const hub = new YYC3Hub();
    await expect(hub.initialize()).resolves.toBeUndefined();
  });

  it('should accept config options', () => {
    const hub = new YYC3Hub({
      auth: {
        openaiApiKey: 'test-key',
        ollamaEndpoint: 'http://localhost:11434',
      },
    });
    expect(hub).toBeDefined();
  });
});

describe('SessionManager', () => {
  it('should create a session manager', () => {
    const manager = new SessionManager();
    expect(manager).toBeDefined();
  });

  it('should create a new session', () => {
    const manager = new SessionManager();
    const session = manager.createSession();
    expect(session.id).toBeDefined();
    expect(session.messages).toEqual([]);
  });

  it('should create session with metadata', () => {
    const manager = new SessionManager();
    const session = manager.createSession({ userId: 'test-user' });
    expect(session.metadata).toEqual({ userId: 'test-user' });
  });

  it('should get an existing session', () => {
    const manager = new SessionManager();
    const session = manager.createSession();
    const retrieved = manager.getSession(session.id);
    expect(retrieved).toEqual(session);
  });

  it('should return undefined for non-existent session', () => {
    const manager = new SessionManager();
    const retrieved = manager.getSession('non-existent');
    expect(retrieved).toBeUndefined();
  });

  it('should delete a session', () => {
    const manager = new SessionManager();
    const session = manager.createSession();
    manager.deleteSession(session.id);
    expect(manager.getSession(session.id)).toBeUndefined();
  });

  it('should add message to session', () => {
    const manager = new SessionManager();
    const session = manager.createSession();
    manager.addMessage(session.id, { role: 'user', content: 'Hello' });
    const updated = manager.getSession(session.id);
    expect(updated?.messages).toHaveLength(1);
    expect(updated?.messages[0]).toEqual({
      role: 'user',
      content: 'Hello',
      timestamp: expect.any(Number),
    });
  });
});

describe('MCPManager', () => {
  it('should create an MCP manager', () => {
    const manager = new MCPManager();
    expect(manager).toBeDefined();
  });

  it('should initialize successfully', async () => {
    const manager = new MCPManager();
    await expect(manager.initialize()).resolves.toBeUndefined();
  });

  it('should add a server', () => {
    const manager = new MCPManager();
    manager.addServer({
      id: 'test-server',
      name: 'Test Server',
      command: 'test',
      args: [],
      env: {},
      status: 'stopped',
    });
    const server = manager.getServer('test-server');
    expect(server).toBeDefined();
    expect(server?.name).toBe('Test Server');
  });

  it('should get all servers', () => {
    const manager = new MCPManager();
    manager.addServer({
      id: 'server-1',
      name: 'Server 1',
      command: 'test1',
      args: [],
      env: {},
      status: 'stopped',
    });
    manager.addServer({
      id: 'server-2',
      name: 'Server 2',
      command: 'test2',
      args: [],
      env: {},
      status: 'stopped',
    });
    const servers = manager.getAllServers();
    expect(servers).toHaveLength(2);
  });

  it('should start and stop server', async () => {
    const manager = new MCPManager();
    manager.addServer({
      id: 'test-server',
      name: 'Test Server',
      command: 'test',
      args: [],
      env: {},
      status: 'stopped',
    });
    await manager.startServer('test-server');
    expect(manager.getServer('test-server')?.status).toBe('running');
    await manager.stopServer('test-server');
    expect(manager.getServer('test-server')?.status).toBe('stopped');
  });
});

describe('YYC3Auth', () => {
  it('should create an auth instance', () => {
    const auth = new YYC3Auth();
    expect(auth).toBeDefined();
  });

  it('should create auth with config', () => {
    const auth = new YYC3Auth({
      openaiApiKey: 'test-key',
      ollamaEndpoint: 'http://localhost:11434',
    });
    expect(auth).toBeDefined();
  });

  it('should get all providers', () => {
    const auth = new YYC3Auth();
    const providers = auth.getAllProviders();
    expect(Array.isArray(providers)).toBe(true);
  });
});
