/**
 * Markdown Element Indexer
 *
 * This is an ENHANCEMENT LAYER that adds click-to-locate capabilities.
 * It is decoupled from the core markdown rendering logic (markdown.ts).
 *
 * 使用中央规则文件 (indexerRules.ts) 确保与 markdownLocator.ts 一致
 *
 * Design principles:
 * 1. Core rendering (markdown.ts) stays pure - no indexing logic
 * 2. Indexing is a separate, optional layer
 * 3. Can be enabled/disabled independently
 * 4. Easy to test and maintain in isolation
 * 5. Type names and skip logic MUST match markdownLocator.ts
 */

import {
  type ElementType,
} from './indexerRules';

/**
 * Add global sequential index markers to HTML elements
 * This implements the GLOBAL indexing approach (not per-type counting)
 *
 * @param html - The rendered HTML (from markdown.ts)
 * @returns HTML with data-md-type and data-md-index attributes added
 */
export function markElementIndexes(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Use GLOBAL sequential indexing (single counter based on document order)
  let elementCount = 0;

  // Helper function to mark element and increment global counter
  const markElement = (el: Element, type: ElementType) => {
    el.setAttribute('data-md-type', type);
    el.setAttribute('data-md-index', String(elementCount++));
  };

  // Get all body children to traverse in document order
  const bodyChildren = Array.from(doc.body.children);

  // Check if there's only one container div (common pattern from applyTheme)
  let elementsToMark: Element[];
  if (bodyChildren.length === 1 && bodyChildren[0].tagName.toLowerCase() === 'div') {
    // Unwrap the container div and mark its children
    const container = bodyChildren[0];
    elementsToMark = Array.from(container.children);
  } else {
    elementsToMark = bodyChildren;
  }

  // Traverse all elements in document order and assign global indices
  elementsToMark.forEach(el => {
    const tagName = el.tagName.toLowerCase();

    // Mark block-level elements with global index
    // 使用中央规则确保类型名称与 markdownLocator 一致

    // Heading: h1, h2, h3, h4, h5, h6
    if (tagName.match(/^h[1-6]$/)) {
      markElement(el, 'heading');
    }
    // Paragraph: p
    else if (tagName === 'p') {
      const isInGrid = el.classList.contains('image-grid') || el.closest('.image-grid');

      if (isInGrid) {
        // This is an image grid - mark it as paragraph and also mark each image
        markElement(el, 'paragraph');
        const images = el.querySelectorAll('img');
        images.forEach(img => {
          img.setAttribute('data-md-type', 'image');
          img.setAttribute('data-md-index', String(elementCount - 1)); // Same index as parent grid
        });
      } else {
        // Regular paragraph - check if it contains only an image
        const images = el.querySelectorAll('img');
        const textContent = el.textContent?.trim() ?? '';
        const hasOnlyImage = images.length === 1 && textContent === '';

        if (hasOnlyImage) {
          // This is an image paragraph - mark it as both paragraph and image
          markElement(el, 'paragraph');
          // Also mark the img itself for direct clicking
          const img = images[0];
          img.setAttribute('data-md-type', 'image');
          img.setAttribute('data-md-index', String(elementCount - 1)); // Same index as parent
        } else {
          // Regular paragraph with text
          markElement(el, 'paragraph');
        }
      }
    }
    // List: mark each li (not ul/ol) - 粒度与 markdownLocator 一致
    else if (tagName === 'ul' || tagName === 'ol') {
      const listItems = el.querySelectorAll('li');
      listItems.forEach(li => {
        li.setAttribute('data-md-type', 'list');
        li.setAttribute('data-md-index', String(elementCount++));
      });
      // Don't mark the container itself
      return;
    }
    // Blockquote
    else if (tagName === 'blockquote') {
      markElement(el, 'quote');
    }
    // Code block
    else if (tagName === 'pre') {
      markElement(el, 'code');
    }
    // Table: mark each tr (not table) - 粒度与 markdownLocator 一致
    else if (tagName === 'table') {
      const rows = el.querySelectorAll('tr');
      rows.forEach(row => {
        row.setAttribute('data-md-type', 'table');
        row.setAttribute('data-md-index', String(elementCount++));
      });
      // Don't mark the container itself
      return;
    }
    // Horizontal rule
    else if (tagName === 'hr') {
      markElement(el, 'hr');
    }
    // Standalone image (not in a paragraph)
    else if (tagName === 'img') {
      markElement(el, 'image');
    }
  });

  return doc.body.innerHTML;
}

/**
 * Remove index markers from HTML (for export/copy)
 * This is useful when we want clean HTML without the internal metadata
 *
 * @param html - HTML with data-md-* attributes
 * @returns Clean HTML without index markers
 */
export function stripIndexMarkers(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove all data-md-* attributes
  const allElements = doc.querySelectorAll('*');
  allElements.forEach(el => {
    el.removeAttribute('data-md-type');
    el.removeAttribute('data-md-index');
  });

  return doc.body.innerHTML;
}
