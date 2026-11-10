/**
 * @file types.ts
 * @description 模型设置面板共享类型定义
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 */

export interface MCPServerConfig {
  id: string
  name: string
  description: string
  command: string
  args: string[]
  env: Record<string, string>
  enabled: boolean
}

export interface DiagnosticResult {
  providerId: string
  modelName: string
  status: 'idle' | 'testing' | 'success' | 'error'
  latency?: number
  message: string
  modelResponse?: string
  timestamp?: number
}

export interface OllamaDetectedModel {
  name: string
  size: string
  status: 'online' | 'offline'
  quantization: string
}

export type TabKey = 'providers' | 'ollama' | 'mcp' | 'diagnostics' | 'proxy'

export interface ModelSettingsProps {
  mode?: 'modal' | 'embedded'
  onClose?: () => void
  initialTab?: TabKey
}
