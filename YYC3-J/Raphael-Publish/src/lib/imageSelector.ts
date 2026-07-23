/**
 * Find and select the image markdown syntax in the editor
 */

export interface ImageMatch {
  start: number;
  end: number;
  alt: string;
  src: string;
}

/**
 * Check if a string is a data URL
 */
function isDataUrl(url: string): boolean {
  return url.startsWith('data:image/');
}

/**
 * Extract a short signature from a data URL for matching
 * For data URLs, we only match the first part since they can be very long
 */
function getDataUrlSignature(dataUrl: string): string {
  if (!isDataUrl(dataUrl)) return dataUrl;

  // Extract just the mime type and first 50 chars of base64 data
  const match = dataUrl.match(/^(data:image\/[^;]+;base64,)(.{0,50})/);
  if (match) {
    return match[1] + match[2];
  }
  return dataUrl;
}

/**
 * Find data URL image position using fuzzy matching
 */
function findDataUrlImage(text: string, imageSrc: string, imageAlt: string): ImageMatch | null {
  const signature = getDataUrlSignature(imageSrc);

  // Try to match by alt + data URL signature
  if (imageAlt) {
    const escapedSig = escapeRegex(signature.substring(signature.indexOf(',') + 1));
    const altPattern = new RegExp(
      `!\\[${escapeRegex(imageAlt)}\\]\\(data:image\\/[^;]+;base64,${escapedSig}[^\)]*\\)`,
      'g'
    );

    const altMatch = executeRegex(altPattern, text);
    if (altMatch) {
      return altMatch;
    }
  }

  // Try to find any data URL image with the same alt
  if (imageAlt) {
    const altOnlyPattern = new RegExp(
      `!\\[${escapeRegex(imageAlt)}\\]\\(data:image\\/[^)]+\\)`,
      'g'
    );

    const altMatch = executeRegex(altOnlyPattern, text);
    if (altMatch) {
      return altMatch;
    }
  }

  // As a fallback, find all data URLs and try to match by comparing the start
  const allDataUrlPattern = /!\[([^\]]*)\]\((data:image\/[^)]+)\)/g;
  let match;
  let bestMatch: ImageMatch | null = null;
  let bestSimilarity = 0;

  while ((match = allDataUrlPattern.exec(text)) !== null) {
    const matchedAlt = match[1];
    const matchedSrc = match[2];

    // Calculate similarity based on alt match and URL prefix
    let similarity = 0;

    if (matchedAlt === imageAlt) {
      similarity += 50;
    }

    // Compare URL prefixes (first 100 chars)
    const matchedPrefix = matchedSrc.substring(0, Math.min(100, matchedSrc.length));
    const targetPrefix = imageSrc.substring(0, Math.min(100, imageSrc.length));

    if (matchedPrefix === targetPrefix) {
      similarity += 50;
    } else if (targetPrefix.includes(matchedPrefix.substring(0, 50)) ||
               matchedPrefix.includes(targetPrefix.substring(0, 50))) {
      similarity += 25;
    }

    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = {
        start: match.index,
        end: match.index + match[0].length,
        alt: matchedAlt,
        src: matchedSrc
      };
    }
  }

  return bestMatch && bestSimilarity >= 25 ? bestMatch : null;
}

/**
 * Find the position of an image markdown in the text
 * @param text - The markdown text
 * @param imageSrc - The src attribute of the clicked image
 * @param imageAlt - The alt attribute of the clicked image
 * @returns The position (start, end) of the image markdown or null
 */
export function findImagePosition(text: string, imageSrc: string, imageAlt: string): ImageMatch | null {
  // Handle data URLs specially
  if (isDataUrl(imageSrc)) {
    return findDataUrlImage(text, imageSrc, imageAlt);
  }

  // Try to find exact match first
  const exactPattern = new RegExp(
    `!\\[${escapeRegex(imageAlt)}\\]\\(${escapeRegex(imageSrc)}(?:\\s+"[^"]*?")?\\)`,
    'g'
  );

  const exactMatch = executeRegex(exactPattern, text);
  if (exactMatch) {
    return exactMatch;
  }

  // Try to find by src only (alt might be different in rendered version)
  const srcOnlyPattern = new RegExp(
    `!\\[[^\\]]*\\]\\(${escapeRegex(imageSrc)}(?:\\s+"[^"]*?")?\\)`,
    'g'
  );

  const srcMatch = executeRegex(srcOnlyPattern, text);
  if (srcMatch) {
    return srcMatch;
  }

  // Try to find by alt only (for data URLs or dynamic images)
  if (imageAlt) {
    const altOnlyPattern = new RegExp(
      `!\\[${escapeRegex(imageAlt)}\\]\\([^)]+\\)`,
      'g'
    );

    const altMatch = executeRegex(altOnlyPattern, text);
    if (altMatch) {
      return altMatch;
    }
  }

  return null;
}

/**
 * Execute regex and return the first match with positions
 */
function executeRegex(pattern: RegExp, text: string): ImageMatch | null {
  const regex = new RegExp(pattern.source, pattern.flags);
  const match = regex.exec(text);

  if (match && match.index !== undefined) {
    return {
      start: match.index,
      end: match.index + match[0].length,
      alt: extractAlt(match[0]),
      src: extractSrc(match[0])
    };
  }

  return null;
}

/**
 * Extract alt text from markdown image syntax
 */
function extractAlt(markdown: string): string {
  const altMatch = markdown.match(/^!\[([^\]]*)\]/);
  return altMatch ? altMatch[1] : '';
}

/**
 * Extract src from markdown image syntax (excluding title)
 */
function extractSrc(markdown: string): string {
  const srcMatch = markdown.match(/\]\(([^)]+)\)/);
  if (!srcMatch) return '';

  // Remove title part if present (everything after the last space + quote)
  const fullSrc = srcMatch[1];
  const titleMatch = fullSrc.match(/^(.+?)\s+"[^"]*"$/);
  return titleMatch ? titleMatch[1] : fullSrc;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Select text in a textarea element
 * @param textarea - The textarea element
 * @param start - Start position
 * @param end - End position (if same as start, just moves cursor)
 */
export function selectTextAreaRange(
  textarea: HTMLTextAreaElement,
  start: number,
  end: number
): void {
  textarea.focus();
  textarea.setSelectionRange(start, end);

  // Use the improved scroll logic
  scrollToPosition(textarea, start);
}

/**
 * Move cursor to a position and scroll into view
 * Better for navigation than selecting a range
 */
export function moveCursorToPosition(
  textarea: HTMLTextAreaElement,
  position: number
): void {
  // Save current scroll position before moving cursor
  const savedScrollTop = textarea.scrollTop;

  textarea.focus();
  textarea.setSelectionRange(position, position);

  // Restore scroll position immediately to prevent browser's auto-scroll
  textarea.scrollTop = savedScrollTop;
}

/**
 * Scroll textarea to show a specific position at the top 1/3 of viewport
 * @param textarea - The textarea element
 * @param position - The character position to scroll to
 */
function scrollToPosition(textarea: HTMLTextAreaElement, position: number): void {
  const textBefore = textarea.value.substring(0, position);
  const lines = textBefore.split('\n');
  const currentLine = lines.length - 1;

  const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 20;
  const paddingTop = parseFloat(getComputedStyle(textarea).paddingTop) || 0;
  const containerHeight = textarea.clientHeight;

  // Calculate the target line's scroll position
  const targetPosition = currentLine * lineHeight - paddingTop + containerHeight / 3;

  // Only scroll if the target is outside the current visible area
  const currentScroll = textarea.scrollTop;

  if (targetPosition < currentScroll || targetPosition > currentScroll + containerHeight - lineHeight * 3) {
    // Target is outside visible area, scroll to show it at top 1/3
    textarea.scrollTop = Math.max(0, Math.min(targetPosition, textarea.scrollHeight - containerHeight));
  }
  // Otherwise, keep current scroll position (content is already visible)
}
