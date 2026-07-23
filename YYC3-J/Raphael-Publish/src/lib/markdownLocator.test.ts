import { describe, test, expect } from 'vitest';
import { findElementPosition } from './markdownLocator';

describe('findElementPosition - 全局索引定位', () => {
  const markdownText = `# 一级标题

这是第一段文字。

这是第二段文字。

## 二级标题

- 列表项 1
- 列表项 2

> 这是一段引用

\`\`\`javascript
const x = 1;
\`\`\`

| 列1 | 列2 |
|-----|-----|
| A   | B   |

---

最后一段文字。`;

  // 全局索引映射：
  // 0: # 一级标题
  // 1: 第一段文字
  // 2: 第二段文字
  // 3: ## 二级标题
  // 4: 列表（- 列表项 1, 列表项 2）
  // 5: 引用
  // 6: 代码块
  // 7: 表格
  // 8: 分割线
  // 9: 最后一段文字

  test('通过全局索引找到标题', () => {
    const result = findElementPosition(markdownText, 'heading', '', 0);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('heading');
    if (result) {
      expect(result.start).toBeLessThan(result.end);
    }
  });

  test('通过全局索引找到段落', () => {
    const result = findElementPosition(markdownText, 'paragraph', '', 1);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('paragraph');
  });

  test('通过全局索引找到列表', () => {
    const result = findElementPosition(markdownText, 'list', '', 4);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('list');
  });

  test('通过全局索引找到引用', () => {
    const result = findElementPosition(markdownText, 'quote', '', 6);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('quote');
  });

  test('通过全局索引找到代码块', () => {
    const result = findElementPosition(markdownText, 'code', '', 7);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('code');
  });

  test('通过内容找到标题', () => {
    const result = findElementPosition(markdownText, 'heading', '二级标题', 0);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('heading');
  });

  // Note: 图片定位使用专门的 findImagePosition 函数（在 imageSelector.ts 中）
  // 不再通过 findElementPosition 处理，所以这里不测试图片类型

  // 新增：测试表格之后的元素定位
  describe('表格之后元素定位', () => {
    const tableWithElementsMarkdown = `# 标题

段落内容

| 列1 | 列2 |
|-----|-----|
| A   | B   |
| C   | D   |

表格后的段落

---

表格后的分割线`;

    // 全局索引映射（表格分隔符行不计入索引）：
    // 0: # 标题
    // 1: 段落内容
    // 2: 表格行1 (| 列1 | 列2 |)
    // 3: 表格行3 (| A   | B   |) - 跳过了分隔符 |-----|-----|
    // 4: 表格行4 (| C   | D   |)
    // 5: 表格后的段落
    // 6: 分割线

    test('表格后的段落可以定位', () => {
      const result = findElementPosition(tableWithElementsMarkdown, 'paragraph', '', 5);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('paragraph');

      const matchedText = tableWithElementsMarkdown.substring(result!.start, result!.end);
      expect(matchedText).toContain('表格后的段落');
      expect(matchedText).not.toContain('|'); // 确保不是表格内容
    });

    test('表格后的分割线可以定位', () => {
      const result = findElementPosition(tableWithElementsMarkdown, 'hr', '', 6);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('hr');

      const matchedText = tableWithElementsMarkdown.substring(result!.start, result!.end);
      expect(matchedText).toContain('---');
    });
  });

  // 新增：测试多列表块全局索引定位
  
  describe('多引用块全局索引定位', () => {
    const multiQuoteMarkdown = `这是第一段引用的内容：

> 这是第一个引用块
> 包含多行内容
> 这是第三行

这是普通段落分隔

这是第二段引用：

> 这是第二个引用块
> 同样包含多行

这是第三个引用块：
> 这是第三个引用块的单行内容`;

    // 全局索引映射：
    // 0: 这是第一段引用的内容：
    // 1: 引用块1（> 这是第一个引用块...）
    // 2: 这是普通段落分隔
    // 3: 这是第二段引用：
    // 4: 引用块2（> 这是第二个引用块...）
    // 5: 这是第三个引用块：
    // 6: 引用块3（> 这是第三个引用块的单行内容）

    test('通过全局索引找到第一个引用块', () => {
      const result = findElementPosition(multiQuoteMarkdown, 'quote', '', 1);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('quote');

      // 验证找到的是整个第一个引用块
      const matchedText = multiQuoteMarkdown.substring(result!.start, result!.end);
      expect(matchedText).toContain('> 这是第一个引用块');
      expect(matchedText).toContain('> 包含多行内容');
      expect(matchedText).not.toContain('> 这是第二个引用块');
    });

    test('通过全局索引找到第二个引用块', () => {
      const result = findElementPosition(multiQuoteMarkdown, 'quote', '', 4);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('quote');

      // 验证找到的是整个第二个引用块
      const matchedText = multiQuoteMarkdown.substring(result!.start, result!.end);
      expect(matchedText).toContain('> 这是第二个引用块');
      expect(matchedText).toContain('> 同样包含多行');
      expect(matchedText).not.toContain('> 这是第一个引用块');
      expect(matchedText).not.toContain('> 这是第三个引用块');
    });

    test('处理单行和多行引用块的混合', () => {
      const mixedMarkdown = `> 单行引用

段落

> 多行引用
> 第二行
> 第三行

> 另一个单行引用`;

      // 全局索引映射：
      // 0: 引用块1（> 单行引用）
      // 1: 段落
      // 2: 引用块2（> 多行引用...）
      // 3: 引用块3（> 另一个单行引用）

      const result1 = findElementPosition(mixedMarkdown, 'quote', '', 0);
      expect(result1).not.toBeNull();

      const result2 = findElementPosition(mixedMarkdown, 'quote', '', 2);
      expect(result2).not.toBeNull();
      const matched2 = mixedMarkdown.substring(result2!.start, result2!.end);
      expect(matched2).toContain('> 第二行');

      const result3 = findElementPosition(mixedMarkdown, 'quote', '', 3);
      expect(result3).not.toBeNull();
    });
  });

  // 新增：测试链接行为（全局索引）
  describe('链接点击行为（全局索引）', () => {
    // 注意：当前实现中，单独的链接行会被当作段落
    // 这符合 markdown 规范，因为链接是行内元素
    const linkMarkdown = `# 测试链接

[点击访问 GitHub](https://github.com)

这是普通段落，点击应该定位。

这是一个带链接的段落，[这里有个链接](https://example.com)，然后是段落结尾。`;

    // 全局索引映射：
    // 0: # 测试链接
    // 1: 段落（包含链接）
    // 2: 段落（这是普通段落...）
    // 3: 段落（这是一个带链接的段落...）

    test('第1个段落是链接行', () => {
      const result = findElementPosition(linkMarkdown, 'paragraph', '', 1);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('paragraph');

      const matchedText = linkMarkdown.substring(result!.start, result!.end);
      expect(matchedText).toContain('[点击访问 GitHub](https://github.com)');
    });

    test('第2个段落是真正的段落', () => {
      const result = findElementPosition(linkMarkdown, 'paragraph', '', 2);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('paragraph');

      const matchedText = linkMarkdown.substring(result!.start, result!.end);
      expect(matchedText).toContain('这是普通段落，点击应该定位。');
    });

    test('带链接的段落可以定位', () => {
      const result = findElementPosition(linkMarkdown, 'paragraph', '', 3);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('paragraph');

      const matchedText = linkMarkdown.substring(result!.start, result!.end);
      expect(matchedText).toContain('这是一个带链接的段落');
      expect(matchedText).toContain('[这里有个链接](https://example.com)');
    });
  });
});
