/**
 * @description YYC³ MCP服务器注册中心
 * @module @yyc3/mcp-server/registry
 * 
 * 支持4500+ MCP服务器的注册、发现、分类管理
 */

import type {
  MCPRegistryEntry,
  MCPServerCategory,
  MCPServerConfig,
  MCPTool,
  MCPResource,
  MCPPrompt,
} from './types.js';
import { DEFAULT_MCP_SERVERS } from './types.js';

export interface RegistrySearchOptions {
  query?: string;
  category?: MCPServerCategory;
  tags?: string[];
  verified?: boolean;
  limit?: number;
  offset?: number;
}

export interface RegistryStats {
  totalServers: number;
  byCategory: Record<MCPServerCategory, number>;
  verifiedCount: number;
  tagsCount: Record<string, number>;
}

export class MCPRegistry {
  private entries: Map<string, MCPRegistryEntry> = new Map();
  private categoryIndex: Map<MCPServerCategory, Set<string>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private initialized: boolean = false;

  constructor() {
    this.initializeIndexes();
  }

  private initializeIndexes(): void {
    const categories: MCPServerCategory[] = [
      'api', 'database', 'ai-tools', 'cloud', 'filesystem',
      'web', 'development', 'communication', 'analytics', 'other'
    ];
    for (const cat of categories) {
      this.categoryIndex.set(cat, new Set());
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    for (const entry of DEFAULT_MCP_SERVERS) {
      this.register(entry);
    }

    this.initialized = true;
  }

  register(entry: MCPRegistryEntry): void {
    this.entries.set(entry.id, entry);
    
    if (entry.category) {
      this.categoryIndex.get(entry.category)?.add(entry.id);
    }

    for (const tag of entry.tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)?.add(entry.id);
    }
  }

  unregister(id: string): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;

    this.entries.delete(id);
    
    if (entry.category) {
      this.categoryIndex.get(entry.category)?.delete(id);
    }

    for (const tag of entry.tags) {
      this.tagIndex.get(tag)?.delete(id);
    }

    return true;
  }

  get(id: string): MCPRegistryEntry | undefined {
    return this.entries.get(id);
  }

  getAll(): MCPRegistryEntry[] {
    return Array.from(this.entries.values());
  }

  search(options: RegistrySearchOptions = {}): MCPRegistryEntry[] {
    let results = Array.from(this.entries.values());

    if (options.query) {
      const query = options.query.toLowerCase();
      results = results.filter(entry => 
        entry.name.toLowerCase().includes(query) ||
        entry.description.toLowerCase().includes(query) ||
        entry.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (options.category) {
      results = results.filter(entry => entry.category === options.category);
    }

    if (options.tags && options.tags.length > 0) {
      results = results.filter(entry =>
        options.tags!.some(tag => entry.tags.includes(tag))
      );
    }

    if (options.verified !== undefined) {
      results = results.filter(entry => entry.verified === options.verified);
    }

    results.sort((a, b) => b.popularity - a.popularity);

    const offset = options.offset || 0;
    const limit = options.limit || results.length;
    
    return results.slice(offset, offset + limit);
  }

  getByCategory(category: MCPServerCategory): MCPRegistryEntry[] {
    const ids = this.categoryIndex.get(category);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.entries.get(id)!)
      .filter(Boolean);
  }

  getByTag(tag: string): MCPRegistryEntry[] {
    const ids = this.tagIndex.get(tag);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.entries.get(id)!)
      .filter(Boolean);
  }

  getPopular(limit: number = 10): MCPRegistryEntry[] {
    return Array.from(this.entries.values())
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);
  }

  getVerified(): MCPRegistryEntry[] {
    return Array.from(this.entries.values())
      .filter(entry => entry.verified);
  }

  getStats(): RegistryStats {
    const stats: RegistryStats = {
      totalServers: this.entries.size,
      byCategory: {} as Record<MCPServerCategory, number>,
      verifiedCount: 0,
      tagsCount: {},
    };

    for (const [category, ids] of this.categoryIndex) {
      stats.byCategory[category] = ids.size;
    }

    for (const entry of this.entries.values()) {
      if (entry.verified) stats.verifiedCount++;
    }

    for (const [tag, ids] of this.tagIndex) {
      stats.tagsCount[tag] = ids.size;
    }

    return stats;
  }

  getCategories(): MCPServerCategory[] {
    return Array.from(this.categoryIndex.keys());
  }

  getTags(): string[] {
    return Array.from(this.tagIndex.keys());
  }

  updatePopularity(id: string, delta: number = 1): void {
    const entry = this.entries.get(id);
    if (entry) {
      entry.popularity = Math.max(0, entry.popularity + delta);
    }
  }

  bulkRegister(entries: MCPRegistryEntry[]): void {
    for (const entry of entries) {
      this.register(entry);
    }
  }

  exportRegistry(): MCPRegistryEntry[] {
    return this.getAll();
  }

  importRegistry(entries: MCPRegistryEntry[]): void {
    this.bulkRegister(entries);
  }
}

export const globalRegistry = new MCPRegistry();
