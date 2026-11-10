/**
 * @file: stores/optimizedHooks.ts
 * @description: Zustand Store 优化 Hooks，提供细粒度订阅，减少重渲染
 *              修复订阅泄漏：稳定 selector 引用、正确清理副作用、
 *              避免闭包陷阱中的 getState() 快照问题
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.1.0
 * @created: 2026-03-30
 * @updated: 2026-04-17
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: stores,zustand,hooks,performance,optimization
 */

import { useCallback, useMemo, useRef, useEffect } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { logger } from "../services/Logger";
import {
  useFileStoreZustand,
  selectFileContents,
  selectOpenTabs,
  selectActiveFile,
  selectGitBranch,
  selectGitChanges,
  selectGitLog,
  type FileStoreState,
} from "./useFileStoreZustand";
import {
  useSettingsStore,
  type Settings,
  type GeneralSettings,
  type AgentConfig,
  type MCPConfig,
  type ModelConfig,
  type ContextSettings,
  type ConversationSettings,
  type RuleConfig,
  type SkillConfig,
} from "./useSettingsStore";
import {
  useModelStoreZustand,
  selectActiveModelId,
  selectCustomModels,
  selectConnectivityResults,
  selectHeartbeatEnabled,
  selectLatencyHistory,
  type ModelStoreState,
  type AIModel,
} from "./useModelStoreZustand";
import {
  useTaskBoardStore,
  type Task,
  type Reminder,
  type TaskFilters,
  type TaskBoardState,
} from "./useTaskBoardStore";

// ===== Stable Selector Factories =====

const selectGitChangesStable = (state: FileStoreState) => state.gitChanges;
const selectGitLogStable = (state: FileStoreState) => state.gitLog;
const selectGitLogTop10 = (state: FileStoreState) => state.gitLog.slice(0, 10);

const selectUserProfileStable = (state: { settings: Settings }) => state.settings.userProfile;
const selectGeneralStable = (state: { settings: Settings }) => state.settings.general;
const selectThemeStable = (state: { settings: Settings }) => state.settings.general.theme;
const selectEditorFontStable = (state: { settings: Settings }) => state.settings.general.editorFont;
const selectEditorFontSizeStable = (state: { settings: Settings }) => state.settings.general.editorFontSize;
const selectAgentsStable = (state: { settings: Settings }) => state.settings.agents;
const selectMCPConfigsStable = (state: { settings: Settings }) => state.settings.mcpConfigs;
const selectModelConfigsStable = (state: { settings: Settings }) => state.settings.models;
const selectConversationStable = (state: { settings: Settings }) => state.settings.conversation;
const selectContextStable = (state: { settings: Settings }) => state.settings.context;

const selectHeartbeatConfigStable = (state: ModelStoreState) => ({
  enabled: state.heartbeatEnabled,
  intervalMs: state.heartbeatIntervalMs,
});

// ===== File Store 优化 Hooks =====

export function useFileContent(path: string) {
  const selector = useCallback(
    (state: FileStoreState) => state.fileContents[path],
    [path],
  );
  return useStore(useFileStoreZustand, selector);
}

export function useActiveFilePath() {
  return useStore(useFileStoreZustand, selectActiveFile);
}

export function useOpenTabs() {
  return useStore(useFileStoreZustand, useShallow(selectOpenTabs));
}

export function useFileActions() {
  const store = useFileStoreZustand;
  return useMemo(
    () => ({
      updateFile: (path: string, content: string) => store.getState().updateFile(path, content),
      createFile: (path: string, content?: string) => store.getState().createFile(path, content),
      deleteFile: (path: string) => store.getState().deleteFile(path),
      renameFile: (oldPath: string, newPath: string) => store.getState().renameFile(oldPath, newPath),
      setActiveFile: (path: string) => store.getState().setActiveFile(path),
      openFile: (path: string) => store.getState().openFile(path),
      closeTab: (path: string) => store.getState().closeTab(path),
    }),
    [store],
  );
}

export function useGitState() {
  const branch = useStore(useFileStoreZustand, selectGitBranch);
  const changes = useStore(useFileStoreZustand, useShallow(selectGitChangesStable));
  const log = useStore(useFileStoreZustand, useShallow(selectGitLogTop10));

  return useMemo(
    () => ({ branch, changes, log }),
    [branch, changes, log],
  );
}

// ===== Settings Store 优化 Hooks =====

export function useUserProfile() {
  return useStore(useSettingsStore, selectUserProfileStable);
}

export function useGeneralSettings() {
  return useStore(useSettingsStore, useShallow(selectGeneralStable));
}

export function useThemeSettings() {
  const theme = useStore(useSettingsStore, selectThemeStable);
  const editorFont = useStore(useSettingsStore, selectEditorFontStable);
  const editorFontSize = useStore(useSettingsStore, selectEditorFontSizeStable);

  return useMemo(
    () => ({ theme, editorFont, editorFontSize }),
    [theme, editorFont, editorFontSize],
  );
}

export function useAgents() {
  return useStore(useSettingsStore, useShallow(selectAgentsStable));
}

export function useMCPConfigs() {
  return useStore(useSettingsStore, useShallow(selectMCPConfigsStable));
}

export function useModelConfigs() {
  return useStore(useSettingsStore, useShallow(selectModelConfigsStable));
}

export function useConversationSettings() {
  return useStore(useSettingsStore, useShallow(selectConversationStable));
}

export function useContextSettings() {
  return useStore(useSettingsStore, useShallow(selectContextStable));
}

export function useSettingsActions() {
  const store = useSettingsStore;
  return useMemo(
    () => ({
      updateGeneralSettings: (settings: Partial<GeneralSettings>) => store.getState().updateGeneralSettings(settings),
      updateUserProfile: (profile: Partial<any>) => store.getState().updateUserProfile(profile),
      addAgent: (agent: AgentConfig) => store.getState().addAgent(agent),
      updateAgent: (id: string, agent: Partial<AgentConfig>) => store.getState().updateAgent(id, agent),
      removeAgent: (id: string) => store.getState().removeAgent(id),
      addMCP: (mcp: MCPConfig) => store.getState().addMCP(mcp),
      updateMCP: (id: string, mcp: Partial<MCPConfig>) => store.getState().updateMCP(id, mcp),
      removeMCP: (id: string) => store.getState().removeMCP(id),
    }),
    [store],
  );
}

// ===== Model Store 优化 Hooks =====

export function useActiveModelId() {
  return useStore(useModelStoreZustand, selectActiveModelId);
}

export function useCustomModels() {
  return useStore(useModelStoreZustand, useShallow(selectCustomModels));
}

export function useModelConnectivity(modelId: string) {
  const selector = useCallback(
    (state: ModelStoreState) => state.connectivityResults[modelId],
    [modelId],
  );
  return useStore(useModelStoreZustand, useShallow(selector));
}

export function useHeartbeatConfig() {
  return useStore(useModelStoreZustand, useShallow(selectHeartbeatConfigStable));
}

export function useRecentLatencyHistory(limit = 20) {
  const selector = useCallback(
    (state: ModelStoreState) => state.latencyHistory.slice(-limit),
    [limit],
  );
  return useStore(useModelStoreZustand, useShallow(selector));
}

export function useModelActions() {
  const store = useModelStoreZustand;
  return useMemo(
    () => ({
      setActiveModelId: (id: string) => store.getState().setActiveModelId(id),
      addCustomModel: (name: string, provider: string, endpoint: string, apiKey?: string) => store.getState().addCustomModel(name, provider, endpoint, apiKey),
      removeCustomModel: (id: string) => store.getState().removeCustomModel(id),
      updateCustomModel: (id: string, model: Partial<AIModel>) => store.getState().updateCustomModel(id, model),
      setConnectivityResult: (id: string, result: any) => store.getState().setConnectivityResult(id, result),
      toggleHeartbeat: (enabled: boolean) => store.getState().toggleHeartbeat(enabled),
    }),
    [store],
  );
}

// ===== Task Board Store 优化 Hooks =====

export function useTasks(filter?: (task: Task) => boolean) {
  const stableFilter = useRef(filter);
  stableFilter.current = filter;

  const selector = useCallback(
    (state: TaskBoardState) => {
      const tasks = state.tasks;
      const currentFilter = stableFilter.current;
      if (currentFilter) {
        return tasks.filter(currentFilter);
      }
      return tasks;
    },
    [],
  );

  return useStore(useTaskBoardStore, useShallow(selector));
}

export function useTask(taskId: string) {
  const selector = useCallback(
    (state: TaskBoardState) => state.tasks.find((t) => t.id === taskId),
    [taskId],
  );
  return useStore(useTaskBoardStore, selector);
}

export function useReminders() {
  const selector = useCallback(
    (state: TaskBoardState) => state.reminders,
    [],
  );
  return useStore(useTaskBoardStore, useShallow(selector));
}

export function useTaskFilters() {
  const selector = useCallback(
    (state: TaskBoardState) => state.filters,
    [],
  );
  return useStore(useTaskBoardStore, useShallow(selector));
}

export function useBoardViewSettings() {
  return useStore(useTaskBoardStore, useShallow(selectHeartbeatConfigStable as any));
}

export function useTaskActions() {
  const store = useTaskBoardStore;
  return useMemo(
    () => ({
      addTask: (task: Omit<Task, "id">) => store.getState().addTask(task),
      updateTask: (id: string, updates: Partial<Task>) => store.getState().updateTask(id, updates),
      removeTask: (id: string) => store.getState().removeTask(id),
      moveTask: (id: string, status: Task["status"]) => store.getState().moveTask(id, status),
      setPriority: (id: string, priority: Task["priority"]) => store.getState().setPriority(id, priority),
      addReminder: (reminder: Omit<Reminder, "id">) => store.getState().addReminder(reminder),
      setFilters: (filters: Partial<TaskFilters>) => store.getState().setFilters(filters),
    }),
    [store],
  );
}

// ===== 组合 Hooks =====

export function useEditorState() {
  const activeFile = useActiveFilePath();
  const fileContent = useFileContent(activeFile);
  const themeSettings = useThemeSettings();

  return useMemo(
    () => ({
      activeFile,
      fileContent,
      ...themeSettings,
    }),
    [activeFile, fileContent, themeSettings],
  );
}

export function useGitPanelState() {
  const gitState = useGitState();
  const activeFile = useActiveFilePath();

  return useMemo(
    () => ({
      ...gitState,
      activeFile,
    }),
    [gitState, activeFile],
  );
}

// ===== Subscription Leak Detection Utility =====

export function useSubscriptionDebug(label: string) {
  const renderCount = useRef(0);
  renderCount.current++;

  useEffect(() => {
    if (renderCount.current > 50) {
      logger.warn(
        `${label} has rendered ${renderCount.current} times — possible subscription leak`,
        undefined,
        "ZustandLeak"
      );
    }
  }, [label]);
}
