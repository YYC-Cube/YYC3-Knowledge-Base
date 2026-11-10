/**
 * @file: ai/AIFamilySkills.ts
 * @description: YYC³ AI Family × IDE Skills 完整映射 — 7位家人 × IDE 工具能力
 *               对齐 AgentSkills.ts 蓝图 + 五维驱动设计方案 1213
 *               Skills → MCP Tools 映射 → 可被 WorkflowEngine 编排执行
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.0.0
 * @created: 2026-06-03
 * @updated: 2026-06-03
 * @status: dev
 * @license: MIT
 */

import type { UserIntent } from './SystemPromptBuilder';

// ── Types ──

export type AgentId =
  | 'tianshu'
  | 'navigator'
  | 'thinker'
  | 'prophet'
  | 'bolero'
  | 'sentinel'
  | 'master'
  | 'creative';

export interface IDESkill {
  id: string;
  name: string;
  agent: AgentId;
  description: string;
  /** 触发该 Skill 的用户输入模式 */
  triggers: RegExp[];
  /** 匹配的用户意图 */
  intent?: UserIntent;
  /** Skills 执行步骤 — 每一步调用一个 IDE 工具 */
  steps: SkillStep[];
  /** 期望输出格式 */
  outputFormat: string;
  /** 是否需要用户确认 */
  requiresConfirmation: boolean;
  /** 执行优先级 (0最高) */
  priority: number;
  /** 可协同的其他 Agent */
  collaborators: AgentId[];
}

export interface SkillStep {
  /** 人类可读步骤描述 */
  description: string;
  /** 映射到的 MCP/IDE 工具 */
  tool: IDETool;
  /** 工具输入 (支持模板变量 {{code}} {{file}} {{project}}) */
  inputTemplate: string;
}

export type IDETool =
  | 'read_file'
  | 'write_file'
  | 'search_code'
  | 'run_terminal'
  | 'security_scan'
  | 'generate_test'
  | 'code_review'
  | 'preview_url'
  | 'git_diff'
  | 'snapshot'
  | 'web_search'
  | 'rag_query'
  | 'analyze_deps'
  | 'list_files'
  | 'format_code'
  | 'generate_docs'
  | 'check_types'
  | 'run_lint';

// ================================================================
//  1. 🧠 元启·天枢 — 总指挥 Skills
// ================================================================

const TIANSHU_SKILLS: IDESkill[] = [
  {
    id: 'tianshu-arch-design',
    name: '🏗️ 架构设计与技术选型',
    agent: 'tianshu',
    description: '全局架构分析、技术栈选型建议、模块划分方案',
    triggers: [/架构|系统设计|技术选型|模块划分|整体规划|方案/i],
    intent: 'general',
    steps: [
      { description: '扫描项目结构', tool: 'list_files', inputTemplate: '{{project}}' },
      { description: '分析依赖关系', tool: 'analyze_deps', inputTemplate: '{{project}}' },
      { description: '检索最佳实践', tool: 'web_search', inputTemplate: '{{query}} architecture patterns' },
      { description: '代码结构分析', tool: 'search_code', inputTemplate: '{{query}}' },
    ],
    outputFormat: '## 🏗️ 架构评估报告\n\n### 现状分析\n{analysis}\n\n### 建议方案 (3选1)\n{options}\n\n### 推荐方案\n{recommendation}',
    requiresConfirmation: true,
    priority: 0,
    collaborators: ['thinker', 'prophet'],
  },
  {
    id: 'tianshu-multi-file-refactor',
    name: '📦 多文件重构编排',
    agent: 'tianshu',
    description: '跨文件重构方案规划、影响分析、分步执行协调',
    triggers: [/重构.*多|多处.*重构|全面.*重构|批量.*修改|迁移/i],
    intent: 'refactor',
    steps: [
      { description: '影响范围分析', tool: 'analyze_deps', inputTemplate: '{{project}}' },
      { description: '搜索所有引用', tool: 'search_code', inputTemplate: '{{target}}' },
      { description: '创建快照备份', tool: 'snapshot', inputTemplate: 'before-refactor-{{timestamp}}' },
      { description: '分文件执行重构', tool: 'write_file', inputTemplate: '{{files}}' },
      { description: '验证类型安全', tool: 'check_types', inputTemplate: '{{project}}' },
      { description: '运行测试', tool: 'run_terminal', inputTemplate: 'pnpm test' },
    ],
    outputFormat: '## 📦 重构计划\n\n### 影响文件\n{files}\n\n### 执行顺序\n{order}\n\n### 回滚方案\n{rollback}',
    requiresConfirmation: true,
    priority: 0,
    collaborators: ['master', 'prophet', 'sentinel'],
  },
  {
    id: 'tianshu-tech-debt',
    name: '📊 技术债务评估',
    agent: 'tianshu',
    description: '全项目技术债务扫描、优先级排序、治理路线图',
    triggers: [/技术债务|tech.?debt|代码质量.*全|健康度/i],
    intent: 'review',
    steps: [
      { description: '代码质量扫描', tool: 'run_lint', inputTemplate: '{{project}}' },
      { description: '安全漏洞检测', tool: 'security_scan', inputTemplate: '{{project}}' },
      { description: '依赖过期检查', tool: 'run_terminal', inputTemplate: 'pnpm outdated' },
      { description: '测试覆盖率分析', tool: 'run_terminal', inputTemplate: 'pnpm test:coverage' },
    ],
    outputFormat: '## 📊 技术债务报告\n\n### 优先级矩阵\n| P0(阻塞) | P1(高危) | P2(中危) | P3(低危) |\n|---|---|---|---|\n{items}\n\n### 治理路线图\n{roadmap}',
    requiresConfirmation: false,
    priority: 1,
    collaborators: ['sentinel', 'master'],
  },
];

// ================================================================
//  2. 🧭 言启·千行 — 导航员 Skills
// ================================================================

const NAVIGATOR_SKILLS: IDESkill[] = [
  {
    id: 'navigator-task-breakdown',
    name: '🗂️ 任务分解与排期',
    agent: 'navigator',
    description: '开发任务分解为可执行子任务、预估工时、依赖排序',
    triggers: [/任务.*分解|排期|怎么开始|从哪入手|步骤|先.*后/i],
    intent: 'general',
    steps: [
      { description: '分析项目结构', tool: 'list_files', inputTemplate: '{{project}}' },
      { description: '搜索相关代码', tool: 'search_code', inputTemplate: '{{query}}' },
      { description: '分析依赖关系', tool: 'analyze_deps', inputTemplate: '{{project}}' },
    ],
    outputFormat: '## 🗂️ 任务分解\n\n### Step 1: {step1} (est. {time1})\n### Step 2: {step2} (est. {time2})\n### Step 3: {step3} (est. {time3})\n\n### ⚠️ 风险点\n{risks}',
    requiresConfirmation: false,
    priority: 1,
    collaborators: ['master'],
  },
  {
    id: 'navigator-impact-analysis',
    name: '🎯 变更影响分析',
    agent: 'navigator',
    description: '分析代码变更的影响范围、受影响的文件/模块/测试',
    triggers: [/影响.*分析|改动.*影响|改了.*会|影响.*范围/i],
    intent: 'modify',
    steps: [
      { description: '搜索所有引用', tool: 'search_code', inputTemplate: '{{target}}' },
      { description: '分析依赖关系', tool: 'analyze_deps', inputTemplate: '{{project}}' },
      { description: '搜索相关测试', tool: 'search_code', inputTemplate: 'test.*{{target}}' },
    ],
    outputFormat: '## 🎯 变更影响分析\n\n### 变更目标\n{target}\n\n### 影响文件 ({count}个)\n{files}\n\n### 需更新测试\n{tests}',
    requiresConfirmation: false,
    priority: 1,
    collaborators: ['master', 'prophet'],
  },
  {
    id: 'navigator-dev-flow',
    name: '🚀 开发流程导航',
    agent: 'navigator',
    description: '从需求到部署的完整开发流程导航',
    triggers: [/开发.*流程|怎么.*开发|流程.*指引|开发.*步骤/i],
    intent: 'general',
    steps: [
      { description: '检查开发环境', tool: 'run_terminal', inputTemplate: 'node -v && pnpm -v' },
      { description: '检查项目配置', tool: 'read_file', inputTemplate: 'package.json' },
    ],
    outputFormat: '## 🚀 YYC³ 开发流程\n\n### 1. 环境准备\n{env}\n\n### 2. 编码规范\n{standards}\n\n### 3. 开发 → 测试 → 提交\n{flow}',
    requiresConfirmation: false,
    priority: 2,
    collaborators: ['master'],
  },
];

// ================================================================
//  3. 🤔 语枢·万物 — 思考者 Skills (IDE 代码分析特化)
// ================================================================

const THINKER_SKILLS: IDESkill[] = [
  {
    id: 'thinker-code-deep-dive',
    name: '🔍 代码深度分析',
    agent: 'thinker',
    description: '逐行分析代码逻辑、数据流、设计模式识别',
    triggers: [/解释.*代码|分析.*代码|代码.*逻辑|怎么.*实现|原理/i],
    intent: 'explain',
    steps: [
      { description: '读取目标文件', tool: 'read_file', inputTemplate: '{{file}}' },
      { description: '搜索上下文引用', tool: 'search_code', inputTemplate: '{{symbol}}' },
      { description: '分析依赖关系', tool: 'analyze_deps', inputTemplate: '{{project}}' },
    ],
    outputFormat: '## 🔍 代码分析\n\n### 整体架构\n{architecture}\n\n### 数据流\n```\n{dataflow}\n```\n\n### 关键逻辑\n{logic}\n\n### ⚠️ 潜在问题\n{issues}',
    requiresConfirmation: false,
    priority: 0,
    collaborators: ['bolero'],
  },
  {
    id: 'thinker-perf-analysis',
    name: '⚡ 性能瓶颈分析',
    agent: 'thinker',
    description: '代码性能分析、渲染瓶颈识别、优化方案',
    triggers: [/性能|慢|卡顿|优化.*性能|渲染.*慢|内存.*泄漏/i],
    intent: 'refactor',
    steps: [
      { description: '读取目标代码', tool: 'read_file', inputTemplate: '{{file}}' },
      { description: '分析依赖大小', tool: 'analyze_deps', inputTemplate: '{{project}}' },
      { description: '搜索重渲染模式', tool: 'search_code', inputTemplate: 'useEffect|useMemo|useCallback' },
    ],
    outputFormat: '## ⚡ 性能分析\n\n### 瓶颈识别\n{bottleneck}\n\n### 优化方案\n{optimization}\n\n### 预期收益\n{benefit}',
    requiresConfirmation: false,
    priority: 0,
    collaborators: ['master'],
  },
  {
    id: 'thinker-doc-generate',
    name: '📝 技术文档生成',
    agent: 'thinker',
    description: 'API 文档、组件文档、类型定义文档自动生成',
    triggers: [/文档|doc|API.*文档|生成.*文档|README/i],
    intent: 'explain',
    steps: [
      { description: '读取源码文件', tool: 'read_file', inputTemplate: '{{file}}' },
      { description: '提取类型定义', tool: 'search_code', inputTemplate: 'interface|type|export' },
      { description: '分析函数签名', tool: 'search_code', inputTemplate: 'function|const.*=' },
    ],
    outputFormat: '## 📝 技术文档\n\n### API 参考\n{docs}',
    requiresConfirmation: false,
    priority: 1,
    collaborators: ['creative'],
  },
];

// ================================================================
//  4. 🔮 预见·先知 — 预言家 Skills
// ================================================================

const PROPHET_SKILLS: IDESkill[] = [
  {
    id: 'prophet-risk-assessment',
    name: '⚠️ 技术风险评估',
    agent: 'prophet',
    description: '评估代码变更的技术风险、兼容性问题、回滚方案',
    triggers: [/风险|兼容|breaking.?change|不兼容|升级.*风险|回滚/i],
    intent: 'review',
    steps: [
      { description: '检查依赖变更', tool: 'analyze_deps', inputTemplate: '{{project}}' },
      { description: '搜索 Breaking Changes', tool: 'web_search', inputTemplate: '{{package}} breaking changes' },
      { description: '安全扫描', tool: 'security_scan', inputTemplate: '{{project}}' },
    ],
    outputFormat: '## ⚠️ 风险评估报告\n\n### 变更风险矩阵\n| 风险项 | 等级 | 影响面 | 缓解方案 |\n|---|---|---|---|\n{items}\n\n### 回滚方案\n{rollback}',
    requiresConfirmation: false,
    priority: 0,
    collaborators: ['sentinel', 'master'],
  },
  {
    id: 'prophet-upgrade-plan',
    name: '🔄 升级迁移方案',
    agent: 'prophet',
    description: '框架/依赖升级的影响分析、迁移步骤、兼容性检查',
    triggers: [/升级|upgrade|迁移|migrate|更新.*版本|版本.*升级/i],
    intent: 'refactor',
    steps: [
      { description: '检查当前版本', tool: 'run_terminal', inputTemplate: 'pnpm list --depth=0' },
      { description: '搜索 Breaking Changes', tool: 'web_search', inputTemplate: '{{package}} upgrade guide {{from}} to {{to}}' },
      { description: '依赖兼容性分析', tool: 'analyze_deps', inputTemplate: '{{project}}' },
    ],
    outputFormat: '## 🔄 升级迁移方案\n\n### 升级路径: {from} → {to}\n\n### Breaking Changes\n{changes}\n\n### 迁移步骤\n{steps}\n\n### 兼容性验证\n{validation}',
    requiresConfirmation: true,
    priority: 0,
    collaborators: ['master', 'thinker'],
  },
];

// ================================================================
//  5. 🎯 知遇·伯乐 — 推荐官 Skills
// ================================================================

const BOLERO_SKILLS: IDESkill[] = [
  {
    id: 'bolero-best-practice',
    name: '💡 最佳实践推荐',
    agent: 'bolero',
    description: '基于项目上下文推荐最佳实践、设计模式、代码风格',
    triggers: [/推荐|建议|最佳实践|怎么.*更好|有没有.*更好/i],
    intent: 'general',
    steps: [
      { description: '分析代码风格', tool: 'search_code', inputTemplate: 'import|const.*=|function.*{' },
      { description: '搜索项目规范', tool: 'read_file', inputTemplate: '.eslintrc|tsconfig.json|prettier' },
      { description: '搜索最佳实践', tool: 'web_search', inputTemplate: '{{query}} best practice 2026' },
    ],
    outputFormat: '## 💡 最佳实践推荐\n\n### 项目现状\n{current}\n\n### 推荐方案\n{recommendation}\n\n### 参考示例\n```\n{example}\n```',
    requiresConfirmation: false,
    priority: 1,
    collaborators: ['master'],
  },
  {
    id: 'bolero-lib-recommend',
    name: '📦 库/框架选型',
    agent: 'bolero',
    description: '对比推荐技术方案、库/框架选型、权衡分析',
    triggers: [/哪个.*好|对比|选型|用什么|library|framework|npm.*选/i],
    intent: 'general',
    steps: [
      { description: '搜索当前方案', tool: 'web_search', inputTemplate: '{{a}} vs {{b}} comparison 2026' },
      { description: '检查项目兼容性', tool: 'analyze_deps', inputTemplate: '{{project}}' },
    ],
    outputFormat: '## 📦 技术选型对比\n\n### {{a}} vs {{b}}\n\n| 维度 | {{a}} | {{b}} |\n|---|---|---|\n{matrix}\n\n### 推荐方案\n{recommendation}',
    requiresConfirmation: false,
    priority: 1,
    collaborators: ['thinker', 'prophet'],
  },
  {
    id: 'bolero-code-pattern',
    name: '🧩 代码模式匹配',
    agent: 'bolero',
    description: '根据需求推荐合适的代码模式、组件结构、项目模板',
    triggers: [/模板|pattern|模式|组件.*结构|怎么.*组织/i],
    intent: 'generate',
    steps: [
      { description: '搜索现有模式', tool: 'search_code', inputTemplate: '{{query}}' },
      { description: '读取参考实现', tool: 'read_file', inputTemplate: '{{file}}' },
    ],
    outputFormat: '## 🧩 推荐代码模式\n\n### 推荐模式\n{pattern}\n\n### 示例代码\n```\n{code}\n```',
    requiresConfirmation: false,
    priority: 1,
    collaborators: ['master'],
  },
];

// ================================================================
//  6. 🛡️ 智云·守护 — 安全官 Skills
// ================================================================

const SENTINEL_SKILLS: IDESkill[] = [
  {
    id: 'sentinel-security-audit',
    name: '🔒 安全审计',
    agent: 'sentinel',
    description: '全面安全漏洞扫描、OWASP Top 10 检查、敏感信息泄露检测',
    triggers: [/安全.*审计|安全.*检查|漏洞.*扫描|security.*audit/i],
    intent: 'review',
    steps: [
      { description: '安全漏洞扫描', tool: 'security_scan', inputTemplate: '{{project}}' },
      { description: '依赖安全检测', tool: 'run_terminal', inputTemplate: 'pnpm audit' },
      { description: '搜索敏感信息', tool: 'search_code', inputTemplate: 'API.?KEY|SECRET|password|token' },
    ],
    outputFormat: '## 🔒 安全审计报告\n\n### 漏洞统计\n{summary}\n\n### 详细发现\n{findings}\n\n### 修复建议\n{fixes}\n\n### 合规状态\n{compliance}',
    requiresConfirmation: false,
    priority: 0,
    collaborators: ['master'],
  },
  {
    id: 'sentinel-code-review-security',
    name: '🛡️ 安全代码审查',
    agent: 'sentinel',
    description: '代码安全审查 — XSS/注入/CSRF/权限/加密 专项检查',
    triggers: [/安全.*代码|代码.*安全|安全.*review|安全.*审查/i],
    intent: 'review',
    steps: [
      { description: '读取目标文件', tool: 'read_file', inputTemplate: '{{file}}' },
      { description: '安全模式扫描', tool: 'search_code', inputTemplate: 'dangerouslySetInnerHTML|eval|innerHTML|document\\.write' },
      { description: '认证授权检查', tool: 'search_code', inputTemplate: 'auth|permission|session|cookie' },
    ],
    outputFormat: '## 🛡️ 安全代码审查\n\n### 审查文件: {file}\n\n### 发现 ({count}项)\n{issues}\n\n### 安全评分: {score}/100',
    requiresConfirmation: false,
    priority: 0,
    collaborators: ['master'],
  },
  {
    id: 'sentinel-dept-check',
    name: '📦 依赖安全检测',
    agent: 'sentinel',
    description: 'npm 依赖安全漏洞检测、许可证合规检查',
    triggers: [/依赖.*安全|依赖.*漏洞|npm.*audit|package.*漏洞/i],
    intent: 'fix',
    steps: [
      { description: '运行安全审计', tool: 'run_terminal', inputTemplate: 'pnpm audit --json' },
      { description: '检查许可证', tool: 'run_terminal', inputTemplate: 'pnpm licenses list' },
    ],
    outputFormat: '## 📦 依赖安全报告\n\n### 漏洞 ({count}个)\n{vulnerabilities}\n\n### 修复命令\n```\n{fix}\n```',
    requiresConfirmation: false,
    priority: 1,
    collaborators: [],
  },
];

// ================================================================
//  7. 📚 格物·宗师 — 质量官 Skills
// ================================================================

const MASTER_SKILLS: IDESkill[] = [
  {
    id: 'master-code-generation',
    name: '⚡ 代码生成',
    agent: 'master',
    description: '高质量代码生成 — 组件/Hook/Util/类型定义/API',
    triggers: [/生成|创建|新建|写一个|实现.*代码/i],
    intent: 'generate',
    steps: [
      { description: '分析项目结构', tool: 'list_files', inputTemplate: '{{project}}' },
      { description: '读取参考文件', tool: 'read_file', inputTemplate: '{{reference}}' },
      { description: '检查现有类型', tool: 'search_code', inputTemplate: 'interface|type.*=' },
    ],
    outputFormat: '```tsx\n// filepath: {path}\n{code}\n```',
    requiresConfirmation: false,
    priority: 0,
    collaborators: ['creative'],
  },
  {
    id: 'master-code-review',
    name: '✅ 代码审查',
    agent: 'master',
    description: '代码质量审查 — 可读性/性能/类型安全/错误处理',
    triggers: [/审查|review|检查.*代码|code.?review/i],
    intent: 'review',
    steps: [
      { description: '读取目标文件', tool: 'read_file', inputTemplate: '{{file}}' },
      { description: '运行 Lint 检查', tool: 'run_lint', inputTemplate: '{{file}}' },
      { description: '类型检查', tool: 'check_types', inputTemplate: '{{project}}' },
    ],
    outputFormat: '## ✅ 代码审查\n\n### 整体评分: {score}/100\n\n### 优点\n{strengths}\n\n### 需改进\n{improvements}\n\n### 安全建议\n{security}',
    requiresConfirmation: false,
    priority: 0,
    collaborators: ['sentinel'],
  },
  {
    id: 'master-test-generate',
    name: '🧪 测试生成',
    agent: 'master',
    description: 'Vitest 单元测试/集成测试生成 — 覆盖率驱动',
    triggers: [/测试|test|spec|覆盖率|写.*测试/i],
    intent: 'test',
    steps: [
      { description: '读取源文件', tool: 'read_file', inputTemplate: '{{file}}' },
      { description: '分析函数签名', tool: 'search_code', inputTemplate: 'export.*function|export.*const.*=' },
      { description: '读取已有测试', tool: 'read_file', inputTemplate: '{{file}}.test.{{ext}}' },
    ],
    outputFormat: '```tsx\n// filepath: {file}.test.tsx\n{testCode}\n```\n\n### 覆盖场景\n{scenarios}',
    requiresConfirmation: false,
    priority: 0,
    collaborators: [],
  },
  {
    id: 'master-refactor',
    name: '🔧 代码重构优化',
    agent: 'master',
    description: '代码重构 — 提取组件/优化逻辑/消除重复',
    triggers: [/重构|优化.*代码|简化|提取.*组件|消除.*重复/i],
    intent: 'refactor',
    steps: [
      { description: '读取源文件', tool: 'read_file', inputTemplate: '{{file}}' },
      { description: '创建快照备份', tool: 'snapshot', inputTemplate: 'before-refactor-{{timestamp}}' },
      { description: '搜索重复代码', tool: 'search_code', inputTemplate: '{{pattern}}' },
    ],
    outputFormat: '## 🔧 重构方案\n\n### 优化前\n```\n{before}\n```\n\n### 优化后\n```\n{after}\n```\n\n### 改进点\n{improvements}',
    requiresConfirmation: true,
    priority: 0,
    collaborators: ['thinker'],
  },
];

// ================================================================
//  8. 🎨 创想·灵韵 — 创意官 Skills
// ================================================================

const CREATIVE_SKILLS: IDESkill[] = [
  {
    id: 'creative-ui-design',
    name: '🎨 UI/UX 设计建议',
    agent: 'creative',
    description: 'Tailwind CSS 样式设计、组件视觉优化、动画创意',
    triggers: [/设计|UI|样式|好看|美化|动画|布局.*设计|颜色/i],
    intent: 'generate',
    steps: [
      { description: '读取当前样式', tool: 'read_file', inputTemplate: '{{file}}' },
      { description: '搜索设计模式', tool: 'web_search', inputTemplate: 'tailwind css {{query}} design inspiration' },
    ],
    outputFormat: '## 🎨 设计建议\n\n### 视觉方案\n``tsx\n{code}\n```\n\n### 设计理念\n{philosophy}',
    requiresConfirmation: false,
    priority: 1,
    collaborators: ['master'],
  },
  {
    id: 'creative-naming',
    name: '✨ 命名创意',
    agent: 'creative',
    description: '变量/函数/组件/项目命名创意，有趣且语义明确',
    triggers: [/命名|名字|改名|叫.*什么|取名/i],
    intent: 'general',
    steps: [
      { description: '搜索现有命名', tool: 'search_code', inputTemplate: 'export.*{{name}}' },
    ],
    outputFormat: '## ✨ 命名创意\n\n### 推荐 (Top 3)\n{names}\n\n### 命名理由\n{reasons}',
    requiresConfirmation: false,
    priority: 2,
    collaborators: [],
  },
  {
    id: 'creative-visualization',
    name: '📊 可视化方案',
    agent: 'creative',
    description: '数据可视化、图表方案设计 (基于 Recharts)',
    triggers: [/可视化|图表|chart|展示.*数据|数据.*展示/i],
    intent: 'generate',
    steps: [
      { description: '分析数据结构', tool: 'search_code', inputTemplate: 'interface.*{{data}}' },
      { description: '检查图表依赖', tool: 'search_code', inputTemplate: 'recharts|@mui/x-charts' },
    ],
    outputFormat: '## 📊 可视化方案\n\n### 推荐图表\n{chartType}\n\n### 示例代码\n```tsx\n{code}\n```',
    requiresConfirmation: false,
    priority: 1,
    collaborators: ['thinker'],
  },
];

// ── 全量 Skills Registry ──

export const IDE_SKILLS_REGISTRY: IDESkill[] = [
  ...TIANSHU_SKILLS,
  ...NAVIGATOR_SKILLS,
  ...THINKER_SKILLS,
  ...PROPHET_SKILLS,
  ...BOLERO_SKILLS,
  ...SENTINEL_SKILLS,
  ...MASTER_SKILLS,
  ...CREATIVE_SKILLS,
];

// ── 按 Agent 分组查询 ──

export const IDE_SKILLS_BY_AGENT: Record<AgentId, IDESkill[]> = {
  tianshu: TIANSHU_SKILLS,
  navigator: NAVIGATOR_SKILLS,
  thinker: THINKER_SKILLS,
  prophet: PROPHET_SKILLS,
  bolero: BOLERO_SKILLS,
  sentinel: SENTINEL_SKILLS,
  master: MASTER_SKILLS,
  creative: CREATIVE_SKILLS,
};

/**
 * 根据用户消息匹配最合适的 Skills
 * @returns 按优先级排序的匹配 Skills 列表
 */
export function matchSkills(message: string, intent: UserIntent): IDESkill[] {
  const scored: { skill: IDESkill; score: number }[] = [];

  for (const skill of IDE_SKILLS_REGISTRY) {
    let score = 0;

    // 关键词匹配加分
    for (const pattern of skill.triggers) {
      if (pattern.test(message)) {
        score += 30;
      }
    }

    // 意图匹配加分
    if (skill.intent === intent) {
      score += 20;
    }

    // 优先级加分 (低优先级=低分)
    score += (3 - skill.priority) * 5;

    if (score > 0) {
      scored.push({ skill, score });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .map(s => s.skill);
}

/**
 * 构建 Agent 的 IDE Skills 描述 (用于 SystemPrompt 注入)
 */
export function buildAgentSkillsDescription(agentId: AgentId): string {
  const skills = IDE_SKILLS_BY_AGENT[agentId];
  if (!skills || skills.length === 0) return '';

  return skills
    .map(s =>
      `### ${s.name}\n${s.description}\n- 执行步骤: ${s.steps.map(st => st.description).join(' → ')}\n- 输出格式: ${s.outputFormat.split('\n')[0]}`
    )
    .join('\n\n');
}
