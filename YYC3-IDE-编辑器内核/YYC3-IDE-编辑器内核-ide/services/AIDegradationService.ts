/**
 * @file: services/AIDegradationService.ts
 * @description: AI 服务自动降级引擎 — 当主 provider 不可用时自动切换到备选 provider，
 *              实现多级降级链、健康检测、自动恢复、降级状态通知
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.0.0
 * @created: 2026-04-17
 * @updated: 2026-04-17
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: ai,degradation,fallback,circuit-breaker,resilience
 */

import { logger } from "./Logger";
import {
  CircuitBreaker,
  type CircuitBreakerConfig,
  type CircuitState,
} from "./RateLimiter";
import {
  getProviderConfigs,
  getApiKey,
  chatCompletion,
  chatCompletionStream,
  testModelConnectivity,
  type ProviderConfig,
  type ProviderId,
  type ChatMessage,
  type StreamCallbacks,
} from "../LLMService";

// ── Types ──

export type DegradationLevel = "optimal" | "degraded" | "minimal" | "unavailable";

export interface ProviderHealth {
  providerId: ProviderId;
  level: DegradationLevel;
  circuitState: CircuitState;
  consecutiveFailures: number;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  lastError: string | null;
  latencyMs: number | null;
  modelId: string | null;
}

export interface DegradationState {
  currentProviderId: ProviderId | null;
  currentLevel: DegradationLevel;
  activeModelId: string | null;
  providers: ProviderHealth[];
  lastSwitchAt: number | null;
  switchCount: number;
}

export interface DegradationConfig {
  circuitBreaker: CircuitBreakerConfig;
  healthCheckIntervalMs: number;
  recoveryCheckIntervalMs: number;
  maxLatencyMs: number;
  degradationChain: ProviderId[];
  onDegradation?: (from: ProviderId, to: ProviderId, level: DegradationLevel) => void;
  onRecovery?: (providerId: ProviderId) => void;
  onUnavailable?: () => void;
}

interface ProviderEntry {
  config: ProviderConfig;
  circuitBreaker: CircuitBreaker;
  health: ProviderHealth;
}

// ── Default Configuration ──

const DEFAULT_CONFIG: DegradationConfig = {
  circuitBreaker: {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 30000,
    halfOpenMaxCalls: 1,
  },
  healthCheckIntervalMs: 60000,
  recoveryCheckIntervalMs: 15000,
  maxLatencyMs: 30000,
  degradationChain: ["ollama", "zai-plan"], // 本地优先：YYC³ merged-v3 → 智谱云端
};

// ── AIDegradationService ──

export class AIDegradationService {
  private config: DegradationConfig;
  private providers: Map<ProviderId, ProviderEntry> = new Map();
  private currentProviderId: ProviderId | null = null;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private recoveryCheckTimer: ReturnType<typeof setInterval> | null = null;
  private switchCount: number = 0;
  private lastSwitchAt: number | null = null;
  private listeners: Set<(state: DegradationState) => void> = new Set();

  constructor(config?: Partial<DegradationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeProviders();
  }

  private initializeProviders(): void {
    const providerConfigs = getProviderConfigs();
    const chain = this.config.degradationChain;

    for (const providerConfig of providerConfigs) {
      if (!chain.includes(providerConfig.id)) continue;

      const entry: ProviderEntry = {
        config: providerConfig,
        circuitBreaker: new CircuitBreaker(this.config.circuitBreaker),
        health: {
          providerId: providerConfig.id,
          level: "optimal",
          circuitState: "closed",
          consecutiveFailures: 0,
          lastSuccessAt: null,
          lastFailureAt: null,
          lastError: null,
          latencyMs: null,
          modelId: null,
        },
      };

      this.providers.set(providerConfig.id, entry);
    }

    this.selectInitialProvider();
  }

  private selectInitialProvider(): void {
    const chain = this.config.degradationChain;

    for (const providerId of chain) {
      const entry = this.providers.get(providerId);
      if (!entry) continue;

      const isAvailable = this.isProviderConfigured(entry.config);
      if (isAvailable) {
        this.currentProviderId = providerId;
        entry.health.modelId = this.selectModel(entry.config);
        logger.warn('Initial AI provider: ${providerId}');
        return;
      }
    }

    logger.warn('No AI provider available at startup');
  }

  private isProviderConfigured(config: ProviderConfig): boolean {
    if (config.authType === "none") return true;
    return !!getApiKey(config.id);
  }

  private selectModel(config: ProviderConfig): string | null {
    if (config.models.length === 0) return null;

    const activeModelRaw = localStorage.getItem("yyc3_active_model");
    if (activeModelRaw) {
      try {
        const parsed = JSON.parse(activeModelRaw);
        if (parsed.providerId === config.id && parsed.modelId) {
          return parsed.modelId;
        }
      } catch { /* empty */ }
    }

    return config.models[0]?.id || null;
  }

  async execute<T>(
    fn: (provider: ProviderConfig, modelId: string) => Promise<T>,
    fallbackValue?: T,
  ): Promise<T> {
    const chain = this.config.degradationChain;

    for (const providerId of chain) {
      const entry = this.providers.get(providerId);
      if (!entry) continue;

      if (entry.health.circuitState === "open") {
        const elapsed = Date.now() - (entry.health.lastFailureAt || 0);
        if (elapsed < this.config.circuitBreaker.timeout) {
          continue;
        }
      }

      if (!this.isProviderConfigured(entry.config)) {
        continue;
      }

      const modelId = entry.health.modelId || this.selectModel(entry.config);
      if (!modelId) continue;

      try {
        const result = await entry.circuitBreaker.execute(
          () => fn(entry.config, modelId),
          undefined,
        );

        this.recordSuccess(entry, Date.now() - (entry.health.lastSuccessAt || Date.now()));

        if (this.currentProviderId !== providerId) {
          this.switchTo(providerId, "recovery");
        }

        return result;
      } catch (error: any) {
        this.recordFailure(entry, error?.message || "Unknown error");

        if (this.currentProviderId === providerId) {
          this.attemptDegradation(providerId);
        }

        continue;
      }
    }

    if (fallbackValue !== undefined) {
      return fallbackValue;
    }

    throw new Error("All AI providers are unavailable");
  }

  async chatCompletion(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<string> {
    return this.execute(
      (provider, modelId) =>
        chatCompletion(provider, modelId, messages, options),
      "",
    );
  }

  async chatCompletionStream(
    messages: ChatMessage[],
    callbacks: StreamCallbacks,
    options?: { temperature?: number; maxTokens?: number; signal?: AbortSignal },
  ): Promise<void> {
    return this.execute(
      (provider, modelId) =>
        chatCompletionStream(provider, modelId, messages, callbacks, options),
    );
  }

  private recordSuccess(entry: ProviderEntry, latencyMs: number): void {
    entry.health.consecutiveFailures = 0;
    entry.health.lastSuccessAt = Date.now();
    entry.health.lastError = null;
    entry.health.latencyMs = latencyMs;
    entry.health.circuitState = entry.circuitBreaker.getState();

    if (latencyMs < this.config.maxLatencyMs * 0.5) {
      entry.health.level = "optimal";
    } else if (latencyMs < this.config.maxLatencyMs) {
      entry.health.level = "degraded";
    } else {
      entry.health.level = "minimal";
    }
  }

  private recordFailure(entry: ProviderEntry, error: string): void {
    entry.health.consecutiveFailures++;
    entry.health.lastFailureAt = Date.now();
    entry.health.lastError = error;
    entry.health.circuitState = entry.circuitBreaker.getState();

    if (entry.health.consecutiveFailures >= this.config.circuitBreaker.failureThreshold) {
      entry.health.level = "unavailable";
    } else if (entry.health.consecutiveFailures > 0) {
      entry.health.level = "degraded";
    }

    logger.warn('Provider ${entry.config.id} failure #${entry.health.consecutiveFailures}: ${error}');
  }

  private attemptDegradation(failedProviderId: ProviderId): void {
    const chain = this.config.degradationChain;
    const currentIndex = chain.indexOf(failedProviderId);

    for (let i = currentIndex + 1; i < chain.length; i++) {
      const nextProviderId = chain[i];
      const entry = this.providers.get(nextProviderId);

      if (!entry) continue;
      if (!this.isProviderConfigured(entry.config)) continue;
      if (entry.health.circuitState === "open") continue;

      this.switchTo(nextProviderId, "degradation");
      return;
    }

    logger.warn('All providers exhausted after ${failedProviderId} failure');
    this.config.onUnavailable?.();
  }

  private switchTo(
    targetProviderId: ProviderId,
    reason: "degradation" | "recovery",
  ): void {
    const previousProviderId = this.currentProviderId;
    this.currentProviderId = targetProviderId;
    this.switchCount++;
    this.lastSwitchAt = Date.now();

    const entry = this.providers.get(targetProviderId);
    if (entry) {
      entry.health.modelId = this.selectModel(entry.config);
    }

    if (reason === "degradation" && previousProviderId) {
      logger.warn('Degrading: ${previousProviderId} -> ${targetProviderId}');
      this.config.onDegradation?.(
        previousProviderId,
        targetProviderId,
        this.getCurrentLevel(),
      );
    } else if (reason === "recovery") {
      logger.warn('Recovering to: ${targetProviderId}');
      this.config.onRecovery?.(targetProviderId);
    }

    this.notifyListeners();
  }

  getCurrentLevel(): DegradationLevel {
    if (!this.currentProviderId) return "unavailable";
    const entry = this.providers.get(this.currentProviderId);
    return entry?.health.level || "unavailable";
  }

  getCurrentProvider(): ProviderConfig | null {
    if (!this.currentProviderId) return null;
    return this.providers.get(this.currentProviderId)?.config || null;
  }

  getCurrentModelId(): string | null {
    if (!this.currentProviderId) return null;
    return this.providers.get(this.currentProviderId)?.health.modelId || null;
  }

  getState(): DegradationState {
    return {
      currentProviderId: this.currentProviderId,
      currentLevel: this.getCurrentLevel(),
      activeModelId: this.getCurrentModelId(),
      providers: Array.from(this.providers.values()).map((e) => ({ ...e.health })),
      lastSwitchAt: this.lastSwitchAt,
      switchCount: this.switchCount,
    };
  }

  startHealthChecks(): void {
    this.stopHealthChecks();

    this.healthCheckTimer = setInterval(() => {
      this.runHealthCheck();
    }, this.config.healthCheckIntervalMs);

    this.recoveryCheckTimer = setInterval(() => {
      this.runRecoveryCheck();
    }, this.config.recoveryCheckIntervalMs);

    logger.warn('Health checks started (interval: ${this.config.healthCheckIntervalMs}ms)');
  }

  stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    if (this.recoveryCheckTimer) {
      clearInterval(this.recoveryCheckTimer);
      this.recoveryCheckTimer = null;
    }
  }

  private async runHealthCheck(): Promise<void> {
    for (const [providerId, entry] of this.providers) {
      if (!this.isProviderConfigured(entry.config)) continue;

      const modelId = entry.health.modelId || this.selectModel(entry.config);
      if (!modelId) continue;

      try {
        const result = await testModelConnectivity(entry.config, modelId, {
          timeoutMs: 10000,
        });

        if (result.success) {
          entry.health.latencyMs = result.latencyMs;
          entry.health.lastSuccessAt = Date.now();

          if (result.latencyMs < this.config.maxLatencyMs * 0.5) {
            entry.health.level = "optimal";
          } else if (result.latencyMs < this.config.maxLatencyMs) {
            entry.health.level = "degraded";
          } else {
            entry.health.level = "minimal";
          }
        } else {
          entry.health.lastError = result.error || "Health check failed";
          entry.health.lastFailureAt = Date.now();
          if (entry.health.level === "optimal") {
            entry.health.level = "degraded";
          }
        }
      } catch {
        entry.health.lastError = "Health check error";
        entry.health.lastFailureAt = Date.now();
        if (entry.health.level === "optimal") {
          entry.health.level = "degraded";
        }
      }
    }

    this.notifyListeners();
  }

  private async runRecoveryCheck(): Promise<void> {
    const chain = this.config.degradationChain;
    if (!this.currentProviderId) return;
    const currentEntry = this.providers.get(this.currentProviderId);

    if (!currentEntry || currentEntry.health.level === "optimal") return;

    const preferredIndex = chain.indexOf(this.currentProviderId);

    for (let i = 0; i < preferredIndex; i++) {
      const providerId = chain[i];
      const entry = this.providers.get(providerId);
      if (!entry) continue;
      if (!this.isProviderConfigured(entry.config)) continue;
      if (entry.health.circuitState === "open") continue;

      const modelId = entry.health.modelId || this.selectModel(entry.config);
      if (!modelId) continue;

      try {
        const result = await testModelConnectivity(entry.config, modelId, {
          timeoutMs: 10000,
        });

        if (result.success) {
          this.switchTo(providerId, "recovery");
          return;
        }
      } catch {
        continue;
      }
    }
  }

  subscribe(listener: (state: DegradationState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (error) {
        logger.error("[AIDegradation] Listener error:", error);
      }
    }
  }

  reset(): void {
    for (const entry of this.providers.values()) {
      entry.circuitBreaker.reset();
      entry.health = {
        providerId: entry.config.id,
        level: "optimal",
        circuitState: "closed",
        consecutiveFailures: 0,
        lastSuccessAt: null,
        lastFailureAt: null,
        lastError: null,
        latencyMs: null,
        modelId: this.selectModel(entry.config),
      };
    }

    this.switchCount = 0;
    this.lastSwitchAt = null;
    this.selectInitialProvider();
    this.notifyListeners();
  }

  destroy(): void {
    this.stopHealthChecks();
    this.listeners.clear();
    this.providers.clear();
    this.currentProviderId = null;
  }
}

// ── Singleton ──

let globalDegradationService: AIDegradationService | null = null;

export function getAIDegradationService(): AIDegradationService {
  if (!globalDegradationService) {
    globalDegradationService = new AIDegradationService();
  }
  return globalDegradationService;
}

export function configureAIDegradationService(
  config: Partial<DegradationConfig>,
): AIDegradationService {
  globalDegradationService = new AIDegradationService(config);
  return globalDegradationService;
}

export function destroyAIDegradationService(): void {
  if (globalDegradationService) {
    globalDegradationService.destroy();
    globalDegradationService = null;
  }
}
