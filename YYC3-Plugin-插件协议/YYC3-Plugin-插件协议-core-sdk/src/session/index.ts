/**
 * @description YYC³ Session - 会话管理
 * @module @yyc3/core/session
 */

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface Session {
  id: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
}

export interface SessionConfig {
  maxSessions?: number;
  maxMessagesPerSession?: number;
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private _config: SessionConfig;
  private _initialized: boolean = false;

  constructor(config: SessionConfig = {}) {
    this._config = {
      maxSessions: config.maxSessions ?? 100,
      maxMessagesPerSession: config.maxMessagesPerSession ?? 1000,
    };
  }

  async initialize(): Promise<void> {
    this._initialized = true;
  }

  createSession(metadata?: Record<string, unknown>): Session {
    const id = this.generateId();
    const session: Session = {
      id,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    if (metadata !== undefined) {
      session.metadata = metadata;
    }
    this.sessions.set(id, session);
    return session;
  }

  getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  addMessage(sessionId: string, message: Omit<Message, 'timestamp'>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages.push({
        ...message,
        timestamp: Date.now(),
      });
      session.updatedAt = Date.now();
    }
  }

  getMessages(sessionId: string): Message[] {
    return this.sessions.get(sessionId)?.messages ?? [];
  }

  deleteSession(id: string): boolean {
    return this.sessions.delete(id);
  }

  getActiveCount(): number {
    return this.sessions.size;
  }

  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  async shutdown(): Promise<void> {
    this.sessions.clear();
    this._initialized = false;
  }

  private generateId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
