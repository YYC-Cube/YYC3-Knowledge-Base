/**
 * @file: shims.d.ts
 * @description: IDE 标准规范类型声明 — 解决第三方库类型兼容性问题
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.2.0
 * @created: 2026-06-03
 * @updated: 2026-06-03
 * @status: stable
 * @license: MIT
 */

// ================================================================
// idb (IndexedDB wrapper with convenience methods)
// ================================================================

declare module 'idb' {
  interface IDBPDatabase<T = IDBDatabase> {
    name: string;
    objectStoreNames: DOMStringList;
    version: number;
    close(): void;
    transaction(storeNames: string | readonly string[], mode?: IDBTransactionMode, options?: IDBTransactionOptions): IDBPTransaction<T>;
    createObjectStore(name: string, optionalParameters?: IDBObjectStoreParameters): IDBPObjectStore<T>;
    deleteObjectStore(name: string): void;
    get<TResult = any>(storeName: string, query: IDBValidKey | IDBKeyRange): Promise<TResult | undefined>;
    getAll<TResult = any>(storeName: string, query?: IDBValidKey | IDBKeyRange, count?: number): Promise<TResult[]>;
    getAllFromIndex<TResult = any>(storeName: string, indexName: string, query?: IDBValidKey | IDBKeyRange, count?: number): Promise<TResult[]>;
    getAllKeysFromIndex(storeName: string, indexName: string, query?: IDBValidKey | IDBKeyRange, count?: number): Promise<IDBValidKey[]>;
    put(storeName: string, value: any, key?: IDBValidKey): Promise<IDBValidKey>;
    add(storeName: string, value: any, key?: IDBValidKey): Promise<IDBValidKey>;
    delete(storeName: string, key: IDBValidKey | IDBKeyRange): Promise<void>;
    clear(storeName: string): Promise<void>;
    count(storeName: string, query?: IDBValidKey | IDBKeyRange): Promise<number>;
  }

  interface IDBPTransaction<T = IDBDatabase> {
    objectStore(name: string): IDBPObjectStore<T>;
    store: IDBPObjectStore<T>;
    done: Promise<void>;
    abort(): void;
    commit(): void;
    error: DOMException | null;
    mode: IDBTransactionMode;
    db: T;
  }

  interface IDBPObjectStore<T = IDBDatabase> {
    name: string;
    keyPath: string | string[];
    indexNames: DOMStringList;
    autoIncrement: boolean;
    get(query: IDBValidKey | IDBKeyRange): Promise<any>;
    getAll(query?: IDBValidKey | IDBKeyRange, count?: number): Promise<any[]>;
    count(query?: IDBValidKey | IDBKeyRange): Promise<number>;
    put(value: any, key?: IDBValidKey): Promise<IDBValidKey>;
    add(value: any, key?: IDBValidKey): Promise<IDBValidKey>;
    delete(query: IDBValidKey | IDBKeyRange): Promise<void>;
    clear(): Promise<void>;
    createIndex(name: string, keyPath: string | string[], options?: IDBIndexParameters): IDBIndex;
    index(name: string): IDBIndex;
    deleteIndex(name: string): void;
  }

  interface OpenDBCallbacks {
    upgrade(db: IDBPDatabase, oldVersion: number, newVersion: number | null, transaction: IDBPTransaction): void;
  }

  function openDB<T extends IDBDatabase>(name: string, version: number, callbacks?: OpenDBCallbacks): Promise<IDBPDatabase<T>>;
  function deleteDB(name: string, options?: { blocked?: () => void }): Promise<void>;

  export { openDB, deleteDB };
  export type { IDBPDatabase, IDBPTransaction, IDBPObjectStore };
}

// ================================================================
// jszip
// ================================================================

declare module 'jszip' {
  class JSZip {
    files: Record<string, JSZipObject>;
    constructor(data?: ArrayBuffer | string, options?: Record<string, unknown>);
    file(name: string, data?: string | ArrayBuffer | Blob | Uint8Array | unknown, options?: Record<string, unknown>): this;
    folder(name: string): JSZip;
    remove(name: string): this;
    generateAsync(options?: { type?: string; compression?: string; compressionOptions?: Record<string, unknown> }, onUpdate?: (metadata: { percent: number }) => void): Promise<Blob>;
    static loadAsync(data: ArrayBuffer | Blob | File | string, options?: Record<string, unknown>): Promise<JSZip>;
  }

  interface JSZipObject {
    name: string;
    dir: boolean;
    date: Date;
    comment: string;
    async(type: 'arraybuffer'): Promise<ArrayBuffer>;
    async(type: 'base64'): Promise<string>;
    async(type: 'string' | 'text'): Promise<string>;
    async(type: 'uint8array'): Promise<Uint8Array>;
    async(type: 'blob'): Promise<Blob>;
  }

  export default JSZip;
}

// ================================================================
// file-saver
// ================================================================

declare module 'file-saver' {
  function saveAs(data: Blob | File | string, filename?: string, options?: { autoBom?: boolean }): void;
  export { saveAs };
}

// ================================================================
// react-window (v2 compat — match VirtualList actual usage)
// ================================================================

declare module 'react-window' {
  import type { CSSProperties, ReactNode, ComponentType, FC, ReactElement } from 'react';

  interface ListChildComponentProps<T = any> {
    index: number;
    style: CSSProperties;
    data?: T;
    isScrolling?: boolean;
  }

  interface FixedSizeListProps<T = any> {
    height: number | string;
    width: number | string;
    itemCount: number;
    itemSize: number | ((index: number) => number);
    itemData?: T;
    overscanCount?: number;
    className?: string;
    style?: CSSProperties;
    children?: ComponentType<ListChildComponentProps<T>>;
    onScroll?: (props: ScrollDirection) => void;
    onItemsRendered?: (props: ListOnItemsRenderedProps) => void;
    innerElementType?: any;
    outerElementType?: any;
    layout?: 'vertical' | 'horizontal';
    ref?: any;
  }

  interface VariableSizeListProps<T = any> extends Omit<FixedSizeListProps<T>, 'itemSize'> {
    itemSize: (index: number) => number;
  }

  interface ListOnItemsRenderedProps {
    overscanStartIndex: number;
    overscanStopIndex: number;
    visibleStartIndex: number;
    visibleStopIndex: number;
  }

  interface ScrollDirection {
    scrollDirection: 'forward' | 'backward';
    scrollOffset: number;
    scrollUpdateWasRequested: boolean;
  }

  interface RowComponentProps<T = any> {
    index: number;
    style: CSSProperties;
    data?: T;
    [key: string]: any;
  }

  interface RowsRenderedInfo {
    visibleStartIndex: number;
    visibleStopIndex: number;
    startIndex?: number;
    stopIndex?: number;
  }

  interface ScrollToRowOptions {
    index: number;
    align?: 'auto' | 'smart' | 'center' | 'start' | 'end';
  }

  interface ListProps<T = any> {
    height?: number | string;
    width?: number | string;
    itemCount?: number;
    itemSize?: number | ((index: number) => number);
    rowCount?: number;
    rowHeight?: number | ((index: number) => number);
    itemData?: T;
    overscanCount?: number;
    className?: string;
    style?: CSSProperties;
    children?: ComponentType<ListChildComponentProps<T>>;
    listRef?: any;
    rowComponent?: ComponentType<any>;
    rowProps?: Record<string, any>;
    onRowsRendered?: (info: RowsRenderedInfo) => void;
    onScroll?: (props: any) => void;
    innerElementType?: any;
  }

  class FixedSizeList<T = any> extends React.Component<FixedSizeListProps<T>> {
    scrollTo(scrollOffset: number): void;
    scrollToItem(index: number, align?: 'auto' | 'smart' | 'center' | 'start' | 'end'): void;
    resetAfterIndex(index: number, shouldForceUpdate?: boolean): void;
  }

  class VariableSizeList<T = any> extends React.Component<VariableSizeListProps<T>> {
    scrollTo(scrollOffset: number): void;
    scrollToItem(index: number, align?: 'auto' | 'smart' | 'center' | 'start' | 'end'): void;
    resetAfterIndex(index: number, shouldForceUpdate?: boolean): void;
  }

  class List<T = any> extends React.Component<ListProps<T>> {
    scrollTo(scrollOffset: number): void;
    scrollToItem(index: number, align?: 'auto' | 'smart' | 'center' | 'start' | 'end'): void;
    scrollToRow?(options: ScrollToRowOptions): void;
    resetAfterIndex(index: number, shouldForceUpdate?: boolean): void;
  }

  function useListRef<T = any>(initialValue?: T | null): React.MutableRefObject<T | null>;

  export { FixedSizeList, VariableSizeList, List, useListRef };
  export type { ListChildComponentProps, RowComponentProps, RowsRenderedInfo, ScrollToRowOptions, FixedSizeListProps, VariableSizeListProps, ListProps, ListOnItemsRenderedProps };
}

// ================================================================
// Agent 智能体模块 — 完整类型声明
// ================================================================

type _AgentRole = 'planner' | 'coder' | 'tester' | 'reviewer';

declare module 'agent:types' {
  export type AgentRole = _AgentRole;
  export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed';
  export interface AgentTask { id: string; type: string; description: string; priority: 'low' | 'medium' | 'high'; status: AgentStatus; input: any; dependencies: string[]; constraints: any; metadata: any; createdAt: number; }
  export interface AgentResult { taskId: string; agent: AgentRole; status: string; output: Record<string, any>; metrics: any; suggestions?: string[]; }
  export interface AgentContext { projectId: string; sessionId: string; conversationId: string; taskDescription: string; }
  export interface TaskDefinition { id: string; title: string; description: string; type: string; requiredAgent: AgentRole; }
}

declare module 'agent:orchestrator' {
  export class AgentOrchestrator {
    constructor(config?: any);
    initialize(context: any): Promise<void>;
    getState(): any;
    execute(context: any): AsyncIterable<any>;
    cancel(): void;
    reset(): void;
  }
}

declare module 'agent:planner' { export class PlannerAgent { static role: 'planner'; constructor(); initialize(context: any): Promise<void>; execute(task: any): Promise<any>; } }
declare module 'agent:coder' { export class CoderAgent { static role: 'coder'; constructor(); initialize(context: any): Promise<void>; execute(task: any): Promise<any>; } }
declare module 'agent:tester' { export class TesterAgent { static role: 'tester'; constructor(); initialize(context: any): Promise<void>; execute(task: any): Promise<any>; } }
declare module 'agent:reviewer' { export class ReviewerAgent { static role: 'reviewer'; constructor(); initialize(context: any): Promise<void>; execute(task: any): Promise<any>; } }
