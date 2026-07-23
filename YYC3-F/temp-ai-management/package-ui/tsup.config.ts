import { defineConfig } from "tsup"

export default defineConfig({
  entry: {
    index: "src/index.ts",
    button: "src/components/Button/index.ts",
    input: "src/components/Input/index.ts",
    badge: "src/components/Badge/index.ts",
    tokens: "src/design-tokens/index.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  treeshake: true,
  minify: true,
  outDir: "dist",
})
