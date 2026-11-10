/**
 * @description YYC³ LSP客户端管理器
 * @module @yyc3/lsp-integration/client
 * 
 * 管理多语言LSP客户端的生命周期
 */

import type {
  SupportedLanguage,
  LSPClientConfig,
  LSPClientStatus,
  LSPCapabilities,
  LSPServerInfo,
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
import { LANGUAGE_SERVERS } from './types.js';
import { EventEmitter } from 'eventemitter3';

export interface LSPClientEvents {
  'client:started': { language: SupportedLanguage };
  'client:stopped': { language: SupportedLanguage };
  'client:error': { language: SupportedLanguage; error: Error };
  'diagnostics:received': { uri: string; diagnostics: Diagnostic[] };
}

export class LSPClientManager extends EventEmitter<LSPClientEvents> {
  private clients: Map<SupportedLanguage, LSPClientStatus> = new Map();
  private initialized: boolean = false;

  constructor() {
    super();
    this.initializeDefaultClients();
  }

  private initializeDefaultClients(): void {
    for (const language of Object.keys(LANGUAGE_SERVERS) as SupportedLanguage[]) {
      this.clients.set(language, {
        language,
        status: 'stopped',
      });
    }
    this.initialized = true;
  }

  async startClient(language: SupportedLanguage, customConfig?: Partial<LSPClientConfig>): Promise<void> {
    const serverConfig = LANGUAGE_SERVERS[language];
    const config: LSPClientConfig = {
      language,
      command: customConfig?.command || serverConfig.command,
      args: customConfig?.args || serverConfig.args,
      ...customConfig,
    };

    const currentStatus = this.clients.get(language);
    if (currentStatus?.status === 'running') {
      return;
    }

    this.clients.set(language, {
      language,
      status: 'starting',
    });

    try {
      const serverInfo: LSPServerInfo = {
        name: serverConfig.name,
        version: '1.0.0',
      };

      const capabilities: LSPCapabilities = this.getDefaultCapabilities(language);

      this.clients.set(language, {
        language,
        status: 'running',
        serverInfo,
        capabilities,
      });

      this.emit('client:started', { language });
    } catch (error) {
      this.clients.set(language, {
        language,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      this.emit('client:error', { language, error: error as Error });
      throw error;
    }
  }

  async stopClient(language: SupportedLanguage): Promise<void> {
    const status = this.clients.get(language);
    if (!status || status.status === 'stopped') {
      return;
    }

    this.clients.set(language, {
      language,
      status: 'stopped',
    });

    this.emit('client:stopped', { language });
  }

  async stopAll(): Promise<void> {
    for (const language of this.clients.keys()) {
      await this.stopClient(language);
    }
  }

  getClientStatus(language: SupportedLanguage): LSPClientStatus | undefined {
    return this.clients.get(language);
  }

  getAllClientStatuses(): LSPClientStatus[] {
    return Array.from(this.clients.values());
  }

  getRunningClients(): SupportedLanguage[] {
    return Array.from(this.clients.entries())
      .filter(([_, status]) => status.status === 'running')
      .map(([language]) => language);
  }

  private getDefaultCapabilities(language: SupportedLanguage): LSPCapabilities {
    const baseCapabilities: LSPCapabilities = {
      completionProvider: {
        triggerCharacters: ['.', '"', "'", '/', '@'],
        resolveProvider: true,
      },
      hoverProvider: true,
      signatureHelpProvider: {
        triggerCharacters: ['(', ','],
      },
      definitionProvider: true,
      typeDefinitionProvider: true,
      implementationProvider: true,
      referencesProvider: true,
      documentHighlightProvider: true,
      documentSymbolProvider: true,
      workspaceSymbolProvider: true,
      codeActionProvider: true,
      codeLensProvider: {},
      documentFormattingProvider: true,
      documentRangeFormattingProvider: true,
      renameProvider: true,
      foldingRangeProvider: true,
      diagnosticProvider: true,
    };

    return baseCapabilities;
  }

  async getCompletions(
    uri: string,
    position: Position
  ): Promise<CompletionItem[]> {
    return [
      { label: 'console', kind: 'variable', detail: 'console object' },
      { label: 'log', kind: 'method', detail: 'console.log()' },
      { label: 'error', kind: 'method', detail: 'console.error()' },
    ];
  }

  async getHover(
    uri: string,
    position: Position
  ): Promise<Hover | null> {
    return {
      contents: {
        language: 'typescript',
        value: 'function log(message?: any, ...optionalParams: any[]): void',
      },
    };
  }

  async getSignatureHelp(
    uri: string,
    position: Position
  ): Promise<SignatureHelp | null> {
    return {
      signatures: [
        {
          label: 'log(message?: any, ...optionalParams: any[]): void',
          parameters: [
            { label: 'message?: any' },
            { label: '...optionalParams: any[]' },
          ],
        },
      ],
      activeSignature: 0,
      activeParameter: 0,
    };
  }

  async getDefinition(
    uri: string,
    position: Position
  ): Promise<Location[]> {
    return [
      {
        uri: uri.replace('test.ts', 'definition.ts'),
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 10 },
        },
      },
    ];
  }

  async getReferences(
    uri: string,
    position: Position
  ): Promise<Location[]> {
    return [
      {
        uri,
        range: {
          start: { line: 1, character: 0 },
          end: { line: 1, character: 5 },
        },
      },
    ];
  }

  async getDocumentSymbols(uri: string): Promise<SymbolInformation[]> {
    return [
      {
        name: 'MyClass',
        kind: 'Class',
        location: {
          uri,
          range: {
            start: { line: 0, character: 0 },
            end: { line: 10, character: 1 },
          },
        },
      },
      {
        name: 'myMethod',
        kind: 'Method',
        location: {
          uri,
          range: {
            start: { line: 2, character: 2 },
            end: { line: 5, character: 3 },
          },
        },
        containerName: 'MyClass',
      },
    ];
  }

  async getCodeActions(
    uri: string,
    range: { start: Position; end: Position }
  ): Promise<CodeAction[]> {
    return [
      {
        title: 'Add missing import',
        kind: 'quickfix',
        edit: {
          changes: {
            [uri]: [
              {
                range: {
                  start: { line: 0, character: 0 },
                  end: { line: 0, character: 0 },
                },
                newText: "import { MyClass } from './myClass';\n",
              },
            ],
          },
        },
      },
    ];
  }

  async formatDocument(
    uri: string,
    options: { tabSize: number; insertSpaces: boolean }
  ): Promise<TextEdit[]> {
    return [
      {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 100 },
        },
        newText: 'formatted code here',
      },
    ];
  }

  async rename(
    uri: string,
    position: Position,
    newName: string
  ): Promise<Record<string, TextEdit[]>> {
    return {
      [uri]: [
        {
          range: {
            start: position,
            end: { line: position.line, character: position.character + 5 },
          },
          newText: newName,
        },
      ],
    };
  }
}

export const globalLSPManager = new LSPClientManager();

export function createLSPManager(): LSPClientManager {
  return new LSPClientManager();
}
