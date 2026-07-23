/**
 * @description YYC³-CN中文优化类型定义
 * @module @yyc3/cn-optimizer/types
 * 
 * 专为中文用户设计的AI优化模块
 */

export interface ChineseTokenizerConfig {
  mode: 'simple' | 'advanced' | 'mixed';
  preservePunctuation: boolean;
  preserveNumbers: boolean;
  preserveEnglish: boolean;
  customDictionary?: string[];
}

export interface TokenizeResult {
  tokens: Token[];
  original: string;
  tokenCount: number;
  characterCount: number;
  estimatedTokens: number;
}

export interface Token {
  text: string;
  type: 'chinese' | 'english' | 'number' | 'punctuation' | 'mixed' | 'unknown';
  position: { start: number; end: number };
}

export interface PromptOptimizationConfig {
  style: 'formal' | 'casual' | 'technical' | 'creative';
  tone: 'neutral' | 'friendly' | 'professional' | 'enthusiastic';
  clarity: 'concise' | 'detailed' | 'balanced';
  context: 'general' | 'code' | 'business' | 'academic';
}

export interface OptimizedPrompt {
  original: string;
  optimized: string;
  improvements: PromptImprovement[];
  estimatedQuality: number;
  suggestions: string[];
}

export interface PromptImprovement {
  type: 'clarity' | 'structure' | 'context' | 'specificity' | 'tone';
  description: string;
  before?: string;
  after?: string;
}

export interface LocalizationConfig {
  sourceLocale: string;
  targetLocale: string;
  domain?: 'general' | 'technical' | 'business' | 'gaming' | 'legal' | 'medical';
  formality?: 'formal' | 'informal' | 'neutral';
  preserveTerms?: string[];
}

export interface LocalizationResult {
  original: string;
  localized: string;
  locale: string;
  confidence: number;
  notes: string[];
}

export interface ChineseTextMetrics {
  characterCount: number;
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  avgSentenceLength: number;
  readabilityScore: number;
  complexityLevel: 'simple' | 'moderate' | 'complex';
}

export interface ChineseNLPConfig {
  tokenizer?: Partial<ChineseTokenizerConfig>;
  promptOptimization?: Partial<PromptOptimizationConfig>;
  localization?: Partial<LocalizationConfig>;
}

export interface ChineseSynonym {
  word: string;
  synonyms: string[];
  context: string[];
}

export interface ChineseIdiom {
  idiom: string;
  meaning: string;
  usage: string[];
  similar: string[];
}

export interface ChineseGrammarCheck {
  text: string;
  issues: GrammarIssue[];
  suggestions: GrammarSuggestion[];
}

export interface GrammarIssue {
  position: { start: number; end: number };
  type: 'spelling' | 'grammar' | 'punctuation' | 'style';
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface GrammarSuggestion {
  original: string;
  suggested: string;
  reason: string;
}

export const CHINESE_PUNCTUATION = [
  '\uFF0C', '\u3002', '\uFF01', '\uFF1F', '\uFF1B', '\uFF1A',
  '\u201C', '\u201D', '\u2018', '\u2019',
  '\uFF08', '\uFF09', '\u3010', '\u3011', '\u300A', '\u300B',
  '\u3001', '\u2026', '\u2014', '\uff5e'
];

export const CHINESE_STOP_WORDS = [
  '的', '了', '和', '是', '在', '有', '我', '他', '她', '它',
  '这', '那', '就', '也', '都', '而', '及', '与', '或', '但',
  '如果', '因为', '所以', '虽然', '但是', '然后', '还是', '或者',
  '可以', '可能', '应该', '需要', '能够', '会', '要', '得', '让',
];

export const CHINESE_NUMBER_CHARS = [
  '零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
  '百', '千', '万', '亿', '兆',
];

export const COMMON_CHINESE_IDIOMS: ChineseIdiom[] = [
  {
    idiom: '一举两得',
    meaning: '做一件事得到两个好处',
    usage: ['通过这个方案，我们可以一举两得。'],
    similar: ['一箭双雕', '一石二鸟'],
  },
  {
    idiom: '精益求精',
    meaning: '追求更加完美',
    usage: ['我们要精益求精，不断完善产品。'],
    similar: ['追求卓越', '止于至善'],
  },
  {
    idiom: '循序渐进',
    meaning: '按照顺序逐步进行',
    usage: ['学习要循序渐进，不能急于求成。'],
    similar: ['按部就班', '步步为营'],
  },
];

export const TECHNICAL_TERMS: Record<string, string> = {
  'API': '应用程序接口',
  'SDK': '软件开发工具包',
  'MCP': '模型上下文协议',
  'LLM': '大语言模型',
  'RAG': '检索增强生成',
  'Agent': '智能体',
  'Prompt': '提示词',
  'Token': '词元',
  'Embedding': '嵌入向量',
  'Fine-tuning': '微调',
  'Inference': '推理',
  'Context': '上下文',
  'Pipeline': '流水线',
  'Framework': '框架',
  'Runtime': '运行时',
  'Middleware': '中间件',
  'Component': '组件',
  'Module': '模块',
  'Interface': '接口',
  'Implementation': '实现',
};
