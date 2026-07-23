#!/usr/bin/env node
/**
 * 多路并行写书：在本书根下初始化 .fbs 共享工件（测试报告 01·02·07·08 对齐）
 *
 * 用法（技能包根目录）：
 *   node scripts/init-fbs-multiagent-artifacts.mjs --book-root <本书工作区根路径> [--force]
 *
 * 创建/更新（不覆盖已有非空文件，除非 --force）：
 *   .fbs/chapter-status.md          ← 【AUTHORITY】权威真相来源；本书根镜像为只读快照
 *   chapter-status.md（本书根，只读快照，勿单独维护）
 *   .fbs/chapter-dependencies.json
 *   .fbs/book-context-brief.md
 *   .fbs/GLOSSARY.md
 *   .fbs/project-config.json
 *   .fbs/search-ledger.jsonl
 *   .fbs/member-heartbeats.json
 *   .fbs/task-queue.json
 *   .fbs/rate-budget.json           ← 全局限流预算追踪（A5/RC-1）
 *   .fbs/high-quality-domains.json  ← 优质域名台账（A6/RL-1）
 *   .fbs/material-library.md        ← 虚拟书房素材库（S0-E / materialLibrary）
 *   .fbs/author-meta.md             ← 作者元知识锁定（H1 / S0-M，声音基准）
 *   .fbs/insight-cards.md           ← 认知金句卡片（H4，三级沉淀第一级）
 *   .fbs/术语锁定记录.md            ← 概念锁定动态哨兵追踪文件（v1.8 新增，termConsistencyTracking）
 *   .fbs/规范执行状态.md            ← 规范执行状态运行时追踪（v1.8 新增，esmExecutionTracking）
 *   .fbs/esm-state.md               ← ESM 当前状态机读摘要（v1.8.0 审计落地；配合 fbs-record-esm-transition.mjs）
 *   .fbs/writing-notes/pending-verification.md ← 待核实台账（pendingVerificationTracking / P1-4 CLI）
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const o = { bookRoot: null, force: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--book-root") o.bookRoot = argv[++i];
    else if (a === "--force") o.force = true;
  }
  return o;
}

function writeIfAbsent(filePath, content, force) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(filePath)) {
    const cur = fs.readFileSync(filePath, "utf8").trim();
    if (cur.length > 0 && !force) {
      console.log("skip (exists):", filePath);
      return;
    }
  }
  fs.writeFileSync(filePath, content, "utf8");
  console.log("write:", filePath);
}

const CHAPTER_STATUS = `# 章节完成状态台账（多路并行 S3）
<!-- AUTHORITY: 本文件是章节状态的唯一权威来源（Single Source of Truth）。
     本书根 chapter-status.md 为只读快照，仅供工具扫描；日常维护只更新本文件。
     修改后可通过 node scripts/sync-book-chapter-index.mjs 同步快照。 -->

> **单一真相来源**（测试报告 01）：team-lead 与各 Writer 同步更新；**勿**仅依赖宿主 MEMORY 口头「全完成」而跳过磁盘核对。  
> **权威路径**：\`.fbs/chapter-status.md\`（本文件）；本书根 \`chapter-status.md\` 为只读快照，由 \`sync-book-chapter-index.mjs\` 自动同步，**请勿手动维护快照**。  
> 建议每次合并前运行：\`node scripts/sync-book-chapter-index.mjs --book-root <本书根> --json-out .fbs/chapter-scan-result.json\`

最后更新：（ISO 时间）

| 章节ID | 文件名 | 状态 | 完成时间 | 字数 | 依赖章节 | 质量自检(折算/10) | 易多义缩写已核对 |
|--------|--------|------|----------|------|----------|-------------------|------------------|
| ch01 | [S3-Ch01] 第一章.md | 未开始 | — | — | — |  |  |

状态建议：\`未开始\` / \`进行中\` / \`待审\` / \`已完成\`。
`;

const CHAPTER_DEPS = {
  version: 1,
  _warning: "以下 chapters 均为示例数据，请在 S2 目录确认后全部替换为实际章节",
  description:
    "章节依赖图：team-lead 按 S2 实际改 id / fileNameContains / dependsOn / batch；配合 sync-book-chapter-index 与 chapter-scheduler-hint",
  chapters: [
    {
      id: "ch06",
      title: "第六章（示例：双线对决）",
      fileNameContains: "第六章",
      dependsOn: ["ch04", "ch05"],
      batch: 2,
    },
    {
      id: "ch04",
      title: "第四章（示例）",
      fileNameContains: "第四章",
      dependsOn: [],
      batch: 1,
    },
    {
      id: "ch05",
      title: "第五章（示例）",
      fileNameContains: "第五章",
      dependsOn: [],
      batch: 1,
    },
    {
      id: "ch07",
      title: "第七章（示例：易漏章）",
      fileNameContains: "第七章",
      dependsOn: [],
      batch: 1,
    },
  ],
};

const GLOSSARY = `# 本书术语表（.fbs/GLOSSARY.md）

> **并行写作 P0**（测试报告 02）：多义缩写必须在本表锁定**本书唯一含义**；Writer 任务须附带本路径。

## 缩写与专名

| 缩写/专名 | 本书唯一含义 | 禁止混用的其他含义 |
|-----------|-------------|-------------------|
| OPC | （主编填写，如 One-Person Company） | 须与 abbreviation-audit-lexicon.json 对照 |
| MCP | Model Context Protocol（首次可写全称） | — |

（可增删行；**terminology-gate.mjs --strict** 将检查多义词条是否在本表出现。）
`;

const BOOK_CONTEXT = `# 全书上下文摘要（并行写作共享）

> 各 Writer 写作前读一遍；更新后通过 broadcast 或 team-lead 通知刷新。

## 全书脉络锚（corePremise）

**核心脉络**：{待 S2.5 填写，≤25字，全书论证的唯一中心主张}

## 已锁定数据点（跨章须一致）

| 数据点 | 数值/表述 | 来源 | 锁定章节 |
|--------|-----------|------|----------|
| （示例） |  |  |  |

## 术语与缩写（本书唯一含义）

见 \`.fbs/GLOSSARY.md\` 或 S1/S2 术语表；勿在正文自创第二含义。

## 各章核心结论与末段钩子（防重复与断档）

| 章 | 一句结论 | 末段是否指向下章 | updatedAt |
|----|----------|------------------|-----------|
|  |  |  |  |
`;

const PROJECT_CONFIG = {
  description: "FBS-BookWriter 本书项目配置（多智能体对齐）",
  skillVersion: "1.59D",
  lockedAt: "",
  skillVersionNote:
    "v1.59D 正式版：本书启动时 skillVersion 自动从 SKILL.md 同步当前版本，lockedAt 记录 ISO 日期。技能包升级后由 team-lead 评估是否更新（见 SKILL.md「技能包版本与本书锁定」）",
  skillPolicyVersionNote: "与 references/05-ops/search-policy.json version 对齐维护",
  multiAgentMode: "parallel_writing",
  multiAgentModeNote:
    "parallel_writing = 多 Writer 并行；single_writer = 单会话逐章。见 references/05-ops/architecture-modes.md",
  genreLevel: "",
  genreTag: "",
  genreNote:
    "S0/S1 后必须写入：genreLevel=\"A\"/\"B\"/\"C\"；genreTag 为体裁标签（如 历史通史/商业手册/白皮书）。S3 门禁将据此决定流程深度与检索基线。",
  s0TimestampBaseline: "",
  s0TimestampQuery: "",
  s0TimestampNote:
    "S0 第一轮强制检索当前日期后写入，例如：s0TimestampBaseline=2026-04-01，s0TimestampQuery=今天日期。",
  s0SearchStatus: "pending",
  s0SearchStatusNote:
    "pending / partial-failed / all-failed-model-knowledge-only / ok。检索失败不得静默继续。",
  s25Enabled: false,
  s25EnabledNote: "S2.5 阶段启动时由 team-lead 改为 true；enforce-search-policy 将据此要求账本含 S2.5 记录",
  s25ActionPlanStatus: "",
  s25ActionPlanStatusNote: "S2.5 行动计划状态：acknowledged-incomplete（用户知情接受）/ skipped / done",
  writingTrack: "",
  writingTrackNote: "快车道（fast）/ 慢车道（deep）；S1 定位后写入，影响每章 Brief 粒度与检索密度",
  briefGranularity: "",
  briefGranularityNote: "章节 Brief 粒度：minimal / standard / detailed；S2 目录确认后写入",
  materialLibraryReady: false,
  materialLibraryReadyNote: "S0-E 虚拟书房初始化后改为 true；false 时进入 S3 会发出素材充分度预警",
  fbsInitMode: "",
  fbsInitModeNote: "auto（脚本初始化）/ manual-minimal（手动最小初始化）；由初始化脚本或用户手动写入",
  parallelWriting: {
    enabled: true,
    defaultEnableG4ForCitation: true,
    requireChapterStatusUpdates: true,
    fileNamingConvention: "[S3-ChNN] 第N章-标题.md",
  },
};

const HEARTBEATS = {
  version: 1,
  members: {},
  note: "成员每 ≤60s 由宿主或人工更新 lastHeartbeat（ISO）；team-lead 检查本文件中各成员时间戳巡检超时",
};

const TASK_QUEUE = {
  version: 1,
  tasks: [],
  note: "记录待处理与失败任务；失败后 retry 计数见各 task，由 team-lead 人工或宿主重派",
};

/** A5/RC-1：全局限流预算追踪初始模板 */
const RATE_BUDGET = {
  _note: "本文件记录本书项目的累计限流命中率，供跨会话续写时感知累积限流压力；每次触发限流时由宿主或 team-lead 手动更新，或通过集成脚本自动维护。",
  totalRateLimitHits: 0,
  totalSearches: 0,
  rateLimitRate: 0,
  sessionStartMs: 0,
  sessionDurationMs: 0,
  lastRateLimitHitMs: 0,
  guideline: "rateLimitRate > 0.3 时建议：1) 降低 s0MaxConcurrentQueries；2) 增大 minIntervalBetweenQueriesMs；3) 使用 M2 编级预检索模式",
};

/** A6/RL-1：优质域名台账初始模板（searchEnhancement.sourceQualityTracking 对齐） */
const HIGH_QUALITY_DOMAINS = {
  _note: "本文件记录本书检索过程中发现的高质量信息源（qualityScore≥4）；后续章节检索优先向此表域名发起 WebFetch。",
  _schema: "{ domain, firstSeenAt, sourceType, qualityScore, notes }",
  domains: [],
  lastUpdatedAt: "",
};

/** 虚拟书房素材库初始模板（S0-E / materialLibrary 对齐） */
const MATERIAL_LIBRARY = `# 虚拟书房素材库（.fbs/material-library.md）

> **用途**：统一存放作者提供素材、联网搜索存盘素材、临时追加素材。S3 成文时优先从本库取用。  
> **权威字段**：\`search-policy.json → materialLibrary\` 与 \`materialSufficiency\`。  
> **更新方式**：
> - 用户说「补充素材：[内容]」→ 模型自动追加
> - S0/S3 检索发现高质量片段 → 自动存盘（kind=material）
> - 章内自审卡完成后 → 更新已取用条目状态

## 充分度快照（S2.5 盘点时填写）

- **全书预计字数**：{N}万字
- **建议最低素材条数**：{M}条（来自 \`materialSufficiency.thresholds\`）
- **当前已入库**：{X}条（案例 {a}条 / 数据 {d}条 / 引言 {q}条 / 其他 {o}条）
- **充分度评级**：{充足 ✅ / 偏少 ⚠️ / 严重不足 ❌}
- **盘点时间**：{ISO}

> 阈值速查（来源：\`search-policy.json\` → \`materialSufficiency.thresholds\`）：  
> 5–10万字 → 推荐≥30条，<10条=严重不足❌ | 10–30万字 → 推荐≥80条，<25条=❌  
> 30–100万字 → 推荐≥200条，<60条=❌ | >100万字 → 推荐≥500条，<150条=❌

---

## 素材条目

<!-- 格式参考：
## 素材条目 · MAT-001

- **类型**：案例
- **来源**：用户提供 / WebSearch:{query} / 模型知识（需标注）
- **适用章节**：ch03 / 通用
- **内容摘要**（≤200字）：...
- **状态**：待取用 / 已取用（ch03）/ 放弃（原因）
- **入库时间**：{ISO}
-->

（暂无素材，请在 S0 调研完成后按 S0-E「虚拟书房初始化」协议补充）
`;

/** 作者元知识锁定初始模板（H1 / S0-M 对齐） */
const AUTHOR_META = `# 作者元知识（.fbs/author-meta.md）

> **用途**：锁定全书声音基准——核心主张、目标读者画像、作者风格、判断标准、变现路径。  
> **更新时机**：S0-M「作者元知识锁定」阶段由作者填写；写作过程中可追加但不可随意改动已锁定字段。  
> **引用方式**：每章 Chapter Brief 自动引用「作者声音」字段作为文风约束。

## 一、全书核心主张（P0 必填）

> 读者合上书记住的那一句话（≤25字）

**核心主张**：{待填写}  
**锁定时间**：{ISO}

---

## 二、目标读者画像

**职位/行业/痛点**：{待填写}  
**读完本书后能做到**：{待填写}

---

## 三、作者声音（风格元知识）

**风格标签**（填写字母或自定义）：{待填写}

> A. 平实直白，说人话  B. 专业严谨，有数据  C. 故事驱动，有温度
> D. 启发式追问，留白  E. 犀利观点，敢亮剑  F. 自定义：___

**补充说明**（可选）：{待填写}

---

## 四、判断标准

**什么样的内容「值得写进这本书」**：{待填写}  
**什么是这本书「绝对不写」的**：{待填写}

---

## 五、变现路径意图

**选择的变现路径**：{出版 / 电子书 / ToB采购 / 课程配套 / 品牌建设 / 其他}  
**优先级说明**：{待填写}
`;

/** 认知金句卡片初始模板（H4 / 三级沉淀第一级 对齐） */
const INSIGHT_CARDS = `# 认知金句卡片（.fbs/insight-cards.md）

> **用途**：沉淀每章最值得被记住的 1–3 句话（三级沉淀第一级：洞察级），供跨章引用、S6书摘提取和作品进化迭代使用。  
> **更新时机**：每章章内自审卡「认知金句卡片」字段填写后，模型自动追加。  
> **使用方式**：后续章节引用时，可通过「呼应金句」加强全书思想连贯性；S6 可一键提取为「全书精华书摘」。

## 金句总览

| 编号 | 金句 | 来源章节 | 类型 | 已被引用 |
|------|------|---------|------|--------|
| IC-001 | （暂无，待章节完成后填入） | — | — | — |

---

## 金句详情

<!-- 格式参考：
## IC-001

- **金句**：书不是写出来的，是素材喂出来的。
- **来源**：ch03 · §素材管理
- **类型**：方法论 / 观点 / 数据 / 故事 / 比喻
- **字数**：16字
- **已被引用**：ch07（呼应）/ 未引用
- **入库时间**：{ISO}
-->

（暂无金句，S3 成文后按章内自审卡「认知金句卡片」字段自动填入）
`;

/** 概念锁定动态哨兵追踪文件（termConsistencyTracking / v1.8 新增） */
const TERM_LOCK_RECORD = `# 术语锁定记录（.fbs/术语锁定记录.md）

> **用途**：S0 概念定义后锁定全书核心术语，防止跨章节术语漂移（概念锁定动态哨兵，P0）。  
> **更新时机**：S0 简报出现「新概念定义」节后立即创建/追加；每章成文前 Chapter Brief 须查询本文件。  
> **CLI审计**：node scripts/audit-term-consistency.mjs --book-root <书稿根> --glob "chapters/*.md"

## 锁定期术语

| 术语 | 标准写法 | 首次定义位置 | 锁定时间 | 确认状态 |
|------|---------|------------|---------|---------|
| （暂无，S0 概念定义后填写） | — | — | — | pending |

## 禁用变体

| 禁用变体 | 建议替换 | 原因 |
|---------|---------|------|
| （暂无，发现变体时追加） | — | — |

## 替换记录

（追加模式：时间 | 原表述 | 替换为 | 章节）
`;

/** 规范执行状态运行时追踪（esmExecutionTracking / v1.8 新增） */
const NORM_EXEC_STATE = `# 规范执行状态（.fbs/规范执行状态.md）

> **用途**：运行时追踪当前书稿对 FBS-BookWriter P0 规范的执行状态，供跨会话审计使用。  
> **更新时机**：每次状态切换（ESM 状态转换宣告）后更新本文件；S5 终审时须核对全部 P0 项。  
> **参考规范**：search-policy.json → esmAnnouncementAtomicity / termConsistencyTracking / yearSourceLedger

## ESM 状态追踪

| 时间 | 旧状态 | 新状态 | 触发原因 | 出口条件 |
|------|--------|--------|---------|---------|
| （ISO） | IDLE | INTAKE | 项目初始化 / 用户触发 | — |

## 切换日志

（新记录追加在**本段最上方**；每次 ESM 切换建议运行：\`node scripts/fbs-record-esm-transition.mjs --book-root <本书根> --from <旧> --to <新> --reason "..."\`）

## P0 执行检查单

| P0 项目 | 要求 | 当前状态 | 最后核查时间 |
|---------|------|---------|------------|
| S0 时间基准 | 简报首行有「时间基准：YYYY年MM月DD日」 | ⬜ 待核查 | — |
| 事实标注协议 | 具体数字/比例/绝对化陈述已标注来源 | ⬜ 待核查 | — |
| 概念锁定动态哨兵 | .fbs/术语锁定记录.md 已创建且完整 | ⬜ 待核查 | — |
| ESM 状态宣告原子化 | 状态切换宣告与 ESM 自检同一次输出 | ⬜ 待核查 | — |
| S3 门禁 | s3-start-gate.mjs 已通过 | ⬜ 待核查 | — |

## CLI 自动化进度（升级后审计 · 可勾选）

> 主编或 CI 每完成一步可将「⬜」改为「✅」并填日期（手工即可，无需脚本）。

| 步骤 | 命令摘要 | 已执行 |
|------|----------|--------|
| .fbs 初始化 | \`node scripts/init-fbs-multiagent-artifacts.mjs --book-root <本书根>\` | ⬜ |
| S3 启动门禁 | \`node scripts/s3-start-gate.mjs --skill-root <技能根> --book-root <本书根>\`（有成稿时**自动**跑时间标签 + 术语 \`--scan-book-s3\`，默认警告） | ⬜ |
| 时间标签阻断模式 | S3 门禁加 \`--audit-temporal-enforce\` | ⬜ |
| 术语阻断模式 | S3 门禁加 \`--audit-term-enforce\`（禁用变体出现在正文则阻断） | ⬜ |
| 时间标签单独全扫 | \`node scripts/audit-temporal-accuracy.mjs --book-root <本书根> --scan-book-s3\` | ⬜ |
| 术语单独全扫 | \`node scripts/audit-term-consistency.mjs --book-root <本书根> --scan-book-s3\` | ⬜ |
| S5 待核实清零 | \`node scripts/audit-pending-verification.mjs --book-root <本书根> --enforce\` | ⬜ |
| P0→CLI 总表 | \`references/05-ops/p0-cli-map.md\` | ⬜ |
| ESM 落盘 | \`node scripts/fbs-record-esm-transition.mjs --book-root <本书根> --from … --to … --reason "…"\` | ⬜ |

## 违规记录

（追加模式：时间 | P0项 | 违规描述 | 处理方式）
`;

/** ESM 机读状态初值（与 section-3-workflow ESM  IDLE 对齐） */
const ESM_STATE_INITIAL = `---
currentState: "IDLE"
previousState: "IDLE"
lastTransitionAt: ""
transitionReason: ""
genre: ""
maintainedBy: "init-fbs-multiagent-artifacts.mjs"
---

# ESM 当前状态（.fbs/esm-state.md）

> 每次状态切换后运行 \`node scripts/fbs-record-esm-transition.mjs\` 更新；或手工与对话宣告保持一致。

| 字段 | 值 |
|------|-----|
| 当前状态 | **IDLE** |
| 上一状态 | IDLE |
| 切换时间 | （待首次切换） |
| 原因 | — |
| 体裁等级 | — |
`;

const PENDING_VERIFICATION = `# 待核实项台账（pendingVerificationTracking）

> **CLI**：\`node scripts/audit-pending-verification.mjs --book-root <本书根>\`（S5 前加 \`--enforce\`）  
> **映射**：\`references/05-ops/p0-cli-map.md\`

## 说明

检索暂不可执行、但已在正文触及的事实句，在此登记；S5 终审前须**勾选完成**或删除，避免遗漏。

## 当前队列

（在此追加 \`- [ ] …\` 行；暂无待核实项则保留本说明即可。）

`;

function main() {
  const { bookRoot, force } = parseArgs(process.argv);
  if (!bookRoot) {
    console.error(
      "用法: node scripts/init-fbs-multiagent-artifacts.mjs --book-root <本书根> [--force]"
    );
    process.exit(2);
  }
  const root = path.resolve(bookRoot);
  const fbs = path.join(root, ".fbs");
  fs.mkdirSync(fbs, { recursive: true });

  writeIfAbsent(path.join(fbs, "chapter-status.md"), CHAPTER_STATUS, force);
  // SL-2/A6：本书根镜像改为只读快照声明（注释头说明权威路径）
  const rootStatusContent = CHAPTER_STATUS.replace(
    /^# 章节完成状态台账/,
    '# 章节完成状态台账（本书根快照，只读）\n<!-- SNAPSHOT: 本文件为只读快照，权威来源在 .fbs/chapter-status.md；由 sync-book-chapter-index.mjs 自动同步 -->\n<!-- 请勿直接编辑本文件；如需更新请修改 .fbs/chapter-status.md 后执行同步脚本 -->'
  );
  writeIfAbsent(path.join(root, "chapter-status.md"), rootStatusContent, force);
  writeIfAbsent(path.join(fbs, "chapter-dependencies.json"), JSON.stringify(CHAPTER_DEPS, null, 2) + "\n", force);
  writeIfAbsent(path.join(fbs, "book-context-brief.md"), BOOK_CONTEXT, force);
  writeIfAbsent(path.join(fbs, "GLOSSARY.md"), GLOSSARY, force);
  writeIfAbsent(path.join(fbs, "project-config.json"), JSON.stringify(PROJECT_CONFIG, null, 2) + "\n", force);
  writeIfAbsent(path.join(fbs, "member-heartbeats.json"), JSON.stringify(HEARTBEATS, null, 2) + "\n", force);
  writeIfAbsent(path.join(fbs, "task-queue.json"), JSON.stringify(TASK_QUEUE, null, 2) + "\n", force);
  // A5/RC-1：限流预算追踪工件
  writeIfAbsent(path.join(fbs, "rate-budget.json"), JSON.stringify(RATE_BUDGET, null, 2) + "\n", force);
  // A6/RL-1：优质域名台账工件
  writeIfAbsent(path.join(fbs, "high-quality-domains.json"), JSON.stringify(HIGH_QUALITY_DOMAINS, null, 2) + "\n", force);
  // S0-E / materialLibrary：虚拟书房素材库（素材充分性六项策略对齐）
  writeIfAbsent(path.join(fbs, "material-library.md"), MATERIAL_LIBRARY, force);
  // H1 / S0-M：作者元知识锁定（声音基准）
  writeIfAbsent(path.join(fbs, "author-meta.md"), AUTHOR_META, force);
  // H4 / 三级沉淀第一级：认知金句卡片
  writeIfAbsent(path.join(fbs, "insight-cards.md"), INSIGHT_CARDS, force);
  // termConsistencyTracking（v1.8）：概念锁定动态哨兵追踪文件
  writeIfAbsent(path.join(fbs, "术语锁定记录.md"), TERM_LOCK_RECORD, force);
  // esmExecutionTracking（v1.8）：规范执行状态运行时追踪
  writeIfAbsent(path.join(fbs, "规范执行状态.md"), NORM_EXEC_STATE, force);
  writeIfAbsent(path.join(fbs, "esm-state.md"), ESM_STATE_INITIAL, force);

  const writingNotes = path.join(fbs, "writing-notes");
  fs.mkdirSync(writingNotes, { recursive: true });
  writeIfAbsent(path.join(writingNotes, "pending-verification.md"), PENDING_VERIFICATION, force);

  const ledger = path.join(fbs, "search-ledger.jsonl");
  if (!fs.existsSync(ledger) || force) {
    fs.writeFileSync(ledger, "", "utf8");
    console.log("write:", ledger);
  } else {
    console.log("skip (exists):", ledger);
  }

  console.log(
    "done. 下一步: shared-knowledge-base · sync-book-chapter-index · chapter-scheduler-hint · chapter-dependency-gate · citation-format-check · terminology-gate\n" +
    "新工件说明:\n" +
    "  .fbs/rate-budget.json          ← 限流预算追踪，由 SearchBundle 自动更新，无需手动修改\n" +
    "  .fbs/high-quality-domains.json ← 优质域名台账，检索发现高质量来源时追加写入\n" +
    "  .fbs/material-library.md       ← 虚拟书房素材库，S0-E 初始化后按协议补充素材条目\n" +
    "  .fbs/author-meta.md            ← 作者元知识锁定，S0-M 阶段由作者填写声音基准\n" +
    "  .fbs/insight-cards.md          ← 认知金句卡片，每章自审卡完成后自动追加\n" +
    "  .fbs/chapter-status.md         ← 【权威来源】章节状态台账，日常维护请只更新此文件\n" +
    "  chapter-status.md（本书根）    ← 只读快照，勿直接编辑，由 sync-book-chapter-index.mjs 同步\n" +
    "  .fbs/术语锁定记录.md           ← 概念锁定动态哨兵，S0 概念定义后填写（v1.8 新增）\n" +
    "  .fbs/规范执行状态.md           ← 规范执行状态运行时追踪，每次 ESM 状态切换后更新（v1.8 新增）\n" +
    "  .fbs/esm-state.md               ← ESM 机读当前状态（v1.8.0；配合 fbs-record-esm-transition.mjs）\n" +
    "  .fbs/writing-notes/pending-verification.md ← 待核实台账（audit-pending-verification.mjs）"
  );
}

main();
