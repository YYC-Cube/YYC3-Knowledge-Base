/**
 * @file: APIKeyVault.ts
 * @description: 安全的 API 密钥存储服务
 * @version: 1.0.0
 */

import { IDBPDatabase, openDB } from 'idb';

const DB_NAME = 'yyc3-api-vault';
const DB_VERSION = 1;
const STORE_NAME = 'api-keys';

export type ProviderId =
  | 'openai'
  | 'anthropic'
  | 'deepseek'
  | 'zhipu'
  | 'moonshot'
  | 'qwen'
  | 'baichuan'
  | 'minimax'
  | 'custom';

export interface APIKeyConfig {
  id: string;
  provider: ProviderId;
  name: string;
  apiKey: string;
  baseUrl?: string;
  createdAt: string;
  updatedAt: string;
  lastUsed?: string;
  usageCount: number;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface ProviderInfo {
  id: ProviderId;
  name: string;
  icon?: string;
  description: string;
  keyPrefix: string;
  keyPattern: RegExp;
  baseUrl: string;
  docsUrl: string;
  models: string[];
}

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4, GPT-3.5, DALL-E, Whisper',
    keyPrefix: 'sk-',
    keyPattern: /^sk-[a-zA-Z0-9]{48,}$/,
    baseUrl: 'https://api.openai.com/v1',
    docsUrl: 'https://platform.openai.com/api-keys',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude 3.5, Claude 3',
    keyPrefix: 'sk-ant-',
    keyPattern: /^sk-ant-api03-[a-zA-Z0-9-]{80,}$/,
    baseUrl: 'https://api.anthropic.com/v1',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek Chat, DeepSeek Coder',
    keyPrefix: 'sk-',
    keyPattern: /^sk-[a-zA-Z0-9]{32,}$/,
    baseUrl: 'https://api.deepseek.com/v1',
    docsUrl: 'https://platform.deepseek.com/api_keys',
    models: ['deepseek-chat', 'deepseek-coder'],
  },
  zhipu: {
    id: 'zhipu',
    name: '智谱 AI',
    description: 'GLM-4, GLM-3-Turbo',
    keyPrefix: '',
    keyPattern: /^[a-zA-Z0-9]{32}\.[a-zA-Z0-9]{16}$/,
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    docsUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    models: ['glm-4-plus', 'glm-4-0520', 'glm-3-turbo'],
  },
  moonshot: {
    id: 'moonshot',
    name: 'Moonshot AI',
    description: 'Kimi, Moonshot',
    keyPrefix: 'sk-',
    keyPattern: /^sk-[a-zA-Z0-9]{48,}$/,
    baseUrl: 'https://api.moonshot.cn/v1',
    docsUrl: 'https://platform.moonshot.cn/console/api-keys',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  },
  qwen: {
    id: 'qwen',
    name: '通义千问',
    description: 'Qwen-Max, Qwen-Plus',
    keyPrefix: 'sk-',
    keyPattern: /^sk-[a-zA-Z0-9]{32,}$/,
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
    docsUrl: 'https://dashscope.console.aliyun.com/apiKey',
    models: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
  },
  baichuan: {
    id: 'baichuan',
    name: '百川智能',
    description: 'Baichuan2-Turbo',
    keyPrefix: '',
    keyPattern: /^[a-zA-Z0-9]{32}$/,
    baseUrl: 'https://api.baichuan-ai.com/v1',
    docsUrl: 'https://platform.baichuan-ai.com/console/api-key',
    models: ['Baichuan2-Turbo', 'Baichuan2-53B'],
  },
  minimax: {
    id: 'minimax',
    name: 'MiniMax',
    description: 'abab6.5, abab5.5',
    keyPrefix: '',
    keyPattern: /^[a-zA-Z0-9]{32,}$/,
    baseUrl: 'https://api.minimax.chat/v1',
    docsUrl: 'https://www.minimaxi.com/user-center/basic-information/interface-key',
    models: ['abab6.5-chat', 'abab5.5-chat'],
  },
  custom: {
    id: 'custom',
    name: '自定义服务',
    description: '自定义 OpenAI 兼容 API',
    keyPrefix: '',
    keyPattern: /.+/,
    baseUrl: '',
    docsUrl: '',
    models: [],
  },
};

class APIKeyVault {
  private db: IDBPDatabase | null = null;
  private encryptionKey: CryptoKey | null = null;

  async init(): Promise<void> {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('provider', 'provider');
          store.createIndex('isActive', 'isActive');
        }
      },
    });

    await this.initEncryptionKey();
  }

  private async initEncryptionKey(): Promise<void> {
    const storedKey = sessionStorage.getItem('yyc3-vault-key');

    if (storedKey) {
      const keyData = Uint8Array.from(atob(storedKey), c => c.charCodeAt(0));
      this.encryptionKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
    } else {
      this.encryptionKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      const exportedKey = await crypto.subtle.exportKey('raw', this.encryptionKey);
      const keyBase64 = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
      sessionStorage.setItem('yyc3-vault-key', keyBase64);
    }
  }

  private async encrypt(text: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedText = new TextEncoder().encode(text);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      encodedText
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  private async decrypt(encryptedText: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const combined = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  }

  maskKey(key: string): string {
    if (key.length <= 8) return '****';
    return `${key.slice(0, 4)}****${key.slice(-4)}`;
  }

  validateKey(provider: ProviderId, key: string): { valid: boolean; error?: string } {
    const providerInfo = PROVIDERS[provider];

    if (!key || key.trim().length === 0) {
      return { valid: false, error: 'API Key 不能为空' };
    }

    if (provider !== 'custom' && !providerInfo.keyPattern.test(key)) {
      return { valid: false, error: `API Key 格式不正确，应以 ${providerInfo.keyPrefix} 开头` };
    }

    return { valid: true };
  }

  async saveKey(config: Omit<APIKeyConfig, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<APIKeyConfig> {
    if (!this.db) await this.init();

    const validation = this.validateKey(config.provider, config.apiKey);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const existingKeys = await this.listKeys();
    const existing = existingKeys.find(k => k.provider === config.provider);

    const encryptedKey = await this.encrypt(config.apiKey);

    const now = new Date().toISOString();
    const newConfig: APIKeyConfig = {
      ...config,
      id: existing?.id || `${config.provider}-${Date.now()}`,
      apiKey: encryptedKey,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      usageCount: existing?.usageCount || 0,
    };

    await this.db!.put(STORE_NAME, newConfig);

    return { ...newConfig, apiKey: this.maskKey(config.apiKey) };
  }

  async getKey(id: string): Promise<string | null> {
    if (!this.db) await this.init();

    const config: any = await this.db!.get(STORE_NAME, id);
    if (!config) return null;

    try {
      const decrypted = await this.decrypt(config.apiKey);

      await this.db!.put(STORE_NAME, {
        ...config,
        lastUsed: new Date().toISOString(),
        usageCount: (config.usageCount || 0) + 1,
      });

      return decrypted;
    } catch {
      return null;
    }
  }

  async getActiveKey(provider: ProviderId): Promise<string | null> {
    if (!this.db) await this.init();

    const allKeys = await this.listKeys();
    const activeKey = allKeys.find(k => k.provider === provider && k.isActive);

    if (!activeKey) return null;

    return this.getKey(activeKey.id);
  }

  async listKeys(): Promise<APIKeyConfig[]> {
    if (!this.db) await this.init();

    const keys: any[] = await this.db!.getAll(STORE_NAME);
    return keys.map(k => ({ ...k, apiKey: this.maskKey(k.apiKey) }));
  }

  async deleteKey(id: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete(STORE_NAME, id);
  }

  async setActive(id: string): Promise<void> {
    if (!this.db) await this.init();

    const keys = await this.listKeys();
    const targetKey = keys.find(k => k.id === id);

    if (!targetKey) return;

    for (const key of keys) {
      if (key.provider === targetKey.provider) {
        await this.db!.put(STORE_NAME, { ...key, isActive: key.id === id });
      }
    }
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.clear(STORE_NAME);
    sessionStorage.removeItem('yyc3-vault-key');
    this.encryptionKey = null;
  }

  async exportConfig(): Promise<string> {
    const keys = await this.listKeys();
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      keys: keys.map(k => ({
        provider: k.provider,
        name: k.name,
        baseUrl: k.baseUrl,
        isActive: k.isActive,
      })),
    };
    return JSON.stringify(exportData, null, 2);
  }
}

export const apiKeyVault = new APIKeyVault();
