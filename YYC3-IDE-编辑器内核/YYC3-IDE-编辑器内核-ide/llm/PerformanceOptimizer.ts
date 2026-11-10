/**
 * @file: llm/PerformanceOptimizer.ts
 * @description: 性能优化策略 - 虚拟滚动、防抖节流、缓存、懒加载
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: performance,optimization,strategies
 */

import {
  OptimizationType,
  OptimizationStrategy,
  OptimizationSuggestion,
  PerformanceBottleneck,
  MetricType,
  CacheEntry,
  VirtualScrollConfig,
  DebounceThrottleConfig,
} from './PerformanceTypes';

/**
 * 性能优化器
 */
export class PerformanceOptimizer {
  private strategies: Map<OptimizationType, OptimizationStrategy> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private throttleTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeStrategies();
  }

  /**
   * 初始化优化策略
   */
  private initializeStrategies(): void {
    Object.values(OptimizationType).forEach(type => {
      this.strategies.set(type, {
        type,
        enabled: true,
        config: {},
        performance: {
          before: 0,
          after: 0,
          improvement: 0,
        },
      });
    });
  }

  /**
   * 分析性能瓶颈并生成优化建议
   */
  analyzeBottlenecks(bottlenecks: PerformanceBottleneck[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    for (const bottleneck of bottlenecks) {
      const suggestion = this.generateSuggestion(bottleneck);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  /**
   * 生成优化建议
   */
  private generateSuggestion(bottleneck: PerformanceBottleneck): OptimizationSuggestion | null {
    switch (bottleneck.type) {
      case MetricType.RENDER:
        return this.suggestRenderOptimization(bottleneck);
      case MetricType.MEMORY:
        return this.suggestMemoryOptimization(bottleneck);
      case MetricType.NETWORK:
        return this.suggestNetworkOptimization(bottleneck);
      case MetricType.CPU:
        return this.suggestCPUOptimization(bottleneck);
      default:
        return null;
    }
  }

  /**
   * 渲染性能优化建议
   */
  private suggestRenderOptimization(bottleneck: PerformanceBottleneck): OptimizationSuggestion {
    const suggestions = bottleneck.suggestions || [];

    // 检查是否需要虚拟滚动
    if (suggestions.some(s => s.includes('list') || s.includes('items'))) {
      return {
        type: OptimizationType.VIRTUAL_SCROLL,
        title: '实现虚拟滚动',
        description: '对于长列表，使用虚拟滚动可以显著提升渲染性能',
        impact: 'high',
        effort: 'medium',
        code: `
// 使用虚拟滚动示例
import { useVirtualScroll } from './hooks/useVirtualScroll';

const VirtualList = ({ items }) => {
  const { visibleItems, containerProps } = useVirtualScroll({
    items,
    itemHeight: 50,
    containerHeight: 400,
  });

  return (
    <div {...containerProps}>
      {visibleItems.map(item => (
        <div key={item.id} style={{ height: 50 }}>
          {item.content}
        </div>
      ))}
    </div>
  );
};
        `,
        references: ['https://react-virtual.tanstack.com/'],
      };
    }

    return {
      type: OptimizationType.MEMO,
      title: '使用React.memo优化组件',
      description: '对于频繁重渲染的组件，使用React.memo避免不必要的渲染',
      impact: 'medium',
      effort: 'easy',
      code: `
const OptimizedComponent = React.memo(({ data }) => {
  return <div>{data}</div>;
});

// 自定义比较函数
const OptimizedComponent = React.memo(
  ({ data }) => <div>{data}</div>,
  (prevProps, nextProps) => prevProps.data.id === nextProps.data.id
);
      `,
    };
  }

  /**
   * 内存优化建议
   */
  private suggestMemoryOptimization(bottleneck: PerformanceBottleneck): OptimizationSuggestion {
    return {
      type: OptimizationType.CACHE,
      title: '优化内存使用',
      description: '实施内存管理策略，及时清理不需要的数据',
      impact: 'high',
      effort: 'medium',
      code: `
// 使用WeakMap避免内存泄漏
const cache = new WeakMap();

// 及时清理事件监听器
useEffect(() => {
  const handler = () => {};
  element.addEventListener('click', handler);
  return () => element.removeEventListener('click', handler);
}, []);

// 使用内存池
const objectPool = {
  pool: [],
  get() {
    return this.pool.pop() || {};
  },
  release(obj) {
    this.pool.push(obj);
  }
};
      `,
    };
  }

  /**
   * 网络优化建议
   */
  private suggestNetworkOptimization(bottleneck: PerformanceBottleneck): OptimizationSuggestion {
    return {
      type: OptimizationType.LAZY_LOAD,
      title: '实现懒加载和缓存',
      description: '使用懒加载和缓存策略减少网络请求',
      impact: 'high',
      effort: 'medium',
      code: `
// 懒加载组件
const LazyComponent = React.lazy(() => import('./HeavyComponent'));

// 缓存网络请求
const cachedFetch = async (url) => {
  const cached = localStorage.getItem(url);
  if (cached) {
    return JSON.parse(cached);
  }
  const response = await fetch(url);
  const data = await response.json();
  localStorage.setItem(url, JSON.stringify(data));
  return data;
};
      `,
    };
  }

  /**
   * CPU优化建议
   */
  private suggestCPUOptimization(bottleneck: PerformanceBottleneck): OptimizationSuggestion {
    return {
      type: OptimizationType.WEB_WORKER,
      title: '使用Web Worker',
      description: '将CPU密集型任务移到Web Worker中执行',
      impact: 'high',
      effort: 'hard',
      code: `
// 主线程
const worker = new Worker('./worker.js');
worker.postMessage({ data: heavyData });
worker.onmessage = (e) => {
  const result = e.data;
  // 处理结果
};

// worker.js
self.onmessage = (e) => {
  const result = processHeavyData(e.data);
  self.postMessage(result);
};
      `,
    };
  }

  /**
   * 虚拟滚动实现
   */
  createVirtualScroll<T>(config: VirtualScrollConfig): {
    getVisibleItems: (items: T[], scrollTop: number) => T[];
    getTotalHeight: (items: T[]) => number;
  } {
    return {
      getVisibleItems: (items: T[], scrollTop: number) => {
        const startIndex = Math.floor(scrollTop / config.itemHeight);
        const endIndex = Math.min(
          startIndex + Math.ceil(config.containerHeight / config.itemHeight) + config.overscan * 2,
          items.length
        );

        return items.slice(
          Math.max(0, startIndex - config.overscan),
          endIndex
        );
      },
      getTotalHeight: (items: T[]) => items.length * config.itemHeight,
    };
  }

  /**
   * 防抖函数
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    config: DebounceThrottleConfig
  ): (...args: Parameters<T>) => void {
    const key = func.name || 'debounce';

    return (...args: Parameters<T>) => {
      if (this.debounceTimers.has(key)) {
        clearTimeout(this.debounceTimers.get(key)!);
      }

      if (config.leading) {
        func(...args);
      }

      const timer = setTimeout(() => {
        if (config.trailing) {
          func(...args);
        }
        this.debounceTimers.delete(key);
      }, config.delay);

      this.debounceTimers.set(key, timer);
    };
  }

  /**
   * 节流函数
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    config: DebounceThrottleConfig
  ): (...args: Parameters<T>) => void {
    const key = func.name || 'throttle';
    let lastTime = 0;

    return (...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastTime >= config.delay) {
        if (this.throttleTimers.has(key)) {
          clearTimeout(this.throttleTimers.get(key)!);
          this.throttleTimers.delete(key);
        }

        lastTime = now;
        func(...args);
      } else if (!this.throttleTimers.has(key)) {
        const timer = setTimeout(() => {
          lastTime = Date.now();
          func(...args);
          this.throttleTimers.delete(key);
        }, config.delay - (now - lastTime));

        this.throttleTimers.set(key, timer);
      }
    };
  }

  /**
   * 缓存实现
   */
  cacheGet<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.value;
  }

  cacheSet<T>(key: string, value: T, ttl: number = 3600000): void {
    this.cache.set(key, {
      key,
      value,
      timestamp: Date.now(),
      hits: 0,
      ttl,
    });
  }

  cacheClear(): void {
    this.cache.clear();
  }

  /**
   * 懒加载实现
   */
  createLazyLoader<T>(): {
    load: (loader: () => Promise<T>) => Promise<T>;
    preload: (loader: () => Promise<T>) => void;
  } {
    const cache = new Map<string, T>();

    return {
      load: async (loader: () => Promise<T>) => {
        const key = loader.toString();
        if (cache.has(key)) {
          return cache.get(key)!;
        }

        const value = await loader();
        cache.set(key, value);
        return value;
      },
      preload: (loader: () => Promise<T>) => {
        const key = loader.toString();
        if (!cache.has(key)) {
          loader().then(value => cache.set(key, value));
        }
      },
    };
  }

  /**
   * 获取优化策略
   */
  getStrategy(type: OptimizationType): OptimizationStrategy | undefined {
    return this.strategies.get(type);
  }

  /**
   * 更新优化策略
   */
  updateStrategy(type: OptimizationType, config: Partial<OptimizationStrategy>): void {
    const strategy = this.strategies.get(type);
    if (strategy) {
      this.strategies.set(type, { ...strategy, ...config });
    }
  }

  /**
   * 获取所有策略
   */
  getAllStrategies(): OptimizationStrategy[] {
    return Array.from(this.strategies.values());
  }
}
