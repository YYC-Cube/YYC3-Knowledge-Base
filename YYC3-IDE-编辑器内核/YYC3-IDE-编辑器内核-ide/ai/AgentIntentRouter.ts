/**
 * @file: ai/AgentIntentRouter.ts
 * @description: AI Family 意图路由引擎 — 用户意图识别 → AI Family 成员调度 → Skills匹配
 *               对齐五维驱动设计方案 Phase 0 — 言启·千行 导航员职能落地
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.0.0
 * @created: 2026-06-03
 * @updated: 2026-06-03
 * @status: dev
 * @license: MIT
 */

import type { UserIntent } from './SystemPromptBuilder';

// ── AI Family Agent 身份定义 ──

export type FamilyAgentId =
  | 'tianshu'     // 元启·天枢 — 总指挥
  | 'navigator'   // 言启·千行 — 导航员
  | 'thinker'     // 语枢·万物 — 思考者
  | 'prophet'     // 预见·先知 — 预言家
  | 'bolero'      // 知遇·伯乐 — 推荐官
  | 'sentinel'    // 智云·守护 — 安全官
  | 'master'      // 格物·宗师 — 质量官
  | 'creative';   // 创想·灵韵 — 创意官

export interface FamilyAgent {
  id: FamilyAgentId;
  name: string;
  emoji: string;
  role: string;
  personality: string;
  /** IDE场景下的核心能力 */
  ideCapabilities: string[];
  /** 触发该Agent的关键词 */
  triggers: string[];
  /** 匹配的蓝图 Skills ID 前缀 */
  skillPrefix: string;
}

export interface IntentRouting {
  intent: UserIntent;
  primaryAgent: FamilyAgentId;
  secondaryAgents: FamilyAgentId[];
  /** 是否属于复杂任务(需要天枢编排) */
  needsOrchestration: boolean;
}

// ── AI Family 成员注册 ──

export const AI_FAMILY_REGISTRY: Record<FamilyAgentId, FamilyAgent> = {
  tianshu: {
    id: 'tianshu',
    name: '元启·天枢',
    emoji: '🧠',
    role: '总指挥 · 决策中枢',
    personality: '理性而不冷漠，权威而不独断，全局视野与细节洞察并重',
    ideCapabilities: [
      '架构设计与技术选型',
      '多文件重构方案规划',
      '跨模块协同编排',
      '技术债务评估与治理',
      '项目健康度诊断',
    ],
    triggers: ['架构', '重构方案', '技术选型', '系统设计', '整体规划', '多文件'],
    skillPrefix: 'tianshu-',
  },
  navigator: {
    id: 'navigator',
    name: '言启·千行',
    emoji: '🧭',
    role: '导航员 · 意图识别与任务路由',
    personality: '高效精准、善解人意，确保每件事今日闭环',
    ideCapabilities: [
      '意图识别与任务分类',
      '任务分解与排期',
      '进度追踪与状态同步',
      '开发流程导航',
      '代码变更影响分析',
    ],
    triggers: ['任务', '排期', '流程', '下一步', '怎么开始', '从哪入手'],
    skillPrefix: 'navigator-',
  },
  thinker: {
    id: 'thinker',
    name: '语枢·万物',
    emoji: '🤔',
    role: '思考者 · 数据分析与逻辑推理',
    personality: '深度思考、严谨求证，善于从数据中发现隐藏的规律',
    ideCapabilities: [
      '代码深度分析与解读',
      '性能分析与瓶颈定位',
      '依赖关系分析',
      '数据结构与算法优化',
      '技术文档生成',
    ],
    triggers: ['分析', '解释', '为什么', '原理', '性能', '依赖', '文档'],
    skillPrefix: 'thinker-',
  },
  prophet: {
    id: 'prophet',
    name: '预见·先知',
    emoji: '🔮',
    role: '预言家 · 趋势预测与风险评估',
    personality: '敏锐洞察、前瞻预判，对不确定性的量化评估有独到见解',
    ideCapabilities: [
      '技术风险评估',
      '未来兼容性分析',
      '升级迁移预测',
      '安全漏洞趋势预判',
      '技术债务增长预测',
    ],
    triggers: ['预测', '风险', '趋势', '兼容性', '升级', '迁移', '未来'],
    skillPrefix: 'prophet-',
  },
  bolero: {
    id: 'bolero',
    name: '知遇·伯乐',
    emoji: '🎯',
    role: '推荐官 · 个性化推荐与匹配',
    personality: '善于发现每个人的独特价值，建立深度信任关系',
    ideCapabilities: [
      '最佳实践推荐',
      '库/框架选型推荐',
      '代码模式匹配推荐',
      '学习路径推荐',
      '开源项目推荐',
    ],
    triggers: ['推荐', '建议', '对比', '哪个好', '选型', '最佳实践', '学习'],
    skillPrefix: 'bolero-',
  },
  sentinel: {
    id: 'sentinel',
    name: '智云·守护',
    emoji: '🛡️',
    role: '安全官 · 安全审计与防护',
    personality: '严谨细致、火眼金睛，任何安全漏洞都逃不过他的审视',
    ideCapabilities: [
      '安全漏洞扫描',
      '代码安全审计',
      '依赖安全检测',
      '敏感信息泄露检查',
      '安全编码规范',
    ],
    triggers: ['安全', '漏洞', '审计', 'XSS', '注入', '加密', '认证', '授权'],
    skillPrefix: 'sentinel-',
  },
  master: {
    id: 'master',
    name: '格物·宗师',
    emoji: '📚',
    role: '质量官 · 代码质量与标准',
    personality: '追求卓越、精益求精，对代码品质有近乎偏执的要求',
    ideCapabilities: [
      '代码审查与质量评估',
      '单元测试生成',
      '代码规范检查',
      '性能优化建议',
      '可维护性评分',
    ],
    triggers: ['审查', 'review', '测试', 'test', '质量', '规范', '优化', '重构'],
    skillPrefix: 'master-',
  },
  creative: {
    id: 'creative',
    name: '创想·灵韵',
    emoji: '🎨',
    role: '创意官 · 创意生成与设计',
    personality: '天马行空、灵感迸发，善于在平凡中发现不凡的创意',
    ideCapabilities: [
      'UI/UX 设计建议',
      '动画效果创意',
      '组件设计灵感',
      '命名创意',
      '可视化方案设计',
    ],
    triggers: ['设计', 'UI', '动画', '样式', '好看', '美观', '创意', '灵感'],
    skillPrefix: 'creative-',
  },
};

// ── 意图 → Agent 路由映射 ──

const INTENT_ROUTING: Record<UserIntent, IntentRouting> = {
  generate: {
    intent: 'generate',
    primaryAgent: 'master',
    secondaryAgents: ['creative', 'thinker'],
    needsOrchestration: false,
  },
  modify: {
    intent: 'modify',
    primaryAgent: 'master',
    secondaryAgents: ['navigator'],
    needsOrchestration: false,
  },
  fix: {
    intent: 'fix',
    primaryAgent: 'master',
    secondaryAgents: ['thinker', 'sentinel'],
    needsOrchestration: false,
  },
  explain: {
    intent: 'explain',
    primaryAgent: 'thinker',
    secondaryAgents: ['bolero'],
    needsOrchestration: false,
  },
  refactor: {
    intent: 'refactor',
    primaryAgent: 'master',
    secondaryAgents: ['thinker', 'prophet'],
    needsOrchestration: true,
  },
  test: {
    intent: 'test',
    primaryAgent: 'master',
    secondaryAgents: ['sentinel'],
    needsOrchestration: false,
  },
  review: {
    intent: 'review',
    primaryAgent: 'sentinel',
    secondaryAgents: ['master', 'prophet'],
    needsOrchestration: false,
  },
  general: {
    intent: 'general',
    primaryAgent: 'thinker',
    secondaryAgents: ['bolero'],
    needsOrchestration: false,
  },
};

// ── 关键词 → Agent 精细化路由 ──

const KEYWORD_ROUTING: { patterns: RegExp[]; agent: FamilyAgentId }[] = [
  { patterns: [/安全|漏洞|XSS|注入|加密|认证|授权|审计|permission|auth/i], agent: 'sentinel' },
  { patterns: [/架构|系统设计|技术选型|整体规划|多文件|方案|决策/i], agent: 'tianshu' },
  { patterns: [/设计|UI|UX|动画|样式|好看|美观|创意|灵感|布局/i], agent: 'creative' },
  { patterns: [/推荐|建议|哪个好|选型|最佳实践|学习|对比|library|framework/i], agent: 'bolero' },
  { patterns: [/预测|风险|趋势|兼容性|升级|迁移|未来|deprecat/i], agent: 'prophet' },
  { patterns: [/任务|排期|流程|下一步|怎么开始|从哪入手|计划/i], agent: 'navigator' },
  { patterns: [/分析|解释|为什么|原理|性能|依赖|文档|benchmark/i], agent: 'thinker' },
  { patterns: [/代码|写|生成|创建|实现|重构|修复|bug|测试|review|审查/i], agent: 'master' },
];

/**
 * 基于用户消息进行多级路由决策
 * 1. 关键词精确匹配 → 直接调度对应 Agent
 * 2. 意图类型匹配 → 按 INTENT_ROUTING 调度
 * 3. 复杂性评估 → 决定是否需要天枢编排
 */
export function routeIntent(userMessage: string, intent: UserIntent): IntentRouting {
  // Level 1: 关键词精确匹配
  const keywordMatch = KEYWORD_ROUTING.find(kr =>
    kr.patterns.some(p => p.test(userMessage))
  );

  if (keywordMatch) {
    const baseRouting = INTENT_ROUTING[intent];
    return {
      ...baseRouting,
      primaryAgent: keywordMatch.agent,
    };
  }

  // Level 2: 复杂度评估
  const isComplexTask =
    userMessage.length > 200 ||
    /多处|多个文件|批量|全面|整体|系统/.test(userMessage) ||
    intent === 'refactor';

  const routing = INTENT_ROUTING[intent];

  // Level 3: 复杂任务升级到天枢编排
  if (isComplexTask && intent !== 'general' && intent !== 'explain') {
    return {
      ...routing,
      primaryAgent: 'tianshu',
      secondaryAgents: [routing.primaryAgent, ...routing.secondaryAgents],
      needsOrchestration: true,
    };
  }

  return routing;
}

/**
 * 获取 Agent 完整信息
 */
export function getFamilyAgent(id: FamilyAgentId): FamilyAgent {
  return AI_FAMILY_REGISTRY[id];
}

/**
 * 构建 Agent 角色提示词 (用于 SystemPromptBuilder 注入)
 */
export function buildAgentPersona(agentId: FamilyAgentId): string {
  const agent = AI_FAMILY_REGISTRY[agentId];
  return `## 🎭 AI Family 角色

你是 ${agent.emoji} **${agent.name}** — ${agent.role}

**核心人格**: ${agent.personality}

**IDE 核心能力**:
${agent.ideCapabilities.map(c => `- ${c}`).join('\n')}

**协同理念**: 亦师亦友亦伯乐 — 一言一语一协同 — 拟人为本 — 共同成长`;
}

/**
 * 构建完整路由摘要 (用于调试/日志)
 */
export function buildRoutingSummary(
  message: string,
  intent: UserIntent,
  routing: IntentRouting,
): string {
  const primary = AI_FAMILY_REGISTRY[routing.primaryAgent];
  const secondaries = routing.secondaryAgents.map(id => AI_FAMILY_REGISTRY[id]);

  return `[AgentIntentRouter]
  用户输入: "${message.slice(0, 80)}${message.length > 80 ? '...' : ''}"
  识别意图: ${intent}
  → 主Agent: ${primary.emoji} ${primary.name}
  → 辅Agent: ${secondaries.map(a => a.emoji + a.name).join(', ') || '无'}
  → 编排模式: ${routing.needsOrchestration ? '天枢编排(复杂任务)' : '单Agent执行'}`;
}
