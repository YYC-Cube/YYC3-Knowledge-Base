# YYC3 P0-架构-宿主机桥接

## 文档信息

| 字段 | 内容 |
|------|------|
| @file | P0-核心架构/YYC3-P0-架构-宿主机桥接.md |
| @description | 宿主机桥接层实现 - Tauri 原生能力封装 |
| @author | YanYuCloudCube Team <admin@0379.email> |
| @version | v1.0.0 |
| @status | stable |
| @tags | P0,architecture,host-bridge,tauri |

---

## 阶段目标

实现统一的宿主机原生能力桥接层，封装文件系统、对话框、系统通知等原生 API，提供 Promise-based、Type-safe 的接口。

---

## 1. 文件系统 API

```typescript
// packages/core/src/bridge/host.ts
import { invoke } from '@tauri-apps/api/tauri';
import { readTextFile, writeFile, readDir, createDir, removeDir, removeFile, renameFile, exists, BaseDirectory } from '@tauri-apps/api/fs';
import { open } from '@tauri-apps/api/dialog';

export interface FileMetadata {
  path: string;
  name: string;
  size: number;
  modified: number;
  isFile: boolean;
  isDir: boolean;
}

export interface FileWatcherEvent {
  path: string;
  type: 'created' | 'modified' | 'deleted';
  timestamp: number;
}

export const HostBridge = {
  async pickAndReadFile(): Promise<{ path: string; content: string }> {
    const path = await open({ multiple: false, directory: false,
      filters: [{ name: 'Text Files', extensions: ['txt','md','json','ts','tsx','js','jsx'] },
                { name: 'All Files', extensions: ['*'] }] });
    if (!path) throw new Error('User cancelled');
    const content = await readTextFile(path as string);
    return { path: path as string, content };
  },

  async readFile(path: string): Promise<string> { return readTextFile(path); },

  async writeFile(filename: string, data: Uint8Array | string): Promise<string> {
    const savePath = await invoke('save_dialog', { defaultPath: filename });
    if (!savePath) throw new Error('User cancelled');
    await writeFile(savePath as string, data, { directory: BaseDirectory.Desktop });
    return savePath as string;
  },

  async readDir(path: string): Promise<FileMetadata[]> {
    const entries = await readDir(path, { dir: BaseDirectory.Desktop, recursive: false });
    return entries.map(e => ({
      path: `${path}/${e.name}`, name: e.name || '',
      size: 0, modified: 0,
      isFile: !e.children, isDir: !!e.children,
    }));
  },

  async createDir(path: string): Promise<void> { await createDir(path, { dir: BaseDirectory.Desktop, recursive: true }); },
  async removeDir(path: string): Promise<void> { await removeDir(path, { dir: BaseDirectory.Desktop, recursive: true }); },
  async removeFile(path: string): Promise<void> { await removeFile(path, { dir: BaseDirectory.Desktop }); },
  async renameFile(old: string, newP: string): Promise<void> { await renameFile(old, newP, { dir: BaseDirectory.Desktop }); },
  async fileExists(path: string): Promise<boolean> { return exists(path, { dir: BaseDirectory.Desktop }); },

  async watchFile(path: string, callback: (e: FileWatcherEvent) => void) {
    const unwatch = await invoke('watch_file', { path });
    const handle = (event: Event) => callback((event as CustomEvent).detail);
    window.addEventListener('file-watch-event', handle);
    return { unwatch: async () => { await unwatch; window.removeEventListener('file-watch-event', handle); } };
  },
} as const;
```

## 2. 对话框 API

```typescript
// packages/core/src/bridge/dialog.ts
import { open, save } from '@tauri-apps/api/dialog';

export interface DialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  multiple?: boolean;
  directory?: boolean;
}

export const DialogBridge = {
  async openFile(opts: DialogOptions = {}) {
    const path = await open({ ...opts, multiple: opts.multiple || false, directory: opts.directory || false });
    return { path: (path as string) || null, paths: Array.isArray(path) ? path : null };
  },
  async saveFile(opts: DialogOptions = {}) {
    return (await save(opts)) as string || null;
  },
  async selectDirectory(opts: DialogOptions = {}) {
    return (await open({ ...opts, directory: true })) as string || null;
  },
} as const;
```

## 3. 通知 API

```typescript
// packages/core/src/bridge/notification.ts
import { invoke } from '@tauri-apps/api/tauri';

export const NotificationBridge = {
  async send(opts: { title: string; body: string; icon?: string }) {
    await invoke('send_notification', opts);
  },
  async success(msg: string) { await this.send({ title: '成功', body: msg }); },
  async error(msg: string) { await this.send({ title: '错误', body: msg }); },
  async warning(msg: string) { await this.send({ title: '警告', body: msg }); },
  async info(msg: string) { await this.send({ title: '信息', body: msg }); },
} as const;
```

## 4. 系统 API

```typescript
// packages/core/src/bridge/system.ts
import { invoke } from '@tauri-apps/api/tauri';

export interface SystemInfo { os: string; arch: string; version: string; hostname: string; }
export interface ProcessInfo { pid: number; name: string; cpu: number; memory: number; }

export const SystemBridge = {
  async getSystemInfo(): Promise<SystemInfo> { return invoke('get_system_info'); },
  async getProcessInfo(): Promise<ProcessInfo> { return invoke('get_process_info'); },
  async execCommand(cmd: string, args: string[] = []): Promise<string> { return invoke('exec_command', { command: cmd, args }); },
  async openUrl(url: string): Promise<void> { await invoke('open_url', { url }); },
  async readClipboard(): Promise<string> { return invoke('read_clipboard'); },
  async writeClipboard(text: string): Promise<void> { await invoke('write_clipboard', { text }); },
} as const;
```

## 5. Rust 后端实现

```rust
// src-tauri/src/main.rs
#[tauri::command]
fn send_notification(title: String, body: String) -> Result<(), String> { Ok(()) }

#[tauri::command]
fn get_system_info() -> Result<SystemInfo, String> { /* ... */ }

#[tauri::command]
fn exec_command(command: String, args: Vec<String>) -> Result<String, String> { /* ... */ }

#[tauri::command]
fn open_url(url: String) -> Result<(), String> { /* ... */ }

#[tauri::command]
fn read_clipboard() -> Result<String, String> { /* ... */ }

#[tauri::command]
fn write_clipboard(text: String) -> Result<(), String> { /* ... */ }

#[tauri::command]
fn watch_file(path: String) -> Result<String, String> { /* ... */ }

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            send_notification, get_system_info, exec_command,
            open_url, read_clipboard, write_clipboard, watch_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## 验收标准

- 文件系统 API 正常工作
- 对话框 API 正常工作
- 通知 API 正常工作
- 系统 API 正常工作
- Tauri 权限配置正确（最小权限原则）
- 无 TypeScript 编译错误
