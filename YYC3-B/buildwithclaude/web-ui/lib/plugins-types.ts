export interface PluginAuthor {
  name: string
  url: string
}

export interface Plugin {
  name: string
  description: string
  version: string
  category: string
  author: PluginAuthor
  repository: string
  license: string
  keywords: string[]
  source: string
  homepage?: string
}

export interface PluginCategory {
  id: string
  displayName: string
  icon: string
  count: number
}
