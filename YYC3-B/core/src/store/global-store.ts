/**
 * @description YYC³ 全局状态管理 - 基于Zustand的单一数据源
 * @module @yyc3/core/store/global
 * 
 * 设计理念：
 * - 纯开源：代码完全透明
 * - 本地化：数据存储在localStorage
 * - 一用户一端：单用户模式，无多端同步
 * - 极致信任：无上传、无追踪、无第三方
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface ModelProviderDef {
  id: string;
  label: string;
  baseUrl: string;
  authType: string;
  models: string[];
  requiresApiKey: boolean;
  isLocal: boolean;
  isBuiltin: boolean;
}

export interface ConfiguredModel {
  id: string;
  providerId: string;
  modelId: string;
  name: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface DBConnection {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  database?: string;
}

export interface FollowUpItem {
  id: string;
  content: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
  }>;
  createdAt: number;
  updatedAt: number;
}

export interface GlobalStoreState {
  user: AppUser | null;
  token: string | null;
  isGhost: boolean;
  
  theme: 'light' | 'dark' | 'cyberpunk';
  locale: 'zh-CN' | 'en-US';
  sidebarCollapsed: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  enableNotifications: boolean;
  enableSounds: boolean;
  compactMode: boolean;
  
  providers: ModelProviderDef[];
  configuredModels: ConfiguredModel[];
  activeModelId: string | null;
  
  connections: DBConnection[];
  activeConnectionId: string | null;
  
  followUps: FollowUpItem[];
  
  sessions: ChatSession[];
  activeSessionId: string | null;
}

export interface GlobalStoreActions {
  setUser: (user: AppUser | null) => void;
  setToken: (token: string | null) => void;
  setIsGhost: (isGhost: boolean) => void;
  logout: () => void;
  
  setTheme: (theme: 'light' | 'dark' | 'cyberpunk') => void;
  setLocale: (locale: 'zh-CN' | 'en-US') => void;
  toggleSidebar: () => void;
  setAutoRefresh: (autoRefresh: boolean) => void;
  setRefreshInterval: (interval: number) => void;
  setEnableNotifications: (enable: boolean) => void;
  setEnableSounds: (enable: boolean) => void;
  setCompactMode: (compact: boolean) => void;
  resetConfig: () => void;
  
  setProviders: (providers: ModelProviderDef[]) => void;
  addProvider: (provider: ModelProviderDef) => void;
  updateProvider: (id: string, updates: Partial<ModelProviderDef>) => void;
  removeProvider: (id: string) => void;
  
  setConfiguredModels: (models: ConfiguredModel[]) => void;
  addConfiguredModel: (model: ConfiguredModel) => void;
  updateConfiguredModel: (id: string, updates: Partial<ConfiguredModel>) => void;
  removeConfiguredModel: (id: string) => void;
  setActiveModel: (id: string | null) => void;
  
  setConnections: (connections: DBConnection[]) => void;
  addConnection: (connection: DBConnection) => void;
  updateConnection: (id: string, updates: Partial<DBConnection>) => void;
  removeConnection: (id: string) => void;
  setActiveConnection: (id: string | null) => void;
  
  addFollowUp: (item: FollowUpItem) => void;
  removeFollowUp: (id: string) => void;
  updateFollowUp: (id: string, updates: Partial<FollowUpItem>) => void;
  
  setSessions: (sessions: ChatSession[]) => void;
  addSession: (session: ChatSession) => void;
  updateSession: (id: string, updates: Partial<ChatSession>) => void;
  removeSession: (id: string) => void;
  setActiveSession: (id: string | null) => void;
  addMessageToSession: (sessionId: string, message: ChatSession['messages'][0]) => void;
  
  exportData: () => string;
  importData: (data: string) => void;
  clearAllData: () => void;
}

const DEFAULT_PROVIDERS: ModelProviderDef[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    authType: 'api-key',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    requiresApiKey: true,
    isLocal: false,
    isBuiltin: true,
  },
  {
    id: 'ollama',
    label: 'Ollama (本地)',
    baseUrl: 'http://localhost:11434/v1',
    authType: 'none',
    models: ['llama3', 'llama2', 'mistral', 'codellama'],
    requiresApiKey: false,
    isLocal: true,
    isBuiltin: true,
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    authType: 'api-key',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    requiresApiKey: true,
    isLocal: false,
    isBuiltin: true,
  },
];

const DEFAULT_CONFIG = {
  theme: 'cyberpunk' as const,
  locale: 'zh-CN' as const,
  sidebarCollapsed: false,
  autoRefresh: true,
  refreshInterval: 5000,
  enableNotifications: true,
  enableSounds: false,
  compactMode: false,
};

export const useGlobalStore = create<GlobalStoreState & GlobalStoreActions>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isGhost: false,
      
      ...DEFAULT_CONFIG,
      
      providers: DEFAULT_PROVIDERS,
      configuredModels: [],
      activeModelId: null,
      
      connections: [],
      activeConnectionId: null,
      
      followUps: [],
      
      sessions: [],
      activeSessionId: null,
      
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setIsGhost: (isGhost) => set({ isGhost }),
      logout: () => set({ user: null, token: null, isGhost: false }),
      
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setAutoRefresh: (autoRefresh) => set({ autoRefresh }),
      setRefreshInterval: (refreshInterval) => set({ refreshInterval }),
      setEnableNotifications: (enableNotifications) => set({ enableNotifications }),
      setEnableSounds: (enableSounds) => set({ enableSounds }),
      setCompactMode: (compactMode) => set({ compactMode }),
      resetConfig: () => set(DEFAULT_CONFIG),
      
      setProviders: (providers) => set({ providers }),
      addProvider: (provider) => set((state) => ({ providers: [...state.providers, provider] })),
      updateProvider: (id, updates) => set((state) => ({
        providers: state.providers.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      })),
      removeProvider: (id) => set((state) => ({
        providers: state.providers.filter((p) => p.id !== id),
      })),
      
      setConfiguredModels: (configuredModels) => set({ configuredModels }),
      addConfiguredModel: (model) => set((state) => ({
        configuredModels: [...state.configuredModels, model],
      })),
      updateConfiguredModel: (id, updates) => set((state) => ({
        configuredModels: state.configuredModels.map((m) =>
          m.id === id ? { ...m, ...updates } : m
        ),
      })),
      removeConfiguredModel: (id) => set((state) => ({
        configuredModels: state.configuredModels.filter((m) => m.id !== id),
      })),
      setActiveModel: (activeModelId) => set({ activeModelId }),
      
      setConnections: (connections) => set({ connections }),
      addConnection: (connection) => set((state) => ({
        connections: [...state.connections, connection],
      })),
      updateConnection: (id, updates) => set((state) => ({
        connections: state.connections.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      })),
      removeConnection: (id) => set((state) => ({
        connections: state.connections.filter((c) => c.id !== id),
      })),
      setActiveConnection: (activeConnectionId) => set({ activeConnectionId }),
      
      addFollowUp: (item) => set((state) => ({
        followUps: [...state.followUps, item],
      })),
      removeFollowUp: (id) => set((state) => ({
        followUps: state.followUps.filter((f) => f.id !== id),
      })),
      updateFollowUp: (id, updates) => set((state) => ({
        followUps: state.followUps.map((f) =>
          f.id === id ? { ...f, ...updates } : f
        ),
      })),
      
      setSessions: (sessions) => set({ sessions }),
      addSession: (session) => set((state) => ({
        sessions: [...state.sessions, session],
      })),
      updateSession: (id, updates) => set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      })),
      removeSession: (id) => set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== id),
      })),
      setActiveSession: (activeSessionId) => set({ activeSessionId }),
      addMessageToSession: (sessionId, message) => set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === sessionId
            ? { ...s, messages: [...s.messages, message], updatedAt: Date.now() }
            : s
        ),
      })),
      
      exportData: () => {
        const state = get();
        const exportData = {
          user: state.user,
          config: {
            theme: state.theme,
            locale: state.locale,
            sidebarCollapsed: state.sidebarCollapsed,
            autoRefresh: state.autoRefresh,
            refreshInterval: state.refreshInterval,
            enableNotifications: state.enableNotifications,
            enableSounds: state.enableSounds,
            compactMode: state.compactMode,
          },
          providers: state.providers,
          configuredModels: state.configuredModels.map((m) => ({
            ...m,
            apiKey: '***',
          })),
          connections: state.connections.map((c) => ({
            ...c,
            password: '***',
          })),
          sessions: state.sessions,
        };
        return JSON.stringify(exportData, null, 2);
      },
      
      importData: (data) => {
        try {
          const imported = JSON.parse(data);
          set({
            user: imported.user || null,
            ...imported.config,
            providers: imported.providers || DEFAULT_PROVIDERS,
            configuredModels: imported.configuredModels || [],
            connections: imported.connections || [],
            sessions: imported.sessions || [],
          });
        } catch (error) {
          console.error('Failed to import data:', error);
        }
      },
      
      clearAllData: () => {
        set({
          user: null,
          token: null,
          isGhost: false,
          ...DEFAULT_CONFIG,
          providers: DEFAULT_PROVIDERS,
          configuredModels: [],
          activeModelId: null,
          connections: [],
          activeConnectionId: null,
          followUps: [],
          sessions: [],
          activeSessionId: null,
        });
      },
    }),
    {
      name: 'yyc3-global-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isGhost: state.isGhost,
        theme: state.theme,
        locale: state.locale,
        sidebarCollapsed: state.sidebarCollapsed,
        autoRefresh: state.autoRefresh,
        refreshInterval: state.refreshInterval,
        enableNotifications: state.enableNotifications,
        enableSounds: state.enableSounds,
        compactMode: state.compactMode,
        providers: state.providers,
        configuredModels: state.configuredModels,
        activeModelId: state.activeModelId,
        connections: state.connections,
        activeConnectionId: state.activeConnectionId,
        followUps: state.followUps,
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
    }
  )
);

export function useUser() {
  const user = useGlobalStore((state) => state.user);
  const token = useGlobalStore((state) => state.token);
  const isGhost = useGlobalStore((state) => state.isGhost);
  const setUser = useGlobalStore((state) => state.setUser);
  const setToken = useGlobalStore((state) => state.setToken);
  const setIsGhost = useGlobalStore((state) => state.setIsGhost);
  const logout = useGlobalStore((state) => state.logout);
  
  return { user, token, isGhost, setUser, setToken, setIsGhost, logout };
}

export function useConfig() {
  const theme = useGlobalStore((state) => state.theme);
  const locale = useGlobalStore((state) => state.locale);
  const sidebarCollapsed = useGlobalStore((state) => state.sidebarCollapsed);
  const autoRefresh = useGlobalStore((state) => state.autoRefresh);
  const refreshInterval = useGlobalStore((state) => state.refreshInterval);
  const enableNotifications = useGlobalStore((state) => state.enableNotifications);
  const enableSounds = useGlobalStore((state) => state.enableSounds);
  const compactMode = useGlobalStore((state) => state.compactMode);
  const setTheme = useGlobalStore((state) => state.setTheme);
  const setLocale = useGlobalStore((state) => state.setLocale);
  const toggleSidebar = useGlobalStore((state) => state.toggleSidebar);
  const setAutoRefresh = useGlobalStore((state) => state.setAutoRefresh);
  const setRefreshInterval = useGlobalStore((state) => state.setRefreshInterval);
  const setEnableNotifications = useGlobalStore((state) => state.setEnableNotifications);
  const setEnableSounds = useGlobalStore((state) => state.setEnableSounds);
  const setCompactMode = useGlobalStore((state) => state.setCompactMode);
  const resetConfig = useGlobalStore((state) => state.resetConfig);
  
  return {
    theme,
    locale,
    sidebarCollapsed,
    autoRefresh,
    refreshInterval,
    enableNotifications,
    enableSounds,
    compactMode,
    setTheme,
    setLocale,
    toggleSidebar,
    setAutoRefresh,
    setRefreshInterval,
    setEnableNotifications,
    setEnableSounds,
    setCompactMode,
    resetConfig,
  };
}

export function useModels() {
  const providers = useGlobalStore((state) => state.providers);
  const configuredModels = useGlobalStore((state) => state.configuredModels);
  const activeModelId = useGlobalStore((state) => state.activeModelId);
  const setProviders = useGlobalStore((state) => state.setProviders);
  const addProvider = useGlobalStore((state) => state.addProvider);
  const updateProvider = useGlobalStore((state) => state.updateProvider);
  const removeProvider = useGlobalStore((state) => state.removeProvider);
  const setConfiguredModels = useGlobalStore((state) => state.setConfiguredModels);
  const addConfiguredModel = useGlobalStore((state) => state.addConfiguredModel);
  const updateConfiguredModel = useGlobalStore((state) => state.updateConfiguredModel);
  const removeConfiguredModel = useGlobalStore((state) => state.removeConfiguredModel);
  const setActiveModel = useGlobalStore((state) => state.setActiveModel);
  
  return {
    providers,
    configuredModels,
    activeModelId,
    setProviders,
    addProvider,
    updateProvider,
    removeProvider,
    setConfiguredModels,
    addConfiguredModel,
    updateConfiguredModel,
    removeConfiguredModel,
    setActiveModel,
  };
}

export function useDatabase() {
  const connections = useGlobalStore((state) => state.connections);
  const activeConnectionId = useGlobalStore((state) => state.activeConnectionId);
  const setConnections = useGlobalStore((state) => state.setConnections);
  const addConnection = useGlobalStore((state) => state.addConnection);
  const updateConnection = useGlobalStore((state) => state.updateConnection);
  const removeConnection = useGlobalStore((state) => state.removeConnection);
  const setActiveConnection = useGlobalStore((state) => state.setActiveConnection);
  
  return {
    connections,
    activeConnectionId,
    setConnections,
    addConnection,
    updateConnection,
    removeConnection,
    setActiveConnection,
  };
}

export function useChat() {
  const sessions = useGlobalStore((state) => state.sessions);
  const activeSessionId = useGlobalStore((state) => state.activeSessionId);
  const setSessions = useGlobalStore((state) => state.setSessions);
  const addSession = useGlobalStore((state) => state.addSession);
  const updateSession = useGlobalStore((state) => state.updateSession);
  const removeSession = useGlobalStore((state) => state.removeSession);
  const setActiveSession = useGlobalStore((state) => state.setActiveSession);
  const addMessageToSession = useGlobalStore((state) => state.addMessageToSession);
  
  return {
    sessions,
    activeSessionId,
    setSessions,
    addSession,
    updateSession,
    removeSession,
    setActiveSession,
    addMessageToSession,
  };
}
