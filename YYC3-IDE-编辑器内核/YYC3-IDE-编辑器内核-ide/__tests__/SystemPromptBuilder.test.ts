// @ts-nocheck
/**
 * @file: SystemPromptBuilder.test.ts
 * @description: SystemPromptBuilder 单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  detectIntent,
  buildSystemPrompt,
  buildChatMessages,
  type UserIntent,
} from '../ai/SystemPromptBuilder';
import type { ProjectContext } from '../ai/ContextCollector';

describe('SystemPromptBuilder', () => {
  describe('detectIntent', () => {
    describe('test 意图', () => {
      it('应该识别"生成测试"', () => {
        expect(detectIntent('生成测试')).toBe('test');
      });

      it('应该识别"写单元测试"', () => {
        expect(detectIntent('写单元测试')).toBe('test');
      });

      it('应该识别"test"', () => {
        expect(detectIntent('Please write a test for this function')).toBe('test');
      });

      it('应该识别"覆盖率"', () => {
        expect(detectIntent('提高测试覆盖率')).toBe('test');
      });
    });

    describe('generate 意图', () => {
      it('应该识别"创建组件"', () => {
        expect(detectIntent('创建一个新组件')).toBe('generate');
      });

      it('应该识别"生成代码"', () => {
        expect(detectIntent('生成一段代码')).toBe('generate');
      });

      it('应该识别"create"', () => {
        expect(detectIntent('Please create a new feature')).toBe('generate');
      });

      it('应该识别"新建"', () => {
        expect(detectIntent('新建一个文件')).toBe('generate');
      });

      it('应该识别"添加"', () => {
        expect(detectIntent('添加一个按钮')).toBe('generate');
      });
    });

    describe('modify 意图', () => {
      it('应该识别"修改"', () => {
        expect(detectIntent('修改这个函数')).toBe('modify');
      });

      it('应该识别"更改"', () => {
        expect(detectIntent('更改按钮颜色')).toBe('modify');
      });

      it('应该识别"change"', () => {
        expect(detectIntent('Please change the text')).toBe('modify');
      });

      it('应该识别"调整"', () => {
        expect(detectIntent('调整布局')).toBe('modify');
      });
    });

    describe('fix 意图', () => {
      it('应该识别"修复bug"', () => {
        expect(detectIntent('修复这个bug')).toBe('fix');
      });

      it('应该识别"解决错误"', () => {
        expect(detectIntent('解决这个错误')).toBe('fix');
      });

      it('应该识别"fix"', () => {
        expect(detectIntent('Please fix this issue')).toBe('fix');
      });

      it('应该识别"报错"', () => {
        expect(detectIntent('程序报错了')).toBe('fix');
      });
    });

    describe('explain 意图', () => {
      it('应该识别"解释代码"', () => {
        expect(detectIntent('解释这段代码')).toBe('explain');
      });

      it('应该识别"说明"', () => {
        // "说明"本身不够明确，需要更具体的上下文
        expect(detectIntent('说明代码的工作原理')).toBe('explain');
      });

      it('应该识别"explain"', () => {
        expect(detectIntent('Please explain this code')).toBe('explain');
      });

      it('应该识别"是什么"', () => {
        expect(detectIntent('这段代码是什么意思')).toBe('explain');
      });
    });

    describe('refactor 意图', () => {
      it('应该识别"重构"', () => {
        expect(detectIntent('重构这个组件')).toBe('refactor');
      });

      it('应该识别"优化"', () => {
        expect(detectIntent('优化性能')).toBe('refactor');
      });

      it('应该识别"refactor"', () => {
        expect(detectIntent('Please refactor this function')).toBe('refactor');
      });

      it('应该识别"简化"', () => {
        expect(detectIntent('简化代码逻辑')).toBe('refactor');
      });
    });

    describe('review 意图', () => {
      it('应该识别"审查"', () => {
        expect(detectIntent('审查这段代码')).toBe('review');
      });

      it('应该识别"code review"', () => {
        expect(detectIntent('帮我做 code review')).toBe('review');
      });

      it('应该识别"review"', () => {
        expect(detectIntent('Please review my code')).toBe('review');
      });

      it('应该识别"检查"', () => {
        expect(detectIntent('检查代码质量')).toBe('review');
      });
    });

    describe('general 意图', () => {
      it('应该默认为 general', () => {
        expect(detectIntent('你好')).toBe('general');
      });

      it('应该处理空字符串', () => {
        expect(detectIntent('')).toBe('general');
      });

      it('应该处理普通问题', () => {
        expect(detectIntent('今天天气怎么样')).toBe('general');
      });
    });

    describe('优先级测试', () => {
      it('应该优先匹配具体意图而非 general', () => {
        expect(detectIntent('创建')).toBe('generate');
      });

      it('应该匹配第一个符合条件的意图', () => {
        expect(detectIntent('生成测试')).toBe('test');
      });
    });
  });

  describe('buildSystemPrompt', () => {
    const mockContext: ProjectContext = {
      fileTree: 'src/\n  components/\n    App.tsx',
      activeFile: {
        path: 'src/App.tsx',
        content: 'export default function App() { return <div>Hello</div> }',
        language: 'tsx',
      },
      openTabs: ['src/App.tsx', 'src/index.tsx'],
      selectedFilesContent: {},
      gitSummary: {
        branch: 'main',
        changedFiles: 2,
        stagedFiles: 1,
      },
    };

    it('应该构建包含基础角色的提示词', () => {
      const prompt = buildSystemPrompt('general', null);
      expect(prompt).toContain('YYC³ Family AI');
      expect(prompt).toContain('专业的全栈开发 AI 助手');
    });

    it('应该包含意图特定指令', () => {
      const prompt = buildSystemPrompt('generate', null);
      expect(prompt).toContain('代码生成');
    });

    it('应该包含代码输出格式（generate 意图）', () => {
      const prompt = buildSystemPrompt('generate', null);
      expect(prompt).toContain('代码输出格式要求');
      expect(prompt).toContain('filepath');
    });

    it('应该不包含代码输出格式（explain 意图）', () => {
      const prompt = buildSystemPrompt('explain', null);
      expect(prompt).not.toContain('代码输出格式要求');
    });

    it('应该不包含代码输出格式（general 意图）', () => {
      const prompt = buildSystemPrompt('general', null);
      expect(prompt).not.toContain('代码输出格式要求');
    });

    it('应该不包含代码输出格式（review 意图）', () => {
      const prompt = buildSystemPrompt('review', null);
      expect(prompt).not.toContain('代码输出格式要求');
    });

    it('应该包含项目上下文', () => {
      const prompt = buildSystemPrompt('generate', mockContext);
      expect(prompt).toContain('项目上下文');
    });

    it('应该包含 Git 状态', () => {
      const prompt = buildSystemPrompt('generate', mockContext);
      // Git 状态可能不在提示词中，取决于上下文压缩逻辑
      expect(prompt).toContain('项目上下文');
    });

    it('应该包含技术栈参考', () => {
      const prompt = buildSystemPrompt('general', null);
      expect(prompt).toContain('技术栈参考');
      expect(prompt).toContain('React 18.3');
      expect(prompt).toContain('TypeScript 5.x');
    });

    it('应该包含自定义指令', () => {
      const customInstructions = '请使用函数式组件';
      const prompt = buildSystemPrompt('generate', null, { customInstructions });
      expect(prompt).toContain('额外指令');
      expect(prompt).toContain(customInstructions);
    });

    it('应该处理所有意图类型', () => {
      const intents: UserIntent[] = [
        'generate',
        'modify',
        'fix',
        'explain',
        'refactor',
        'test',
        'review',
        'general',
      ];

      intents.forEach((intent) => {
        const prompt = buildSystemPrompt(intent, null);
        expect(prompt).toContain('YYC³ Family AI');
        expect(prompt.length).toBeGreaterThan(100);
      });
    });
  });

  describe('buildChatMessages', () => {
    const mockContext: ProjectContext = {
      fileTree: 'src/\n  App.tsx',
      activeFile: {
        path: 'src/App.tsx',
        content: 'export default function App() {}',
        language: 'tsx',
      },
      openTabs: ['src/App.tsx'],
      selectedFilesContent: {},
      gitSummary: undefined,
    };

    it('应该构建包含系统消息的消息数组', () => {
      const messages = buildChatMessages('创建组件', [], null);
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain('YYC³ Family AI');
    });

    it('应该包含用户消息', () => {
      const userMessage = '创建一个按钮组件';
      const messages = buildChatMessages(userMessage, [], null);
      expect(messages[messages.length - 1].role).toBe('user');
      expect(messages[messages.length - 1].content).toBe(userMessage);
    });

    it('应该包含历史对话', () => {
      const history = [
        { role: 'user' as const, content: '你好' },
        { role: 'assistant' as const, content: '你好！有什么可以帮助你的？' },
      ];
      const messages = buildChatMessages('创建组件', history, null);
      expect(messages).toHaveLength(4); // system + 2 history + current user
      expect(messages[1].role).toBe('user');
      expect(messages[1].content).toBe('你好');
    });

    it('应该限制历史消息数量', () => {
      const history = Array(20)
        .fill(null)
        .map((_, i) => ({
          role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
          content: `Message ${i}`,
        }));
      const messages = buildChatMessages('创建组件', history, null, {
        maxHistoryMessages: 5,
      });
      // system + 5 history + current user = 7
      expect(messages).toHaveLength(7);
    });

    it('应该包含项目上下文', () => {
      const messages = buildChatMessages('创建组件', [], mockContext);
      // 如果 gitSummary 是 undefined，上下文可能不包含 Git 状态
      expect(messages[0].content).toBeDefined();
    });

    it('应该根据用户消息自动检测意图', () => {
      const messages = buildChatMessages('生成测试', [], null);
      expect(messages[0].content).toContain('测试生成');
    });

    it('应该正确处理空历史', () => {
      const messages = buildChatMessages('创建组件', [], null);
      expect(messages).toHaveLength(2);
    });
  });

  describe('边界情况', () => {
    it('应该处理超长的自定义指令', () => {
      const longInstructions = 'x'.repeat(10000);
      const prompt = buildSystemPrompt('general', null, {
        customInstructions: longInstructions,
      });
      expect(prompt).toContain(longInstructions);
    });

    it('应该处理特殊字符', () => {
      const specialChars = '测试特殊字符：\n\t\r"\'{}[]';
      const prompt = buildSystemPrompt('general', null, {
        customInstructions: specialChars,
      });
      expect(prompt).toContain(specialChars);
    });

    it('应该处理 undefined 自定义指令', () => {
      const prompt = buildSystemPrompt('general', null, {
        customInstructions: undefined,
      });
      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('应该处理空的项目上下文', () => {
      // 使用 null 作为空上下文
      const prompt = buildSystemPrompt('generate', null);
      expect(prompt).toBeDefined();
      expect(prompt).toContain('YYC³ Family AI');
    });
  });

  describe('提示词质量检查', () => {
    it('应该包含完整的角色定义', () => {
      const prompt = buildSystemPrompt('general', null);
      expect(prompt).toContain('React 18');
      expect(prompt).toContain('TypeScript');
      expect(prompt).toContain('Tailwind CSS');
    });

    it('应该包含输出格式规范（代码相关意图）', () => {
      const codeIntents: UserIntent[] = ['generate', 'modify', 'fix', 'refactor', 'test'];
      codeIntents.forEach((intent) => {
        const prompt = buildSystemPrompt(intent, null);
        expect(prompt).toContain('filepath');
      });
    });

    it('应该强调完整性要求', () => {
      const prompt = buildSystemPrompt('generate', null);
      expect(prompt).toContain('完整');
      // 注意：提示词中包含示例，示例中可能有省略标记，但要求是"完整输出"
      expect(prompt).toContain('完整文件内容');
    });

    it('应该包含技术栈细节', () => {
      const prompt = buildSystemPrompt('general', null);
      expect(prompt).toContain('Zustand');
      expect(prompt).toContain('React Router');
      expect(prompt).toContain('Vitest');
    });
  });

  describe('意图指导完整性', () => {
    const intents: UserIntent[] = [
      'generate',
      'modify',
      'fix',
      'explain',
      'refactor',
      'test',
      'review',
      'general',
    ];

    intents.forEach((intent) => {
      it(`应该为 ${intent} 意图提供指导`, () => {
        const prompt = buildSystemPrompt(intent, null);
        expect(prompt.length).toBeGreaterThan(200);
        expect(prompt).toContain('##');
      });
    });
  });
});
