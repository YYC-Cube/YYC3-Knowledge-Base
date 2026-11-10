# YYC3 P0-架构-类型定义

## 文档信息

| 字段 | 内容 |
|------|------|
| @file | P0-核心架构/YYC3-P0-架构-类型定义.md |
| @description | TypeScript 类型定义，包含核心数据模型和接口 |
| @author | YanYuCloudCube Team <admin@0379.email> |
| @version | v1.0.0 |
| @status | stable |
| @tags | P0,architecture,typescript,types |

---

## 类型系统设计原则

1. **类型安全**：充分利用 TypeScript 类型系统
2. **可复用性**：使用泛型和工具类型提高复用性
3. **可扩展性**：使用接口和类型继承
4. **一致性**：统一命名和结构规范
5. **文档化**：为复杂类型添加 JSDoc 注释

---

## 核心类型定义

### 1. 应用配置类型

```typescript
export type Environment = 'development' | 'staging' | 'production';

export interface AppConfig {
  appName: string;
  appVersion: string;
  environment: Environment;
  apiBaseUrl: string;
  wsUrl: string;
  debugMode: boolean;
  defaultLanguage: string;
  supportedLanguages: string[];
}
```

### 2. 用户类型

```typescript
export type UserRole = 'admin' | 'user' | 'guest';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'deleted';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: number;
  updatedAt: number;
  lastLoginAt?: number;
}

export interface AuthUser extends User {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: number;
}
```

### 3. 项目类型

```typescript
export type ProjectStatus = 'draft' | 'active' | 'archived' | 'deleted';
export type ProjectVisibility = 'private' | 'public' | 'shared';

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  settings: ProjectSettings;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectSettings {
  autoSave: boolean;
  autoSaveInterval: number;
  defaultEditor: 'richtext' | 'code' | 'markdown';
  enableCollaboration: boolean;
  enableVersionControl: boolean;
  theme: 'light' | 'dark' | 'auto';
}
```

### 4. 编辑器类型

```typescript
export type EditorType = 'richtext' | 'code' | 'markdown';

export interface EditorState {
  type: EditorType;
  content: string;
  isDirty: boolean;
  cursorPosition: { line: number; column: number };
  selection?: { start: number; end: number };
  readOnly: boolean;
}

export interface EditorConfig {
  type: EditorType;
  language?: string;
  theme?: string;
  fontSize?: number;
  showLineNumbers?: boolean;
  enableAutocomplete?: boolean;
  enableSyntaxHighlight?: boolean;
  tabSize?: number;
}
```

### 5. 布局类型

```typescript
export type PanelType = 'editor' | 'preview' | 'terminal' | 'explorer' | 'search' | 'git';

export interface Panel {
  id: string;
  type: PanelType;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  minSize?: { width: number; height: number };
  resizable?: boolean;
  draggable?: boolean;
  closable?: boolean;
  minimized?: boolean;
  maximized?: boolean;
  zIndex?: number;
}

export interface LayoutConfig {
  panels: Panel[];
  layout: 'grid' | 'flex' | 'absolute';
  theme: 'light' | 'dark';
  showGridLines?: boolean;
  snapToGrid?: boolean;
  gridSize?: number;
}
```

### 6. AI 类型

```typescript
export type AIProvider = 'openai' | 'anthropic' | 'zhipu' | 'baidu' | 'aliyun' | 'ollama';
export type AIMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  maxContextLength: number;
  supportsStreaming: boolean;
  pricePer1KTokens?: number;
}

export interface AIMessage {
  id: string;
  role: AIMessageRole;
  content: string;
  toolCalls?: any[];
  timestamp: number;
}

export interface AIRequestConfig {
  provider: AIProvider;
  model: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  stopSequences?: string[];
}

export interface AIResponse {
  id: string;
  provider: AIProvider;
  model: string;
  content: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  finishReason?: string;
  timestamp: number;
}
```

### 7. 协作类型

```typescript
export interface Collaborator {
  userId: string;
  username: string;
  avatar?: string;
  cursor?: { line: number; column: number };
  selection?: { start: number; end: number };
  color: string;
  online: boolean;
}

export interface CollaborationState {
  documentId: string;
  collaborators: Collaborator[];
  connected: boolean;
  syncStatus: 'synced' | 'syncing' | 'conflict';
}
```

### 8. 存储类型

```typescript
export interface Note {
  id: string;
  title: string;
  content: string;
  encryptedContent?: string;
  tags?: string[];
  isEncrypted: boolean;
  syncStatus: 'synced' | 'pending' | 'conflict';
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface FileRecord {
  id: string;
  name: string;
  path: string;
  content: string;
  size: number;
  type: string;
  createdAt: number;
  updatedAt: number;
}

export interface SyncRecord {
  id: string;
  entityType: 'note' | 'project' | 'file';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  timestamp: number;
  status: 'pending' | 'success' | 'failed';
  errorMessage?: string;
}
```

---

## 工具类型

```typescript
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
export type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] };
export type DeepReadonly<T> = { readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P] };
```

## 验收标准

- 所有核心类型都已定义
- 类型定义准确完整
- JSDoc 注释完整
- 避免使用 any 类型
- 类型组织清晰合理
