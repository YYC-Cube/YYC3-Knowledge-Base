import { Injectable, OnDestroy } from '@angular/core';
import { ChildToolConfig, getChildToolConfig } from '../configs/tool.config';

export interface ChildToolHostInfo {
  url: string;
  origin?: string;
  wsUrl?: string;
  shutdownUrl?: string;
  port?: number;
  pid?: number;
}

interface ChildToolBackendMessage {
  event?: string;
  data?: any;
}

interface ChildToolSession {
  streamId: string;
  stdoutBuffer: string;
  stderrBuffer: string;
  removeListener: (() => void) | null;
  startPromise: Promise<ChildToolHostInfo> | null;
  readyResolve: ((value: ChildToolHostInfo) => void) | null;
  readyReject: ((reason?: any) => void) | null;
  running: boolean;
  hostInfo: ChildToolHostInfo | null;
  refCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChildToolProcessService implements OnDestroy {
  private sessions = new Map<string, ChildToolSession>();

  async acquire(toolId: string): Promise<ChildToolHostInfo> {
    const config = this.requireConfig(toolId);
    const session = this.ensureSession(config.id);
    session.refCount += 1;

    try {
      return await this.startSession(config, session);
    } catch (error) {
      session.refCount = Math.max(0, session.refCount - 1);
      throw error;
    }
  }

  async release(toolId: string): Promise<void> {
    const config = getChildToolConfig(toolId);
    const session = this.sessions.get(toolId);
    if (!config || !session) return;

    session.refCount = Math.max(0, session.refCount - 1);
    if (session.refCount === 0) {
      await this.stopSession(config, session);
      this.sessions.delete(toolId);
    }
  }

  async restart(toolId: string): Promise<ChildToolHostInfo> {
    const config = this.requireConfig(toolId);
    const session = this.ensureSession(config.id);
    await this.stopSession(config, session);
    return await this.startSession(config, session);
  }

  async stopAll(): Promise<void> {
    const entries = Array.from(this.sessions.entries());
    for (const [toolId, session] of entries) {
      const config = getChildToolConfig(toolId);
      if (config) {
        await this.stopSession(config, session);
      }
      this.sessions.delete(toolId);
    }
  }

  ngOnDestroy(): void {
    void this.stopAll();
  }

  private requireConfig(toolId: string): ChildToolConfig {
    const config = getChildToolConfig(toolId);
    if (!config) {
      throw new Error(`Child tool is not registered: ${toolId}`);
    }
    return config;
  }

  private ensureSession(toolId: string): ChildToolSession {
    let session = this.sessions.get(toolId);
    if (!session) {
      session = {
        streamId: '',
        stdoutBuffer: '',
        stderrBuffer: '',
        removeListener: null,
        startPromise: null,
        readyResolve: null,
        readyReject: null,
        running: false,
        hostInfo: null,
        refCount: 0
      };
      this.sessions.set(toolId, session);
    }
    return session;
  }

  private async startSession(config: ChildToolConfig, session: ChildToolSession): Promise<ChildToolHostInfo> {
    if (session.running && session.hostInfo) {
      return session.hostInfo;
    }

    if (session.startPromise) {
      return session.startPromise;
    }

    session.startPromise = this.startServer(config, session);
    try {
      return await session.startPromise;
    } finally {
      session.startPromise = null;
    }
  }

  private async stopSession(_config: ChildToolConfig, session: ChildToolSession): Promise<void> {
    const streamId = session.streamId;
    if (!streamId && !session.running) {
      return;
    }

    try {
      if (streamId) {
        await window['cmd']?.kill?.(streamId);
      }
    } finally {
      this.handleClose(session);
    }
  }

  private async startServer(config: ChildToolConfig, session: ChildToolSession): Promise<ChildToolHostInfo> {
    const cmd = window['cmd'];
    const pathApi = window['path'];
    const fsApi = window['fs'];

    if (!cmd?.run || !cmd?.onData) {
      throw new Error('Electron command bridge is not available');
    }

    if (!pathApi?.getAilyChildPath || !pathApi?.join) {
      throw new Error('Aily child path API is not available');
    }

    const childPath = pathApi.getAilyChildPath();
    const childDir = config.childDir || pathApi.join('tools', config.id);
    const projectPath = pathApi.join(childPath, childDir);
    const scriptPath = pathApi.join(projectPath, config.entry || 'index.js');
    const uiPath = pathApi.join(projectPath, config.uiIndex || pathApi.join('ui', 'index.html'));

    this.log(config, 'resolve paths', {
      childPath,
      childDir,
      projectPath,
      scriptPath,
      uiPath
    });

    if (fsApi?.existsSync && !fsApi.existsSync(scriptPath)) {
      const message = `${config.id} backend was not found: ${scriptPath}`;
      this.logError(config, 'backend missing', message);
      throw new Error(message);
    }

    if (fsApi?.existsSync && !fsApi.existsSync(uiPath)) {
      const message = `${config.id} UI was not found: ${uiPath}`;
      this.logError(config, 'UI missing', message);
      throw new Error(message);
    }

    session.streamId = `child_tool_${config.id.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    session.stdoutBuffer = '';
    session.stderrBuffer = '';
    this.log(config, 'spawn server', {
      command: 'node',
      args: [scriptPath, 'serve', '--host', '127.0.0.1', '--port', '0'],
      cwd: projectPath,
      streamId: session.streamId
    });

    const readyPromise = new Promise<ChildToolHostInfo>((resolve, reject) => {
      const timeout = setTimeout(() => {
        session.readyResolve = null;
        session.readyReject = null;
        const reason = `${config.id} server did not report ready${this.formatBufferedStderr(session)}`;
        this.logError(config, 'ready timeout', reason);
        reject(new Error(reason));
      }, config.startupTimeoutMs || 8000);

      session.readyResolve = value => {
        clearTimeout(timeout);
        resolve(value);
      };
      session.readyReject = reason => {
        clearTimeout(timeout);
        reject(reason);
      };
    });

    session.removeListener = cmd.onData(session.streamId, (output: any) => {
      this.handleProcessOutput(config, session, output);
    });

    const result = await cmd.run({
      command: 'node',
      args: [scriptPath, 'serve', '--host', '127.0.0.1', '--port', '0'],
      cwd: projectPath,
      streamId: session.streamId,
      env: {
        AILY_CHILD_TOOL: '1',
        AILY_CHILD_TOOL_ID: config.id,
        ...(config.env || {})
      }
    });

    if (!result?.success) {
      this.handleClose(session);
      const message = result?.error || `Failed to start ${config.id} server`;
      this.logError(config, 'spawn failed', {
        message,
        result
      });
      throw new Error(message);
    }

    const hostInfo = await readyPromise;
    this.log(config, 'server ready promise resolved', this.sanitizeHostInfo(hostInfo));
    return hostInfo;
  }

  private handleProcessOutput(config: ChildToolConfig, session: ChildToolSession, output: any): void {
    if (!output) return;

    if (output.type === 'stdout' && output.data) {
      this.consumeStdout(config, session, output.data);
      return;
    }

    if (output.type === 'stderr' && output.data) {
      session.stderrBuffer += String(output.data);
      this.logError(config, 'stderr', this.tailText(String(output.data)));
      return;
    }

    if (output.type === 'error') {
      const reason = output.error || `${config.id} server process error`;
      this.logError(config, 'process error', reason);
      this.rejectReady(session, reason);
      this.handleClose(session);
      return;
    }

    if (output.type === 'close') {
      const reason = `${config.id} server closed with code ${output.code ?? 'unknown'}${this.formatBufferedStderr(session)}`;
      const details = {
        code: output.code,
        signal: output.signal,
        reason
      };

      if (session.readyReject || (session.running && session.refCount > 0)) {
        this.logError(config, 'process closed', details);
        this.rejectReady(session, reason);
      } else {
        this.log(config, 'process closed', details);
      }
      this.handleClose(session);
    }
  }

  private consumeStdout(config: ChildToolConfig, session: ChildToolSession, chunk: string): void {
    session.stdoutBuffer += chunk;
    const lines = session.stdoutBuffer.split(/\r?\n/);
    session.stdoutBuffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        this.handleBackendMessage(config, session, JSON.parse(trimmed));
      } catch {
        this.log(config, 'stdout', trimmed);
      }
    }
  }

  private handleBackendMessage(config: ChildToolConfig, session: ChildToolSession, message: ChildToolBackendMessage): void {
    if (message.event === 'ready' && message.data?.url) {
      session.hostInfo = message.data as ChildToolHostInfo;
      session.running = true;
      this.log(config, 'backend event: ready', this.sanitizeHostInfo(session.hostInfo));
      this.resolveReady(session, session.hostInfo);
      return;
    }

    if (message.event === 'fatal') {
      const error = message.data?.message || `${config.id} server fatal error`;
      this.logError(config, 'backend event: fatal', error);
      this.rejectReady(session, error);
      return;
    }

    if (message.event) {
      this.log(config, `backend event: ${message.event}`, message.data || {});
    }
  }

  private resolveReady(session: ChildToolSession, value: ChildToolHostInfo): void {
    const resolve = session.readyResolve;
    session.readyResolve = null;
    session.readyReject = null;
    resolve?.(value);
  }

  private rejectReady(session: ChildToolSession, reason: any): void {
    const reject = session.readyReject;
    session.readyResolve = null;
    session.readyReject = null;
    reject?.(reason instanceof Error ? reason : new Error(String(reason)));
  }

  private handleClose(session: ChildToolSession): void {
    if (session.removeListener) {
      session.removeListener();
      session.removeListener = null;
    }

    session.running = false;
    session.streamId = '';
    session.stdoutBuffer = '';
    session.stderrBuffer = '';
    session.hostInfo = null;
  }

  private log(config: ChildToolConfig, stage: string, details?: any): void {
    console.info(`[child-tool:${config.id}] ${stage}`, details ?? '');
  }

  private logError(config: ChildToolConfig, stage: string, details?: any): void {
    console.error(`[child-tool:${config.id}] ${stage}`, details ?? '');
  }

  private sanitizeHostInfo(info: ChildToolHostInfo | any): any {
    if (!info || typeof info !== 'object') return info;

    return {
      ...info,
      url: this.sanitizeUrl(info.url),
      wsUrl: this.sanitizeUrl(info.wsUrl),
      shutdownUrl: this.sanitizeUrl(info.shutdownUrl)
    };
  }

  private sanitizeUrl(url: any): any {
    if (typeof url !== 'string' || !url) return url;

    try {
      const parsed = new URL(url);
      if (parsed.searchParams.has('token')) {
        parsed.searchParams.set('token', '<redacted>');
      }
      return parsed.toString();
    } catch {
      return url.replace(/([?&]token=)[^&]+/g, '$1<redacted>');
    }
  }

  private formatBufferedStderr(session: ChildToolSession): string {
    const stderr = this.tailText(session.stderrBuffer).trim();
    return stderr ? `: ${stderr}` : '';
  }

  private tailText(value: string, maxLength = 4000): string {
    const text = String(value || '');
    return text.length > maxLength ? `...${text.slice(-maxLength)}` : text;
  }
}
