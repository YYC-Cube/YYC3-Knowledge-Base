---
file: YYC3-安全治理-漏洞基线报告.md
title: YYC³ 安全治理 — 漏洞基线与修复记录
description: YYC³ 知识库漏洞扫描基线：Dependabot 告警统计、已实施修复与第三方依赖治理路径
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-10
updated: 2026-11-10
status: stable
tags: [security, vulnerability, dependabot, baseline]
category: governance
language: zh-CN
audience: developers,managers,architects
complexity: intermediate
---

# YYC³ 安全治理 — 漏洞基线与修复记录

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

## 核心理念

**五高架构**：高可用 | 高性能 | 高安全 | 高扩展 | 高智能
**五标体系**：标准化 | 规范化 | 自动化 | 可视化 | 智能化
**五化转型**：流程化 | 数字化 | 生态化 | 工具化 | 服务化
**五维评估**：时间维 | 空间维 | 属性维 | 事件维 | 关联维

---

## 一、扫描口径

| 检查项 | 方式 | 范围 |
| --- | --- | --- |
| 依赖漏洞 | GitHub Dependabot Alerts（REST API） | 全仓库清单文件 |
| 密钥泄露 | 本地正则扫描 + `gitleaks` 工作流 | `docs/`、根文档、`.gitignore` |
| 代码扫描 | GitHub Code Scanning | 未启用（无分析结果） |
| 前端安全基线 | 人工审查（XSS / 外部依赖 / Referrer） | 27 个 HTML 页面 |

## 二、依赖漏洞基线

| 严重级别 | 未关闭告警 |
| --- | --- |
| Critical | **222** |
| High | **1,674** |
| Medium | **1,606** |
| Low | **293** |
| **合计** | **3,795** |

### 2.1 Critical 集中度（Top 12）

| 包 | 生态 | 告警数 |
| --- | --- | --- |
| Pillow / pillow | pip | 130 |
| certifi | pip | 31 |
| golang.org/x/crypto | go | 14 |
| next | npm | 6 |
| wasmtime | rust | 4 |
| tinypool | npm | 4 |
| anyio | pip | 3 |
| zip | rust | 2 |
| storybook | npm | 2 |
| seroval | npm | 2 |
| PyJWT | pip | 2 |

> 结论：漏洞高度集中在**第三方快照仓库的锁文件**中，而非本仓库自研代码。知识库以"原样收录上游项目"为原则，因此不能在根级一次性升级；需按项目逐个升级并验证。

## 三、已实施修复

| # | 修复项 | 说明 |
| --- | --- | --- |
| 1 | 启用 Dependabot 自动安全修复 | `automated-security-fixes` 已开启，后续告警将自动生成修复 PR |
| 2 | 新增 `.github/dependabot.yml` | GitHub Actions 每周分组更新，避免 PR 风暴 |
| 3 | HTML 安全加固 | 27 个页面统一加入 `<meta name="referrer" content="no-referrer">`，减少 Referrer 泄露面 |
| 4 | 密钥扫描 | 未发现 GitHub Token / AWS Key / 私钥 / OpenAI Key 等模式 |
| 5 | 依赖产物隔离 | `.gitignore` 排除 `node_modules`、`.venv`、`dist`、`build`、归档包等 |


### 3.1 按项目升级执行结果（2026-11-10）

| 生态 | 执行方式 | 结果 | 明细 |
| --- | --- | --- | --- |
| pip（uv.lock） | `uv lock --upgrade-package pillow/certifi/anyio/brotli/pyjwt` | **31/31 成功** | Pillow → 13.0.0、certifi → 2026.10.23、PyJWT → 2.15.1；部分项目受 `pillow<13` 约束仍解析到 12.3.0 |
| go | `go get golang.org/x/crypto@v0.52.0 && go mod tidy` | **2/2 成功** | one-api、ollama 的 `go.mod/go.sum` 已更新（x/sys、x/text、x/term 同步升级） |
| npm | `npm install <pkg>@<修复版> --package-lock-only` | **3 组成功** | ragflow/web（dompurify、storybook、tinypool、shell-quote）、nanobot/bridge（baileys）、gateway（form-data） |
| npm | 同上 | **4 组受阻** | ollama/app/ui/app：registry 代理拒绝拉取 `@tailwindcss/oxide-wasm32-wasi` tarball；new-api/web/default：使用 pnpm `catalog:` 协议；litellm ui_unit_tests：`overrides` 与直接依赖冲突；shannon/vercel：pnpm 传递依赖不在升级范围 |
| rust | `cargo update -p wasmtime/zip` | **受阻** | 本机未安装 Rust 工具链（无 `cargo`/`rustup`），Cargo.lock 未改动 |

> Pillow 13 为大版本升级，个别项目 `pyproject.toml` 仍限制 `<13`，需上游放宽约束后才能彻底消除对应告警。


### 3.2 依赖图治理：UI 只读快照（2026-11-17）

**背景**：合并 `YYC3-UI-组件库` 后，Dependabot 告警由 3,795 增至 **71,180**（Critical 3,239）。经抽样，告警集中在 UI 分类下上游组件库的 `package-lock.json` / `pnpm-lock.yaml`（含大量传递依赖），且部分告警指向已删除的旧目录（如 `YYC3-UI-界面组件-ui`），属于依赖图尚未刷新的滞后数据。

**方案对比**：

| 方案 | 可行性 | 结论 |
| --- | --- | --- |
| GitHub 设置中按路径排除依赖图 | GitHub 不支持按路径排除 | 不可行 |
| 逐条 dismiss 告警 | 约 6.7 万条，API 5,000 次/小时 | 需 13+ 小时，不可行 |
| **将 UI 锁文件移出仓库** | 一次提交即可，依赖图重扫后自动关闭对应告警 | **采用** |

**执行**：将 `YYC3-UI-界面组件/**` 下 **187 个锁文件**（`package-lock.json` / `pnpm-lock.yaml` / `yarn.lock` / `bun.lock` / `npm-shrinkwrap.json`）移出跟踪并加入 `.gitignore`；源码与 `package.json` 保留，作为只读快照参考。

**预期效果**：
- UI 分类下由锁文件产生的传递依赖告警将随依赖图刷新自动关闭；
- 直接依赖（`package.json`）仍可能保留少量告警，属可接受范围；
- 其他分类（IDE 153、Tool 57、Agent 55 等锁文件）暂不处理，后续可按同一模式分批治理。

**回滚**：`git checkout <commit>^ -- "YYC3-UI-界面组件/**/<lockfile>"` 可恢复任一锁文件。


### 3.3 第二批：IDE / Tool / Agent 锁文件（2026-11-23 复核）

**复核结果**：Critical **3,505** / High **35,039**（较 11-17 的 3,239 / 33,790 分别 +266 / +1,249）。告警总量随新披露增长，UI 锁文件移除的降幅被新增告警抵消。

**UI 残余分析**：抽样 100 条告警，UI 占 53 条，且 **全部来自 `package.json`**（如 `shadcn-ui/ui/apps/v4/package.json`），说明锁文件移除已生效，剩余为直接依赖告警。

**第二批执行**：移除 3 个分类共 **332 个锁文件**：

| 分类 | 移除锁文件 |
| --- | --- |
| IDE-编辑器内核 | 160 |
| Tool-开发工具链 | 96 |
| Agent-智能体 | 76 |

**说明**：
- 锁文件移除后，对应传递依赖告警将在依赖图刷新后关闭；
- `package.json` 直接依赖告警会保留（体积小、数量可控）；
- 剩余大分类（Frontend 42、Syntax 40、Skills 等）可按同一模式继续处理。

## 四、待治理项（需按项目升级）

| 优先级 | 对象 | 建议动作 |
| --- | --- | --- |
| P0 | `Pillow` / `certifi`（pip） | 在各项目 `requirements.txt` 升级至官方修复版本，并跑冒烟测试 |
| P0 | `golang.org/x/crypto` | `go get -u golang.org/x/crypto && go mod tidy` |
| P1 | `next` / `storybook` / `tinypool`（npm） | `npm audit fix` 后在 CI 中验证构建 |
| P1 | `wasmtime` / `zip`（rust） | `cargo update -p` 至修复版本 |
| P2 | 其余 Medium/Low | 随上游版本迭代滚动更新 |

> 不建议在根目录统一 `npm audit fix`：386 个项目为独立上游快照，跨项目改动会破坏可追溯性。

## 五、验证方式

```bash
# 依赖告警统计
gh api "repos/YYC-Cube/YYC3-Knowledge-Base/dependabot/alerts?state=open&severity=critical&per_page=100" --paginate --jq '.[].number' | wc -l

# 密钥扫描
grep -rInE "(ghp_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|BEGIN (RSA|OPENSSH|EC) PRIVATE KEY)" docs README.md

# 自动修复开关
gh api repos/YYC-Cube/YYC3-Knowledge-Base/automated-security-fixes
```

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| --- | --- | --- | --- |
| v1.3.0 | 2026-11-23 | 第二批锁文件治理：IDE/Tool/Agent 共 332 个移出依赖图 | YYC³ Team |
| v1.2.0 | 2026-11-17 | UI 只读快照锁文件移出依赖图（187 个），应对 71,180 条告警 | YYC³ Team |
| v1.1.0 | 2026-11-10 | 执行按项目升级：pip 31/31、go 2/2、npm 3 组；受阻项与原因入库 | YYC³ Team |
| v1.0.0 | 2026-11-10 | 首次漏洞基线：3,795 条告警统计、启用自动修复、HTML 加固与设备基线 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
