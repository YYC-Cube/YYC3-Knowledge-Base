/**
 * @file Claw 使用示例
 * @description 展示如何使用 Claw AI 系统
 * @module examples
 * @author YYC
 */

import { UnifiedAuthManager, SkillManager, MCPClient } from '@claw-ai/core'

/**
 * 示例 1: 基础聊天
 */
async function basicChat() {
  const auth = new UnifiedAuthManager()
  
  const providers = await auth.autoDetect()
  console.log('可用提供商:', providers.map(p => p.displayName))
  
  const response = await auth.chat([
    { role: 'user', content: '你好，请介绍一下你自己' }
  ])
  
  console.log('AI 回复:', response.choices[0]?.message?.content)
}

/**
 * 示例 2: 流式聊天
 */
async function streamChat() {
  const auth = new UnifiedAuthManager()
  await auth.autoDetect()
  
  console.log('AI 回复: ')
  for await (const chunk of auth.stream([
    { role: 'user', content: '写一首关于春天的诗' }
  ])) {
    const delta = chunk.choices[0]?.message?.content || ''
    process.stdout.write(delta)
  }
  console.log('\n')
}

/**
 * 示例 3: 技能系统
 */
async function skillSystem() {
  const skills = new SkillManager()
  
  skills.register(
    {
      id: 'custom.code-review',
      name: '代码审查',
      description: '审查代码质量并提供改进建议',
      version: '1.0.0',
      category: 'analysis',
    },
    async (input, context) => {
      return {
        success: true,
        output: { review: '代码质量良好' },
        duration: 100,
      }
    }
  )
  
  const recommended = skills.recommend('审查代码')
  console.log('推荐技能:', recommended.map(s => s.name))
  
  const result = await skills.execute('custom.code-review', { code: '...' }, {
    sessionId: 'test',
    provider: 'openai',
    messages: [],
    variables: {},
    metadata: {},
  })
  
  console.log('执行结果:', result)
}

/**
 * 示例 4: MCP 客户端
 */
async function mcpClient() {
  const client = new MCPClient({
    name: 'claw-example',
    version: '1.0.0',
    transport: {
      type: 'stdio',
      command: 'node',
      args: ['mcp-server.js'],
    },
  })
  
  client.on('connected', () => {
    console.log('MCP 服务器已连接')
  })
  
  client.on('toolCalled', (event) => {
    console.log('工具调用:', event)
  })
  
  await client.connect()
  
  const tools = client.getTools()
  console.log('可用工具:', tools.map(t => t.name))
  
  if (tools.length > 0) {
    const result = await client.callTool(tools[0].name, {})
    console.log('工具结果:', result)
  }
  
  await client.close()
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 Claw AI 使用示例\n')
  
  try {
    console.log('=== 示例 1: 基础聊天 ===')
    await basicChat()
    
    console.log('\n=== 示例 2: 流式聊天 ===')
    await streamChat()
    
    console.log('\n=== 示例 3: 技能系统 ===')
    await skillSystem()
    
    console.log('\n=== 示例 4: MCP 客户端 ===')
    // await mcpClient() // 需要 MCP 服务器
    
  } catch (error) {
    console.error('错误:', error)
  }
}

main()
