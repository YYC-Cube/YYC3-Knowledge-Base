# Ollama LLM Platform

本地私有部署大模型平台，支持多模型切换、Prompt 场景管理和知识问答。

## 快速开始

1. 拉取模型  
   `npm run pull-models`

2. 启动服务  
   `npm run dev`

3. 浏览器访问 [http://localhost:3000/](http://localhost:3000/)

## 目录结构

- app/              Next.js 前端与 API 路由
- components/       主要前端组件
- content/          Prompt、FAQ、模型配置等
- scripts/          启动与同步脚本
- public/           静态资源
- types/            TypeScript 类型定义

## 主要特性

- Ollama 本地模型推理，支持多模型热切换
- Prompt 场景自定义，支持 YAML 配置
- 内容/脚本全 Git 管理，便于团队协作
- 支持 FAQ/知识库拓展

## 依赖环境

- Node.js 20+
- Ollama 0.1.0+
- macOS/Linux (推荐)

## 常用命令

- `npm run dev`         启动开发环境
- `npm run build`       构建生产环境
- `npm run start`       启动生产环境
- `npm run pull-models` 批量拉取主流大模型

## 贡献

欢迎提交 PR 或 issue！

---

## 增量类型检查缓存策略（CI）

为提升 CI 反馈速度与一致性，我们采用 TypeScript 增量类型检查并结合缓存策略。核心原则：不提交增量产物到仓库，仅通过 CI 缓存复用。

**策略要点**
- 忽略增量产物：`.gitignore` 中加入 `*.tsbuildinfo`，避免跨平台污染。
- 增量类型检查：在 CI 快检 Job 与完整矩阵 Job 中运行 `npx tsc -p tsconfig.json --noEmit --incremental`。
- 缓存复用：
  - `actions/setup-node@v4` 配置 `cache: npm`，自动缓存 `~/.npm`。
  - 使用 `actions/cache@v3` 缓存 `tsconfig.tsbuildinfo`；快检 Job 额外缓存 `node_modules`，在无锁仓库时提升安装速度。
- 智能安装：CI 步骤根据锁文件存在与否自动选择 `npm ci` 或 `npm install`。

**CI 关键片段**
- 智能安装与增量类型检查（完整矩阵 Job）：

```
- uses: actions/setup-node@v4
  with:
    node-version: ${{ matrix.node }}
    cache: npm

- name: Cache TS build info
  uses: actions/cache@v3
  with:
    path: tsconfig.tsbuildinfo
    key: ${{ runner.os }}-node-${{ matrix.node }}-tsbuild-${{ hashFiles('tsconfig.json') }}
    restore-keys: |
      ${{ runner.os }}-node-${{ matrix.node }}-tsbuild-
      ${{ runner.os }}-tsbuild-

- name: Install dependencies (prefer npm ci)
  run: |
    if [ -f package-lock.json ]; then
      npm ci
    else
      npm install
    fi

- name: Type Check
  run: npm run typecheck
```

- 快速改动检查（快检 Job）：

```
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: npm

- name: Cache node_modules
  uses: actions/cache@v3
  with:
    path: node_modules
    key: ${{ runner.os }}-node-20-modules-${{ hashFiles('package-lock.json') }}-${{ hashFiles('package.json') }}
    restore-keys: |
      ${{ runner.os }}-node-20-modules-
      ${{ runner.os }}-modules-

- name: Cache TS build info
  uses: actions/cache@v3
  with:
    path: tsconfig.tsbuildinfo
    key: ${{ runner.os }}-node-20-tsbuild-${{ hashFiles('tsconfig.json') }}

- name: TS Project Incremental Type Check (changed only)
  if: steps.diff.outputs.ts_files != ''
  run: |
    npx tsc -p tsconfig.json --noEmit --incremental
```

**常见问题（FAQ）**
- 为什么不提交 `tsconfig.tsbuildinfo`？
  - 该文件包含与平台/Node 版本相关的编译信息，入库会造成跨平台增量缓存污染与冲突；使用 CI 缓存更可靠。🌹
- 无锁仓库时如何优化安装速度？
  - 已启用 `setup-node@v4` 的 `cache: npm`（缓存 `~/.npm`）并在快检 Job 中缓存 `node_modules`；同时智能安装会在无锁时使用 `npm install`。🌹
- 什么时候使用 `npm ci`？
  - 当提交了 `package-lock.json` 时，CI 会自动选择 `npm ci`，安装更快且可复现；建议尽快提交锁文件。🌹
- 快检 Job 是否覆盖跨文件类型检查？
  - 快检 Job 使用项目级增量 `tsc`，能考虑跨文件依赖；如需更极致的速度，可改为“文件级 `tsc --noEmit <files>`”，但严谨性略低。🌹
- 本地开发需关注什么？
  - 建议保留 `pre-commit` 的 `typecheck` 与 `lint-staged` 配置，确保提交质量；本地不生成/提交 `tsbuildinfo`。🌹
