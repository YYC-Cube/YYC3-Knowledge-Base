/**
 * @file: AsyncErrorBoundary.tsx
 * @description: 异步操作错误边界 - 捕获异步错误并提供降级UI
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-05
 * @updated: 2026-04-05
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: error-boundary,async,error-handling,react
 */

// ================================================================
// Async Error Boundary - 异步操作错误边界
// ================================================================
//
// 功能：
//   - 捕获异步操作错误
//   - 提供降级UI
//   - 自动重试机制
//   - 错误日志记录
//   - 错误恢复策略
//
// 使用场景：
//   - API请求错误处理
//   - 数据加载错误处理
//   - 文件操作错误处理
//   - 组件渲染错误处理
// ================================================================

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from "../services/Logger";

// ── Types ──

export interface AsyncErrorInfo {
  error: Error;
  errorInfo?: ErrorInfo;
  timestamp: number;
  componentStack?: string;
  retryCount: number;
  context?: Record<string, unknown>;
}

export interface AsyncErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: AsyncErrorInfo, retry: () => void) => ReactNode);
  onError?: (error: AsyncErrorInfo) => void;
  onRetry?: (error: AsyncErrorInfo) => void;
  onRecover?: () => void;
  maxRetries?: number;
  retryDelay?: number;
  resetKeys?: unknown[];
  isolate?: boolean;
  logErrors?: boolean;
}

export interface AsyncErrorBoundaryState {
  hasError: boolean;
  error: AsyncErrorInfo | null;
}

// ── Default Fallback Component ──

const DefaultFallback: React.FC<{
  error: AsyncErrorInfo;
  onRetry: () => void;
  onDismiss: () => void;
}> = ({ error, onRetry, onDismiss }) => {
  const isNetworkError = error.error.message.includes('network') ||
    error.error.message.includes('fetch') ||
    error.error.message.includes('timeout');

  const isAuthError = error.error.message.includes('401') ||
    error.error.message.includes('unauthorized');

  return (
    <div
      role="alert"
      style={{
        padding: '24px',
        borderRadius: '12px',
        background: 'var(--error-bg, #fef2f2)',
        border: '1px solid var(--error-border, #fecaca)',
        color: 'var(--error-text, #991b1b)',
        maxWidth: '600px',
        margin: '16px auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ fontSize: '24px' }}>
          {isNetworkError ? '🌐' : isAuthError ? '🔐' : '⚠️'}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>
            {isNetworkError
              ? '网络连接错误'
              : isAuthError
                ? '认证失败'
                : '操作失败'}
          </h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', opacity: 0.9 }}>
            {isNetworkError
              ? '请检查网络连接后重试'
              : isAuthError
                ? '请重新登录后再试'
                : error.error.message}
          </p>

          {error.retryCount > 0 && (
            <p style={{ margin: '0 0 12px 0', fontSize: '12px', opacity: 0.7 }}>
              已尝试重试 {error.retryCount} 次
            </p>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            {!isAuthError && (
              <button
                onClick={onRetry}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  background: 'var(--error-text, #991b1b)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                重试
              </button>
            )}
            <button
              onClick={onDismiss}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                background: 'transparent',
                color: 'var(--error-text, #991b1b)',
                border: '1px solid var(--error-border, #fecaca)',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Loading Fallback ──

export const LoadingFallback: React.FC<{ message?: string }> = ({ message = '加载中...' }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px',
      color: 'var(--text-secondary, #666)',
    }}
  >
    <div
      style={{
        width: '24px',
        height: '24px',
        border: '2px solid var(--border-color, #e0e0e0)',
        borderTopColor: 'var(--primary-color, #2196f3)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginRight: '12px',
      }}
    />
    {message}
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// ── Async Error Boundary Class Component ──

export class AsyncErrorBoundary extends Component<
  AsyncErrorBoundaryProps,
  AsyncErrorBoundaryState
> {
  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private eventListeners: Array<() => void> = [];

  static getDerivedStateFromError(error: Error): Partial<AsyncErrorBoundaryState> {
    return {
      hasError: true,
      error: {
        error,
        timestamp: Date.now(),
        retryCount: 0,
      },
    };
  }

  constructor(props: AsyncErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  componentDidMount(): void {
    this.setupEventListeners();
  }

  componentDidUpdate(prevProps: AsyncErrorBoundaryProps): void {
    const { resetKeys } = this.props;
    const { hasError } = this.state;

    if (hasError && resetKeys && prevProps.resetKeys) {
      if (resetKeys.some((key, i) => key !== prevProps.resetKeys?.[i])) {
        this.reset();
      }
    }
  }

  componentWillUnmount(): void {
    this.cleanup();
  }

  private setupEventListeners(): void {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      this.handleError(event.reason, undefined, { type: 'unhandled-rejection' });
    };

    const handleError = (event: ErrorEvent) => {
      if (this.props.isolate) {
        this.handleError(event.error, undefined, { type: 'global-error' });
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    this.eventListeners.push(
      () => window.removeEventListener('unhandledrejection', handleUnhandledRejection),
      () => window.removeEventListener('error', handleError)
    );
  }

  private cleanup(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners = [];
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.handleError(error, errorInfo);
  }

  private handleError(
    error: Error,
    errorInfo?: ErrorInfo,
    context?: Record<string, unknown>
  ): void {
    const { onError, logErrors = true } = this.props;

    const asyncErrorInfo: AsyncErrorInfo = {
      error,
      errorInfo,
      timestamp: Date.now(),
      componentStack: errorInfo?.componentStack ?? undefined,
      retryCount: this.state.error?.retryCount || 0,
      context,
    };

    if (logErrors) {
      logger.error('[AsyncErrorBoundary] Error caught:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo?.componentStack,
        context,
      });
    }

    onError?.(asyncErrorInfo);

    this.setState({
      hasError: true,
      error: asyncErrorInfo,
    });
  }

  private handleRetry = (): void => {
    const { maxRetries = 3, retryDelay = 1000, onRetry } = this.props;
    const { error } = this.state;

    if (!error) return;

    if (error.retryCount >= maxRetries) {
      logger.warn('Max retries exceeded');
      return;
    }

    const newError: AsyncErrorInfo = {
      ...error,
      retryCount: error.retryCount + 1,
      timestamp: Date.now(),
    };

    onRetry?.(newError);

    this.retryTimeoutId = setTimeout(() => {
      this.setState({ hasError: false, error: null }, () => {
        this.props.onRecover?.();
      });
    }, retryDelay * error.retryCount);
  };

  private handleDismiss = (): void => {
    this.setState({ hasError: false, error: null });
  };

  private reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { children, fallback } = this.props;
    const { hasError, error } = this.state;

    if (hasError && error) {
      if (typeof fallback === 'function') {
        return fallback(error, this.handleRetry);
      }

      if (fallback) {
        return fallback;
      }

      return (
        <DefaultFallback
          error={error}
          onRetry={this.handleRetry}
          onDismiss={this.handleDismiss}
        />
      );
    }

    return children;
  }
}

// ── Higher-Order Component ──

export function withAsyncErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<AsyncErrorBoundaryProps, 'children'>
): React.FC<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const ComponentWithErrorBoundary: React.FC<P> = (props) => (
    <AsyncErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </AsyncErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withAsyncErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}

// ── useAsyncError Hook ──

import { useState, useCallback } from 'react';

export interface UseAsyncErrorResult {
  error: Error | null;
  isLoading: boolean;
  execute: <T>(fn: () => Promise<T>) => Promise<T | null>;
  reset: () => void;
  retry: () => void;
}

export function useAsyncError(): UseAsyncErrorResult {
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFn, setLastFn] = useState<(() => Promise<unknown>) | null>(null);

  const execute = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    setError(null);
    setIsLoading(true);
    setLastFn(() => fn);

    try {
      const result = await fn();
      setIsLoading(false);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setIsLoading(false);
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
  }, []);

  const retry = useCallback(async () => {
    if (lastFn) {
      await execute(lastFn);
    }
  }, [lastFn, execute]);

  return { error, isLoading, execute, reset, retry };
}

// ── useRetry Hook ──

export interface UseRetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

export function useRetry<T>(
  fn: () => Promise<T>,
  options: UseRetryOptions = {}
): {
  execute: () => Promise<T>;
  isLoading: boolean;
  error: Error | null;
  attempt: number;
  reset: () => void;
} {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    onRetry,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  const execute = useCallback(async (): Promise<T> => {
    setIsLoading(true);
    setError(null);

    for (let i = 0; i <= maxRetries; i++) {
      setAttempt(i);

      try {
        const result = await fn();
        setIsLoading(false);
        return result;
      } catch (err) {
        const currentError = err instanceof Error ? err : new Error(String(err));
        setError(currentError);

        if (i < maxRetries) {
          onRetry?.(i + 1, currentError);
          const delay = exponentialBackoff
            ? retryDelay * Math.pow(2, i)
            : retryDelay;
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          setIsLoading(false);
          throw currentError;
        }
      }
    }

    setIsLoading(false);
    throw new Error('Max retries exceeded');
  }, [fn, maxRetries, retryDelay, exponentialBackoff, onRetry]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setAttempt(0);
  }, []);

  return { execute, isLoading, error, attempt, reset };
}

// ── Export All ──

export default AsyncErrorBoundary;
