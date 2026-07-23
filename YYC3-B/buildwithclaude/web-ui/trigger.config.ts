import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_jpiratzafqxxuqitrvmi",
  runtime: "node",
  logLevel: "log",
  maxDuration: 10800, // 3 hours max for indexing tasks
  tsconfig: "./tsconfig.json", // Use the same tsconfig to resolve @/ paths
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
    },
  },
  dirs: ["./trigger"],
});
