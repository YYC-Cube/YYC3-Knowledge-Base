export interface MarketplaceRegistry {
  id?: string
  name: string
  displayName: string
  description: string
  url: string
  repository: string
  installCommand: string
  pluginCount: number
  skillCount: number
  categories: string[]
  badges: string[]
  maintainer: {
    name: string
    github: string
  }
  stars?: number
  installs?: number
  verified?: boolean
  lastIndexedAt?: string
  updatedAt?: string
}

export interface RegistryData {
  marketplaces: MarketplaceRegistry[]
}
