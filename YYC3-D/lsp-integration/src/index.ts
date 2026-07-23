/**
 * @description YYC³ 多语言LSP集成层
 * @module @yyc3/lsp-integration
 * 
 * 支持7种编程语言的智能代码分析
 */

import type {
  SupportedLanguage,
  LSPClientConfig,
  LSPClientStatus,
  LSPCapabilities,
  Position,
  CompletionItem,
  Hover,
  SignatureHelp,
  Location,
  SymbolInformation,
  Diagnostic,
  CodeAction,
  TextEdit,
} from './types.js';
import { LSPClientManager, globalLSPManager } from './client.js';

export * from './types.js';
export * from './client.js';

export interface LSPIntegrationConfig {
  languages?: SupportedLanguage[];
  autoStart?: boolean;
  customConfigs?: Record<SupportedLanguage, Partial<LSPClientConfig>>;
}

export class LSPIntegration {
  private manager: LSPClientManager;
  private config: LSPIntegrationConfig;
  private initialized: boolean = false;

  constructor(config: LSPIntegrationConfig = {}) {
    this.manager = new LSPClientManager();
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.config.autoStart && this.config.languages) {
      for (const language of this.config.languages) {
        const customConfig = this.config.customConfigs?.[language];
        await this.manager.startClient(language, customConfig);
      }
    }

    this.initialized = true;
  }

  async startLanguage(language: SupportedLanguage, customConfig?: Partial<LSPClientConfig>): Promise<void> {
    await this.manager.startClient(language, customConfig);
  }

  async stopLanguage(language: SupportedLanguage): Promise<void> {
    await this.manager.stopClient(language);
  }

  getStatus(language: SupportedLanguage): LSPClientStatus | undefined {
    return this.manager.getClientStatus(language);
  }

  getAllStatuses(): LSPClientStatus[] {
    return this.manager.getAllClientStatuses();
  }

  getRunningLanguages(): SupportedLanguage[] {
    return this.manager.getRunningClients();
  }

  async getCompletions(uri: string, position: Position): Promise<CompletionItem[]> {
    return this.manager.getCompletions(uri, position);
  }

  async getHover(uri: string, position: Position): Promise<Hover | null> {
    return this.manager.getHover(uri, position);
  }

  async getSignatureHelp(uri: string, position: Position): Promise<SignatureHelp | null> {
    return this.manager.getSignatureHelp(uri, position);
  }

  async getDefinition(uri: string, position: Position): Promise<Location[]> {
    return this.manager.getDefinition(uri, position);
  }

  async getReferences(uri: string, position: Position): Promise<Location[]> {
    return this.manager.getReferences(uri, position);
  }

  async getDocumentSymbols(uri: string): Promise<SymbolInformation[]> {
    return this.manager.getDocumentSymbols(uri);
  }

  async getCodeActions(uri: string, range: { start: Position; end: Position }): Promise<CodeAction[]> {
    return this.manager.getCodeActions(uri, range);
  }

  async formatDocument(uri: string, options?: { tabSize: number; insertSpaces: boolean }): Promise<TextEdit[]> {
    return this.manager.formatDocument(uri, options || { tabSize: 2, insertSpaces: true });
  }

  async rename(uri: string, position: Position, newName: string): Promise<Record<string, TextEdit[]>> {
    return this.manager.rename(uri, position, newName);
  }

  getManager(): LSPClientManager {
    return this.manager;
  }

  async shutdown(): Promise<void> {
    await this.manager.stopAll();
    this.initialized = false;
  }
}

export const globalLSPIntegration = new LSPIntegration();

export function createLSPIntegration(config?: LSPIntegrationConfig): LSPIntegration {
  return new LSPIntegration(config);
}

export const LSP_VERSION = '1.0.0';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  'typescript',
  'javascript',
  'python',
  'rust',
  'go',
  'java',
  'csharp',
];

export const LANGUAGE_COUNT = 7;
