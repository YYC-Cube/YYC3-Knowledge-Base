/**
 * Memory usage utility functions for tracking and logging memory consumption
 */

export interface MemoryUsage {
  /** Used heap size in MB */
  heapUsed: number;
  /** Total heap size in MB */
  heapTotal: number;
  /** External memory usage in MB */
  external: number;
  /** RSS (Resident Set Size) in MB */
  rss: number;
  /** Heap usage percentage */
  heapUsagePercent: number;
}

/**
 * Get current memory usage statistics
 */
export function getMemoryUsage(): MemoryUsage {
  const memoryUsage = process.memoryUsage();

  // Convert bytes to MB
  const heapUsed = Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100;
  const heapTotal = Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100;
  const external = Math.round((memoryUsage.external / 1024 / 1024) * 100) / 100;
  const rss = Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100;

  const heapUsagePercent = Math.round((heapUsed / heapTotal) * 100 * 100) / 100;

  return {
    heapUsed,
    heapTotal,
    external,
    rss,
    heapUsagePercent,
  };
}

/**
 * Format memory usage for display
 */
export function formatMemoryUsage(usage: MemoryUsage): string {
  return `${usage.heapUsed}MB/${usage.heapTotal}MB (${usage.heapUsagePercent}%) RSS: ${usage.rss}MB`;
}

/**
 * Calculate the difference between two memory usage measurements
 */
export function calculateMemoryDiff(before: MemoryUsage, after: MemoryUsage): MemoryUsage {
  return {
    heapUsed: Math.round((after.heapUsed - before.heapUsed) * 100) / 100,
    heapTotal: Math.round((after.heapTotal - before.heapTotal) * 100) / 100,
    external: Math.round((after.external - before.external) * 100) / 100,
    rss: Math.round((after.rss - before.rss) * 100) / 100,
    heapUsagePercent: Math.round((after.heapUsagePercent - before.heapUsagePercent) * 100) / 100,
  };
}
