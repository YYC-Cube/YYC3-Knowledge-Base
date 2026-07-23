// Jest测试环境配置
const { TextEncoder, TextDecoder } = require("util")

// 设置全局变量
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// 模拟浏览器环境
global.window = {}
global.window.matchMedia = () => ({
  matches: false,
  addListener: () => {},
  removeListener: () => {},
})

// 模拟IntersectionObserver
global.IntersectionObserver = class {
  observe() {}
  disconnect() {}
  unobserve() {}
}

// 模拟ResizeObserver
global.ResizeObserver = class {
  observe() {}
  disconnect() {}
  unobserve() {}
}

// 模拟fetch
global.fetch = () => Promise.resolve({
  ok: true,
  status: 200,
  json: () => Promise.resolve({}),
  text: () => Promise.resolve(""),
})

// 模拟存储
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
}

global.sessionStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
}

// 模拟URL
global.URL = {
  createObjectURL: () => "blob:mock-url",
  revokeObjectURL: () => {},
}

// 设置环境变量
process.env.NODE_ENV = "test"
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"

// 导出工具函数
module.exports = {
  createMockUser: (data = {}) => ({
    id: "test-user-1",
    email: "test@example.com",
    name: "Test User",
    role: "user",
    status: "active",
    ...data,
  }),
  
  createMockError: (message) => new Error(message || "Test error"),
  
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms || 100)),
}
