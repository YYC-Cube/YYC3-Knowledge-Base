import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    auth: 'src/auth/index.ts',
    mcp: 'src/mcp/index.ts',
    session: 'src/session/index.ts'
  },
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  external: ['openai', 'ollama', 'zod']
});
