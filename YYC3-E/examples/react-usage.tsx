/**
 * @file React 集成示例
 * @description 展示如何在 React 应用中使用 Claw Web UI
 * @module examples
 * @author YYC
 */

import React from 'react'
import { ClawProvider, ClawChat, useClaw } from '@claw-ai/web-ui'
import type { WebUIConfig } from '@claw-ai/web-ui'

/**
 * 示例 1: 基础聊天应用
 */
function BasicChatApp() {
  const config: WebUIConfig = {
    auth: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
      },
      ollama: {
        baseUrl: 'http://localhost:11434',
      },
    },
    ui: {
      theme: 'system',
      showSkills: true,
    },
  }

  return (
    <ClawProvider config={config}>
      <div className="h-screen flex flex-col">
        <header className="p-4 border-b">
          <h1 className="text-xl font-bold">Claw AI Chat</h1>
        </header>
        <main className="flex-1 overflow-hidden">
          <ClawChat 
            className="h-full"
            placeholder="输入消息开始对话..."
            showProvider={true}
          />
        </main>
      </div>
    </ClawProvider>
  )
}

/**
 * 示例 2: 自定义聊天组件
 */
function CustomChatApp() {
  const config: WebUIConfig = {
    auth: {
      provider: 'ollama',
      ollama: {
        baseUrl: 'http://localhost:11434',
      },
    },
  }

  return (
    <ClawProvider config={config}>
      <CustomChatUI />
    </ClawProvider>
  )
}

function CustomChatUI() {
  const { auth, skills } = useClaw()
  
  const handleCustomAction = async () => {
    const availableSkills = skills.getAll()
    console.log('可用技能:', availableSkills)
  }

  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r p-4">
        <h2 className="font-semibold mb-4">技能列表</h2>
        <button onClick={handleCustomAction}>
          查看技能
        </button>
      </aside>
      <main className="flex-1">
        <ClawChat className="h-full" />
      </main>
    </div>
  )
}

/**
 * 示例 3: 嵌入式聊天窗口
 */
function EmbeddedChatWidget() {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <div className="fixed bottom-4 right-4">
      {isOpen ? (
        <div className="w-96 h-[500px] border rounded-lg shadow-lg overflow-hidden bg-white">
          <div className="flex justify-between items-center p-2 border-b bg-gray-50">
            <span className="font-medium">AI 助手</span>
            <button onClick={() => setIsOpen(false)}>✕</button>
          </div>
          <ClawChat className="h-[calc(100%-40px)]" />
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="w-12 h-12 rounded-full bg-primary text-white shadow-lg"
        >
          💬
        </button>
      )}
    </div>
  )
}

export { BasicChatApp, CustomChatApp, EmbeddedChatWidget }
