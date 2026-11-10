/**
 * @description YYC³ 多语言LSP集成层类型定义
 * @module @yyc3/lsp-integration/types
 * 
 * 支持7种编程语言的LSP客户端
 */

export type SupportedLanguage = 
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'rust'
  | 'go'
  | 'java'
  | 'csharp';

export interface LSPClientConfig {
  language: SupportedLanguage;
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  initializationOptions?: Record<string, unknown>;
}

export interface LSPCapabilities {
  completionProvider?: {
    triggerCharacters?: string[];
    resolveProvider?: boolean;
  };
  hoverProvider?: boolean;
  signatureHelpProvider?: {
    triggerCharacters?: string[];
  };
  definitionProvider?: boolean;
  typeDefinitionProvider?: boolean;
  implementationProvider?: boolean;
  referencesProvider?: boolean;
  documentHighlightProvider?: boolean;
  documentSymbolProvider?: boolean;
  workspaceSymbolProvider?: boolean;
  codeActionProvider?: boolean;
  codeLensProvider?: boolean;
  documentFormattingProvider?: boolean;
  documentRangeFormattingProvider?: boolean;
  renameProvider?: boolean;
  foldingRangeProvider?: boolean;
  diagnosticProvider?: boolean;
}

export interface LSPServerInfo {
  name: string;
  version?: string;
}

export interface LSPClientStatus {
  language: SupportedLanguage;
  status: 'stopped' | 'starting' | 'running' | 'error';
  serverInfo?: LSPServerInfo;
  capabilities?: LSPCapabilities;
  error?: string;
}

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Location {
  uri: string;
  range: Range;
}

export interface Diagnostic {
  range: Range;
  severity: 'error' | 'warning' | 'information' | 'hint';
  code?: string | number;
  source?: string;
  message: string;
  relatedInformation?: DiagnosticRelatedInformation[];
}

export interface DiagnosticRelatedInformation {
  location: Location;
  message: string;
}

export interface CompletionItem {
  label: string;
  kind: CompletionItemKind;
  detail?: string;
  documentation?: string;
  insertText?: string;
  sortText?: string;
  filterText?: string;
}

export type CompletionItemKind =
  | 'text'
  | 'method'
  | 'function'
  | 'constructor'
  | 'field'
  | 'variable'
  | 'class'
  | 'interface'
  | 'module'
  | 'property'
  | 'unit'
  | 'value'
  | 'enum'
  | 'keyword'
  | 'snippet'
  | 'color'
  | 'file'
  | 'reference'
  | 'folder'
  | 'enumMember'
  | 'constant'
  | 'struct'
  | 'event'
  | 'operator'
  | 'typeParameter';

export interface Hover {
  contents: string | MarkedString | MarkedString[];
  range?: Range;
}

export interface MarkedString {
  language: string;
  value: string;
}

export interface SignatureHelp {
  signatures: SignatureInformation[];
  activeSignature?: number;
  activeParameter?: number;
}

export interface SignatureInformation {
  label: string;
  documentation?: string;
  parameters?: ParameterInformation[];
}

export interface ParameterInformation {
  label: string;
  documentation?: string;
}

export interface SymbolInformation {
  name: string;
  kind: SymbolKind;
  location: Location;
  containerName?: string;
}

export type SymbolKind =
  | 'File'
  | 'Module'
  | 'Namespace'
  | 'Package'
  | 'Class'
  | 'Method'
  | 'Property'
  | 'Field'
  | 'Constructor'
  | 'Enum'
  | 'Interface'
  | 'Function'
  | 'Variable'
  | 'Constant'
  | 'String'
  | 'Number'
  | 'Boolean'
  | 'Array'
  | 'Object'
  | 'Key'
  | 'Null'
  | 'EnumMember'
  | 'Struct'
  | 'Event'
  | 'Operator'
  | 'TypeParameter';

export interface CodeAction {
  title: string;
  kind?: CodeActionKind;
  diagnostics?: Diagnostic[];
  edit?: WorkspaceEdit;
  command?: Command;
}

export type CodeActionKind =
  | 'quickfix'
  | 'refactor'
  | 'refactor.extract'
  | 'refactor.inline'
  | 'refactor.rewrite'
  | 'source'
  | 'source.organizeImports';

export interface WorkspaceEdit {
  changes?: Record<string, TextEdit[]>;
  documentChanges?: TextDocumentEdit[];
}

export interface TextEdit {
  range: Range;
  newText: string;
}

export interface TextDocumentEdit {
  textDocument: { uri: string; version: number };
  edits: TextEdit[];
}

export interface Command {
  title: string;
  command: string;
  arguments?: unknown[];
}

export interface TextDocumentIdentifier {
  uri: string;
}

export interface TextDocumentPositionParams {
  textDocument: TextDocumentIdentifier;
  position: Position;
}

export const LANGUAGE_SERVERS: Record<SupportedLanguage, { name: string; command: string; args?: string[] }> = {
  typescript: {
    name: 'typescript-language-server',
    command: 'typescript-language-server',
    args: ['--stdio'],
  },
  javascript: {
    name: 'typescript-language-server',
    command: 'typescript-language-server',
    args: ['--stdio'],
  },
  python: {
    name: 'pyright',
    command: 'pyright-langserver',
    args: ['--stdio'],
  },
  rust: {
    name: 'rust-analyzer',
    command: 'rust-analyzer',
  },
  go: {
    name: 'gopls',
    command: 'gopls',
  },
  java: {
    name: 'jdtls',
    command: 'jdtls',
  },
  csharp: {
    name: 'omnisharp',
    command: 'omnisharp',
    args: ['-lsp'],
  },
};

export const LANGUAGE_EXTENSIONS: Record<SupportedLanguage, string[]> = {
  typescript: ['.ts', '.tsx', '.mts', '.cts'],
  javascript: ['.js', '.jsx', '.mjs', '.cjs'],
  python: ['.py', '.pyi', '.pyw'],
  rust: ['.rs'],
  go: ['.go'],
  java: ['.java'],
  csharp: ['.cs'],
};

export function detectLanguage(filePath: string): SupportedLanguage | null {
  const ext = filePath.substring(filePath.lastIndexOf('.'));
  for (const [lang, extensions] of Object.entries(LANGUAGE_EXTENSIONS)) {
    if (extensions.includes(ext)) {
      return lang as SupportedLanguage;
    }
  }
  return null;
}
