// @ts-nocheck
/**
 * @file: CodeValidator.test.ts
 * @description: CodeValidator 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CodeValidator, ValidationResult, ParsedCodeBlock } from '../CodeValidator';

describe('CodeValidator', () => {
  let validator: CodeValidator;

  beforeEach(() => {
    validator = new CodeValidator();
  });

  describe('基础验证', () => {
    it('应该通过有效代码的验证', () => {
      const block: ParsedCodeBlock = {
        filepath: 'test.ts',
        content: 'const x = 1;',
        language: 'ts',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metrics.lines).toBe(1);
      expect(result.metrics.characters).toBe(12);
    });

    it('应该拒绝空代码', () => {
      const block: ParsedCodeBlock = {
        filepath: 'test.ts',
        content: '',
        language: 'ts',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('代码为空');
    });

    it('应该拒绝只有空白的代码', () => {
      const block: ParsedCodeBlock = {
        filepath: 'test.ts',
        content: '   \n\t  ',
        language: 'ts',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('代码为空');
    });
  });

  describe('长度检查', () => {
    it('应该警告接近长度限制的代码', () => {
      const longContent = 'x'.repeat(8500); // 85% of MAX_FILE_LENGTH
      const block: ParsedCodeBlock = {
        filepath: 'test.ts',
        content: longContent,
        language: 'ts',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.warnings.some(w => w.includes('代码接近长度限制'))).toBe(true);
    });

    it('应该拒绝超过长度限制的代码', () => {
      const tooLongContent = 'x'.repeat(11000); // > MAX_FILE_LENGTH
      const block: ParsedCodeBlock = {
        filepath: 'test.ts',
        content: tooLongContent,
        language: 'ts',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('代码过长'))).toBe(true);
    });

    it('应该警告行数过多的代码', () => {
      const manyLines = Array(550).fill('const x = 1;').join('\n');
      const block: ParsedCodeBlock = {
        filepath: 'test.ts',
        content: manyLines,
        language: 'ts',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.warnings.some(w => w.includes('文件行数较多'))).toBe(true);
    });
  });

  describe('语法验证', () => {
    describe('括号匹配', () => {
      it('应该通过正确匹配的括号', () => {
        const block: ParsedCodeBlock = {
          filepath: 'test.ts',
          content: 'const fn = () => { return [1, 2, 3]; };',
          language: 'ts',
          isNewFile: true
        };

        const result = validator.validate(block);

        expect(result.errors).not.toContain(
          expect.stringContaining('括号不匹配')
        );
      });

      it('应该检测未闭合的括号', () => {
        const block: ParsedCodeBlock = {
          filepath: 'test.ts',
          content: 'const fn = () => { return [1, 2, 3];',
          language: 'ts',
          isNewFile: true
        };

        const result = validator.validate(block);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('括号不匹配'))).toBe(true);
      });

      it('应该检测不匹配的括号', () => {
        const block: ParsedCodeBlock = {
          filepath: 'test.ts',
          content: 'const arr = [1, 2, 3);',
          language: 'ts',
          isNewFile: true
        };

        const result = validator.validate(block);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('括号不匹配'))).toBe(true);
      });
    });

    describe('字符串检查', () => {
      it('应该检测未闭合的字符串', () => {
        const block: ParsedCodeBlock = {
          filepath: 'test.ts',
          content: 'const str = "hello world;',
          language: 'ts',
          isNewFile: true
        };

        const result = validator.validate(block);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('存在未闭合的字符串');
      });

      it('应该通过正确闭合的字符串', () => {
        const block: ParsedCodeBlock = {
          filepath: 'test.ts',
          content: 'const str = "hello world";',
          language: 'ts',
          isNewFile: true
        };

        const result = validator.validate(block);

        expect(result.errors).not.toContain('存在未闭合的字符串');
      });

      it('应该正确处理转义字符', () => {
        const block: ParsedCodeBlock = {
          filepath: 'test.ts',
          content: 'const str = "hello \\"world\\"";',
          language: 'ts',
          isNewFile: true
        };

        const result = validator.validate(block);

        expect(result.errors).not.toContain('存在未闭合的字符串');
      });
    });

    describe('debugger 检查', () => {
      it('应该警告包含 debugger 的代码', () => {
        const block: ParsedCodeBlock = {
          filepath: 'test.ts',
          content: 'debugger; const x = 1;',
          language: 'ts',
          isNewFile: true
        };

        const result = validator.validate(block);

        expect(result.warnings).toContain('代码中包含 debugger 语句');
      });
    });
  });

  describe('安全性检查', () => {
    it('应该警告使用 eval()', () => {
      const block: ParsedCodeBlock = {
        filepath: 'test.ts',
        content: 'eval("console.warn(x)");',
        language: 'ts',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.warnings).toContain('使用了 eval()，存在安全风险');
    });

    it('应该警告使用 Function()', () => {
      const block: ParsedCodeBlock = {
        filepath: 'test.ts',
        content: 'const fn = new Function("x", "return x + 1");',
        language: 'ts',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.warnings).toContain('动态创建函数，可能存在风险');
    });

    it('应该警告使用 innerHTML', () => {
      const block: ParsedCodeBlock = {
        filepath: 'test.ts',
        content: 'element.innerHTML = "<div>test</div>";',
        language: 'ts',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.warnings).toContain('使用 innerHTML，注意 XSS 风险');
    });

    it('应该警告使用 dangerouslySetInnerHTML', () => {
      const block: ParsedCodeBlock = {
        filepath: 'test.tsx',
        content: '<div dangerouslySetInnerHTML={{__html: html}} />',
        language: 'tsx',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.warnings).toContain('使用 dangerouslySetInnerHTML，确保内容安全');
    });

    it('应该警告使用 document.write', () => {
      const block: ParsedCodeBlock = {
        filepath: 'test.js',
        content: 'document.write("test");',
        language: 'js',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.warnings).toContain('使用 document.write，已废弃');
    });

    it('应该拒绝硬编码密码', () => {
      const block: ParsedCodeBlock = {
        filepath: 'test.ts',
        content: 'const password = "my-secret-password";',
        language: 'ts',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('可能包含硬编码密码');
    });

    it('应该拒绝硬编码 API key', () => {
      const block: ParsedCodeBlock = {
        filepath: 'test.ts',
        content: 'const api_key = "sk-123456";',
        language: 'ts',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('可能包含硬编码 API key');
    });

    it('应该拒绝硬编码密钥', () => {
      const block: ParsedCodeBlock = {
        filepath: 'test.ts',
        content: 'const secret = "my-secret-key";',
        language: 'ts',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('可能包含硬编码密钥');
    });
  });

  describe('最佳实践检查', () => {
    it('应该警告过多的 console.log', () => {
      const content = Array(7).fill('console.log("test");').join('\n');
      const block: ParsedCodeBlock = {
        filepath: 'test.ts',
        content,
        language: 'ts',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.warnings.some(w => w.includes('存在多个 console.log'))).toBe(true);
    });

    it('应该建议处理 TODO', () => {
      const block: ParsedCodeBlock = {
        filepath: 'test.ts',
        content: '// TODO: implement this\nconst x = 1;',
        language: 'ts',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.suggestions.some(s => s.includes('待办事项'))).toBe(true);
    });

    it('应该建议处理 FIXME', () => {
      const block: ParsedCodeBlock = {
        filepath: 'test.ts',
        content: '// FIXME: this is broken\nconst x = 1;',
        language: 'ts',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.suggestions.some(s => s.includes('待办事项'))).toBe(true);
    });

    it('应该建议避免 any 类型', () => {
      const block: ParsedCodeBlock = {
        filepath: 'test.ts',
        content: 'const x: any = 1;',
        language: 'ts',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.suggestions).toContain('使用了 any 类型，建议使用具体类型');
    });

    it('应该建议导出模块内容', () => {
      const block: ParsedCodeBlock = {
        filepath: 'test.ts',
        content: 'const x = 1;',
        language: 'ts',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.suggestions).toContain('文件没有导出任何内容，确认是否为模块');
    });

    it('应该警告 React hooks 缺少导入', () => {
      const block: ParsedCodeBlock = {
        filepath: 'test.tsx',
        content: 'const [state, setState] = useState(0);',
        language: 'tsx',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.warnings).toContain('使用了 React hooks 但未导入 React');
    });
  });

  describe('代码指标计算', () => {
    it('应该正确计算行数和字符数', () => {
      const content = 'const x = 1;\nconst y = 2;\nconst z = 3;';
      const block: ParsedCodeBlock = {
        filepath: 'test.ts',
        content,
        language: 'ts',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.metrics.lines).toBe(3);
      expect(result.metrics.characters).toBe(content.length);
    });

    it('应该正确评估低复杂度代码', () => {
      const block: ParsedCodeBlock = {
        filepath: 'test.ts',
        content: 'const x = 1;',
        language: 'ts',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.metrics.complexity).toBe('low');
    });

    it('应该正确评估中等复杂度代码', () => {
      const content = `
        if (x > 0) { console.warn(x); }
        if (y > 0) { console.warn(y); }
        if (z > 0) { console.warn(z); }
        if (a > 0) { console.warn(a); }
        if (b > 0) { console.warn(b); }
        if (c > 0) { console.warn(c); }
      `;
      const block: ParsedCodeBlock = {
        filepath: 'test.ts',
        content,
        language: 'ts',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.metrics.complexity).toBe('medium');
    });

    it('应该正确评估高复杂度代码', () => {
      const content = Array(20).fill('if (x > 0) { console.warn(x); }').join('\n');
      const block: ParsedCodeBlock = {
        filepath: 'test.ts',
        content,
        language: 'ts',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.metrics.complexity).toBe('high');
    });
  });

  describe('批量验证', () => {
    it('应该正确验证多个代码块', () => {
      const blocks: ParsedCodeBlock[] = [
        {
          filepath: 'file1.ts',
          content: 'const x = 1;',
          language: 'ts',
          isNewFile: true
        },
        {
          filepath: 'file2.ts',
          content: 'const y = 2;',
          language: 'ts',
          isNewFile: true
        }
      ];

      const results = validator.validateAll(blocks);

      expect(results.size).toBe(2);
      expect(results.get('file1.ts')?.valid).toBe(true);
      expect(results.get('file2.ts')?.valid).toBe(true);
    });

    it('应该在批量验证中正确识别错误', () => {
      const blocks: ParsedCodeBlock[] = [
        {
          filepath: 'good.ts',
          content: 'const x = 1;',
          language: 'ts',
          isNewFile: true
        },
        {
          filepath: 'bad.ts',
          content: '',
          language: 'ts',
          isNewFile: true
        }
      ];

      const results = validator.validateAll(blocks);

      expect(results.get('good.ts')?.valid).toBe(true);
      expect(results.get('bad.ts')?.valid).toBe(false);
    });
  });

  describe('便捷函数', () => {
    it('validateCodeBlock 应该正常工作', async () => {
      const { validateCodeBlock } = await import('../CodeValidator');
      
      const block: ParsedCodeBlock = {
        filepath: 'test.ts',
        content: 'const x = 1;',
        language: 'ts',
        isNewFile: true
      };

      const result = validateCodeBlock(block);

      expect(result.valid).toBe(true);
    });

    it('validateCodeBlocks 应该正常工作', async () => {
      const { validateCodeBlocks } = await import('../CodeValidator');
      
      const blocks: ParsedCodeBlock[] = [
        {
          filepath: 'file1.ts',
          content: 'const x = 1;',
          language: 'ts',
          isNewFile: true
        }
      ];

      const results = validateCodeBlocks(blocks);

      expect(results.size).toBe(1);
      expect(results.get('file1.ts')?.valid).toBe(true);
    });
  });

  describe('边界情况', () => {
    it('应该正确处理注释中的代码', () => {
      const block: ParsedCodeBlock = {
        filepath: 'test.ts',
        content: '// const password = "secret";\nconst x = 1;',
        language: 'ts',
        isNewFile: true
      };

      const result = validator.validate(block);

      // 注释中的密码也应该被检测到
      expect(result.errors).toContain('可能包含硬编码密码');
    });

    it('应该正确处理多行字符串', () => {
      const block: ParsedCodeBlock = {
        filepath: 'test.ts',
        content: 'const str = `line1\nline2\nline3`;',
        language: 'ts',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.valid).toBe(true);
    });

    it('应该正确处理嵌套的对象结构', () => {
      const block: ParsedCodeBlock = {
        filepath: 'test.ts',
        content: 'const obj = { a: { b: { c: { d: 1 } } } };',
        language: 'ts',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.valid).toBe(true);
    });

    it('应该正确处理复杂的函数定义', () => {
      const block: ParsedCodeBlock = {
        filepath: 'test.ts',
        content: `
          function complex<T extends Record<string, any>>(
            arg1: T,
            arg2: (x: T) => void
          ): Promise<T> {
            return Promise.resolve(arg1);
          }
        `,
        language: 'ts',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.valid).toBe(true);
    });
  });

  describe('多语言支持', () => {
    it('应该正确验证 JavaScript 代码', () => {
      const block: ParsedCodeBlock = {
        filepath: 'test.js',
        content: 'const x = 1;',
        language: 'js',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.valid).toBe(true);
    });

    it('应该正确验证 JSX 代码', () => {
      const block: ParsedCodeBlock = {
        filepath: 'test.jsx',
        content: 'const element = <div>Hello</div>;',
        language: 'jsx',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.valid).toBe(true);
    });

    it('应该正确验证 TSX 代码', () => {
      const block: ParsedCodeBlock = {
        filepath: 'test.tsx',
        content: 'const element = <div>Hello</div>;',
        language: 'tsx',
        isNewFile: true
      };

      const result = validator.validate(block);

      expect(result.valid).toBe(true);
    });

    it('应该对其他语言跳过特定检查', () => {
      const block: ParsedCodeBlock = {
        filepath: 'test.py',
        content: 'def hello():\n  print("world")',
        language: 'py',
        isNewFile: true
      };

      const result = validator.validate(block);

      // Python 代码不应该触发 JS/TS 特定检查
      expect(result.errors).not.toContain('存在未闭合的字符串');
    });
  });
});
