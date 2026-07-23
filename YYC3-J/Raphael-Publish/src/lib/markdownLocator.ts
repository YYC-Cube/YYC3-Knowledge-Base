/**
 * Markdown position locator for bi-directional sync
 * Maps rendered HTML elements back to their source positions in markdown
 *
 * 使用中央规则文件 (indexerRules.ts) 确保与 HTML 索引一致
 */

import {
  type ElementType,
  MARKDOWN_RULES,
  shouldSkipMarkdownLine,
  isValidElementType,
} from './indexerRules';

export interface ElementLocation {
  start: number;
  end: number;
  type: ElementType;
}

/**
 * Find the position of an element in markdown text using GLOBAL indexing
 * @param text - The markdown text
 * @param elementType - Type of element to find
 * @param content - Text content or identifier of the element (optional, for content-based matching)
 * @param globalIndex - GLOBAL index of the element (based on document order, not per-type count)
 * @returns The position (start, end) or null
 *
 * Usage:
 * - By index: findElementPosition(text, 'list', '', 4) - 找到全局索引为 4 的列表
 * - By content: findElementPosition(text, 'heading', '标题', 0) - 找到内容包含 '标题' 的标题（index ignored）
 */
export function findElementPosition(
  text: string,
  elementType: string,
  content: string,
  globalIndex: number = 0
): ElementLocation | null {
  // Validate element type
  if (!isValidElementType(elementType)) {
    return null;
  }

  // If content is provided, match by content (ignore index)
  if (content) {
    return findElementByContent(text, elementType as ElementType, content);
  }

  // Otherwise, match by global index
  return findElementByGlobalIndex(text, elementType as ElementType, globalIndex);
}

/**
 * Find element by content (ignores index)
 * Traverses the markdown document and finds the first element of the target type that matches the content
 */
function findElementByContent(
  text: string,
  targetType: ElementType,
  content: string
): ElementLocation | null {
  const lines = text.split('\n');
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    // Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // Detect element type and extract its full content
    const element = parseElementAt(lines, i);

    if (!element) {
      i++;
      continue;
    }

    // Check if type matches and content matches
    if (element.type === targetType && element.content) {
      if (element.content.includes(content)) {
        return {
          start: element.start,
          end: element.end,
          type: element.type,
        };
      }
    }

    // Move to next element
    i = element.nextLineIndex;
  }

  return null;
}

/**
 * Find element by global index
 * Traverses the markdown document in order and finds the element at the specified global index
 */
function findElementByGlobalIndex(
  text: string,
  targetType: ElementType,
  targetGlobalIndex: number
): ElementLocation | null {
  const lines = text.split('\n');
  let currentGlobalIndex = 0;
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    // Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // Detect element type and extract its full content
    const element = parseElementAt(lines, i);

    if (!element) {
      i++;
      continue;
    }

    // Check if this element is at our target global index
    if (currentGlobalIndex === targetGlobalIndex) {
      // Found the element at target index, now check if type matches
      if (element.type === targetType) {
        return {
          start: element.start,
          end: element.end,
          type: element.type,
        };
      }

      // Element at target index is not the right type
      // Don't return null - continue searching
    }

    // Increment global index for every element (regardless of type)
    currentGlobalIndex++;

    // Move to next element
    i = element.nextLineIndex;
  }

  return null;
}

/**
 * Parse element at given line index
 * Returns element info including type, content, position, and where to continue parsing
 *
 * 使用中央规则确保与 HTML 索引一致
 */
function parseElementAt(lines: string[], startIndex: number): {
  type: ElementType;
  content: string;
  start: number;
  end: number;
  nextLineIndex: number;
} | null {
  const line = lines[startIndex];
  const trimmed = line.trim();

  // Empty line
  if (!trimmed) {
    return null;
  }

  // 使用中央规则检测类型
  // 注意：有些类型需要特殊的多行处理（在下面单独处理）

  // Heading: #, ##, ###, etc.
  if (MARKDOWN_RULES.heading.match(trimmed)) {
    return {
      type: 'heading',
      content: trimmed.replace(/^#{1,6}\s+/, ''),
      start: getPositionInOriginalText(lines, startIndex),
      end: getPositionInOriginalText(lines, startIndex) + line.length,
      nextLineIndex: startIndex + 1,
    };
  }

  // Code block: ```language (多行，需要特殊处理)
  if (MARKDOWN_RULES.code.match(trimmed)) {
    let endIndex = startIndex + 1;
    let codeContent = '';

    while (endIndex < lines.length && !lines[endIndex].trim().startsWith('```')) {
      codeContent += lines[endIndex] + '\n';
      endIndex++;
    }

    if (endIndex < lines.length) {
      return {
        type: 'code',
        content: codeContent,
        start: getPositionInOriginalText(lines, startIndex),
        end: getPositionInOriginalText(lines, endIndex) + lines[endIndex].length,
        nextLineIndex: endIndex + 1,
      };
    }
  }

  // Horizontal rule: ---, ***, ___
  if (MARKDOWN_RULES.hr.match(trimmed)) {
    return {
      type: 'hr',
      content: '',
      start: getPositionInOriginalText(lines, startIndex),
      end: getPositionInOriginalText(lines, startIndex) + line.length,
      nextLineIndex: startIndex + 1,
    };
  }

  // Table: starts with |
  // 需要检查是否跳过分隔符行
  if (MARKDOWN_RULES.table.match(trimmed)) {
    // 使用中央规则判断是否跳过分隔符行
    if (shouldSkipMarkdownLine(trimmed, 'table')) {
      return null;
    }

    return {
      type: 'table',
      content: trimmed,
      start: getPositionInOriginalText(lines, startIndex),
      end: getPositionInOriginalText(lines, startIndex) + line.length,
      nextLineIndex: startIndex + 1,
    };
  }

  // Blockquote: starts with > (多行，需要特殊处理)
  if (MARKDOWN_RULES.quote.match(trimmed)) {
    let endIndex = startIndex;
    let quoteContent = '';

    while (endIndex < lines.length && lines[endIndex].trim().startsWith('>')) {
      quoteContent += lines[endIndex] + '\n';
      endIndex++;
    }

    return {
      type: 'quote',
      content: quoteContent,
      start: getPositionInOriginalText(lines, startIndex),
      end: getPositionInOriginalText(lines, endIndex - 1) + lines[endIndex - 1].length,
      nextLineIndex: endIndex,
    };
  }

  // List: starts with -, *, +, or number.
  if (MARKDOWN_RULES.list.match(trimmed)) {
    return {
      type: 'list',
      content: trimmed,
      start: getPositionInOriginalText(lines, startIndex),
      end: getPositionInOriginalText(lines, startIndex) + line.length,
      nextLineIndex: startIndex + 1,
    };
  }

  // Paragraph: 使用中央规则检测
  if (MARKDOWN_RULES.paragraph.match(trimmed)) {
    let endIndex = startIndex;
    let paraContent = '';

    while (endIndex < lines.length) {
      const nextLine = lines[endIndex].trim();

      // Stop at empty line
      if (!nextLine) break;

      // Stop at other block elements (使用中央规则)
      if (
        MARKDOWN_RULES.heading.match(nextLine) ||
        MARKDOWN_RULES.code.match(nextLine) ||
        MARKDOWN_RULES.hr.match(nextLine) ||
        MARKDOWN_RULES.table.match(nextLine) ||
        MARKDOWN_RULES.quote.match(nextLine) ||
        MARKDOWN_RULES.list.match(nextLine)
      ) {
        break;
      }

      paraContent += lines[endIndex] + '\n';
      endIndex++;
    }

    if (paraContent) {
      return {
        type: 'paragraph',
        content: paraContent,
        start: getPositionInOriginalText(lines, startIndex),
        end: getPositionInOriginalText(lines, endIndex - 1) + lines[endIndex - 1].length,
        nextLineIndex: endIndex,
      };
    }
  }

  return null;
}

/**
 * Get character position of a line in the original text
 */
function getPositionInOriginalText(lines: string[], lineIndex: number): number {
  let position = 0;
  for (let i = 0; i < lineIndex; i++) {
    position += lines[i].length + 1; // +1 for newline
  }
  return position;
}

/**
 * Select text in a textarea element and scroll into view
 */
export function selectTextAreaRange(
  textarea: HTMLTextAreaElement,
  start: number,
  end: number
): void {
  // Save current scroll position before changing selection
  const savedScrollTop = textarea.scrollTop;

  textarea.focus();
  textarea.setSelectionRange(start, end);

  // Restore scroll position immediately to prevent browser's auto-scroll
  textarea.scrollTop = savedScrollTop;
}
