export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  heapUsagePercent: number;
}

export interface MemoryHistory {
  iteration: number;
  configName: string;
  timestamp: string;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  heapUsagePercent: number;
  error: boolean;
}

export interface TestConfig {
  name: string;
  args: string[];
  cwd: string;
  options: {
    include?: string;
    ignore?: string;
    output: string;
    compress?: boolean;
    quiet: boolean;
  };
}

export interface MemoryTestSummary {
  testInfo: {
    iterations: number;
    configurations?: number;
    startTime: string;
    endTime: string;
  };
  memoryHistory: MemoryHistory[];
  analysis: {
    peakHeapUsage: number;
    peakRSSUsage: number;
    errorCount: number;
    averageHeapUsage: number;
    averageRSSUsage: number;
  };
}
