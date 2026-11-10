/**
 * @file: useFileStoreZustand.test.ts
 * @description: 文件系统增强功能测试用例
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useFileStoreZustand } from '../stores/useFileStoreZustand';

describe('FileStore - Enhanced File Operations', () => {
  beforeEach(() => {
    const store = useFileStoreZustand.getState();
    act(() => {
      store.initializeProject({
        'src/app/App.tsx': 'export default function App() { return <div>App</div> }',
        'src/app/components/Button.tsx': 'export const Button = () => <button>Click</button>',
        'src/utils/helpers.ts': 'export const helper = () => {}',
        'src/styles/main.css': 'body { margin: 0; }',
        'README.md': '# Project',
      });
    });
  });

  describe('moveFile', () => {
    it('should move a file to a new location', () => {
      const store = useFileStoreZustand.getState();
      act(() => {
        store.moveFile('src/app/App.tsx', 'src/pages/App.tsx');
      });

      const newState = useFileStoreZustand.getState();
      expect(newState.fileContents['src/pages/App.tsx']).toBeDefined();
      expect(newState.fileContents['src/app/App.tsx']).toBeUndefined();
    });

    it('should fail if source file does not exist', () => {
      const store = useFileStoreZustand.getState();
      const result = store.moveFile('nonexistent.ts', 'new.ts');

      expect(result).toBe(false);
    });

    it('should fail if target file already exists', () => {
      const store = useFileStoreZustand.getState();
      const result = store.moveFile('src/app/App.tsx', 'README.md');

      expect(result).toBe(false);
    });

    it('should update open tabs when moving a file', () => {
      const store = useFileStoreZustand.getState();
      act(() => {
        store.openFile('src/app/App.tsx');
      });

      act(() => {
        store.moveFile('src/app/App.tsx', 'src/pages/App.tsx');
      });

      const newState = useFileStoreZustand.getState();
      expect(newState.openTabs.find((t: { path: string }) => t.path === 'src/pages/App.tsx')).toBeDefined();
      expect(newState.openTabs.find((t: { path: string }) => t.path === 'src/app/App.tsx')).toBeUndefined();
    });

    it('should update active file when moving the active file', () => {
      const store = useFileStoreZustand.getState();
      act(() => {
        store.setActiveFile('src/app/App.tsx');
      });

      act(() => {
        store.moveFile('src/app/App.tsx', 'src/pages/App.tsx');
      });

      const newState = useFileStoreZustand.getState();
      expect(newState.activeFile).toBe('src/pages/App.tsx');
    });

    it('should add git changes for moved file', () => {
      const store = useFileStoreZustand.getState();
      act(() => {
        store.moveFile('src/app/App.tsx', 'src/pages/App.tsx');
      });

      const newState = useFileStoreZustand.getState();
      const deletedChange = newState.gitChanges.find((c: { path: string }) => c.path === 'src/app/App.tsx');
      const addedChange = newState.gitChanges.find((c: { path: string }) => c.path === 'src/pages/App.tsx');

      expect(deletedChange?.status).toBe('deleted');
      expect(addedChange?.status).toBe('added');
    });
  });

  describe('copyFile', () => {
    it('should copy a file to a new location', () => {
      const store = useFileStoreZustand.getState();
      const result = store.copyFile('src/app/App.tsx', 'src/app/AppCopy.tsx');

      expect(result).toBe(true);

      const newState = useFileStoreZustand.getState();
      expect(newState.fileContents['src/app/AppCopy.tsx']).toBeDefined();
      expect(newState.fileContents['src/app/App.tsx']).toBeDefined();
    });

    it('should preserve original file content', () => {
      const store = useFileStoreZustand.getState();
      const originalContent = store.fileContents['src/app/App.tsx'];

      act(() => {
        store.copyFile('src/app/App.tsx', 'src/app/AppCopy.tsx');
      });

      const newState = useFileStoreZustand.getState();
      expect(newState.fileContents['src/app/AppCopy.tsx']).toBe(originalContent);
    });

    it('should fail if source file does not exist', () => {
      const store = useFileStoreZustand.getState();
      const result = store.copyFile('nonexistent.ts', 'new.ts');

      expect(result).toBe(false);
    });

    it('should fail if target file already exists', () => {
      const store = useFileStoreZustand.getState();
      const result = store.copyFile('src/app/App.tsx', 'README.md');

      expect(result).toBe(false);
    });

    it('should add git change for copied file', () => {
      const store = useFileStoreZustand.getState();
      act(() => {
        store.copyFile('src/app/App.tsx', 'src/app/AppCopy.tsx');
      });

      const newState = useFileStoreZustand.getState();
      const addedChange = newState.gitChanges.find((c: { path: string }) => c.path === 'src/app/AppCopy.tsx');
      expect(addedChange?.status).toBe('added');
    });
  });

  describe('moveFolder', () => {
    it('should move all files in a folder', () => {
      const store = useFileStoreZustand.getState();
      const result = store.moveFolder('src/app', 'src/pages');

      expect(result).toBe(true);

      const newState = useFileStoreZustand.getState();
      expect(newState.fileContents['src/pages/App.tsx']).toBeDefined();
      expect(newState.fileContents['src/pages/components/Button.tsx']).toBeDefined();
      expect(newState.fileContents['src/app/App.tsx']).toBeUndefined();
    });

    it('should fail if folder does not exist', () => {
      const store = useFileStoreZustand.getState();
      const result = store.moveFolder('nonexistent', 'new');

      expect(result).toBe(false);
    });
  });

  describe('duplicateFile', () => {
    it('should create a copy with -copy suffix', () => {
      const store = useFileStoreZustand.getState();
      const newPath = store.duplicateFile('src/app/App.tsx');

      expect(newPath).toBe('src/app/App-copy.tsx');

      const newState = useFileStoreZustand.getState();
      expect(newState.fileContents['src/app/App-copy.tsx']).toBeDefined();
    });

    it('should increment suffix if copy already exists', () => {
      const store = useFileStoreZustand.getState();
      act(() => {
        store.duplicateFile('src/app/App.tsx');
      });
      const newPath = store.duplicateFile('src/app/App.tsx');

      expect(newPath).toBe('src/app/App-copy-1.tsx');
    });

    it('should return null if file does not exist', () => {
      const store = useFileStoreZustand.getState();
      const result = store.duplicateFile('nonexistent.ts');

      expect(result).toBeNull();
    });
  });
});
