// tests/setup.ts

import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// ✅ 设置全局编码器（兼容 Node 环境）
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// ✅ mock 浏览器 API
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

(global as any).ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

(global as any).IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// ✅ 设置 Jest 超时
jest.setTimeout(30000);

// ✅ 全局清理逻辑
beforeEach(() => {
  jest.clearAllMocks();
});
