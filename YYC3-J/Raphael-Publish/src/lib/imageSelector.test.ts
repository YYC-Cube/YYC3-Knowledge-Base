import { describe, test, expect } from 'vitest';
import { findImagePosition } from './imageSelector';

describe('findImagePosition', () => {
    const markdownText = `# 示例文章

这是一段文字。

![示例图片](https://example.com/image.jpg)

更多文字...

![带有标题的图片](https://example.com/photo.png "图片标题")

![data URL 图片](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==)

结尾文字。`;

    test('找到普通图片', () => {
        const result = findImagePosition(markdownText, 'https://example.com/image.jpg', '示例图片');
        expect(result).not.toBeNull();
        expect(result!.start).toBeGreaterThan(0);
        expect(result!.end).toBeGreaterThan(result!.start);
        expect(result?.alt).toBe('示例图片');
        expect(result?.src).toBe('https://example.com/image.jpg');
    });

    test('找到带标题的图片', () => {
        const result = findImagePosition(markdownText, 'https://example.com/photo.png', '带有标题的图片');
        expect(result).not.toBeNull();
        expect(result?.alt).toBe('带有标题的图片');
        expect(result?.src).toBe('https://example.com/photo.png');
    });

    test('找到 data URL 图片', () => {
        const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==';
        const result = findImagePosition(markdownText, dataUrl, 'data URL 图片');
        expect(result).not.toBeNull();
        expect(result?.src).toBe(dataUrl);
        expect(result?.alt).toBe('data URL 图片');
    });

    test('只通过 src 找到图片', () => {
        const result = findImagePosition(markdownText, 'https://example.com/image.jpg', '错误的alt');
        expect(result).not.toBeNull();
        expect(result?.src).toBe('https://example.com/image.jpg');
    });

    test('找不到不存在的图片', () => {
        const result = findImagePosition(markdownText, 'https://example.com/notfound.jpg', '不存在的图片');
        expect(result).toBeNull();
    });

    test('处理特殊字符的 alt', () => {
        const text = `![图片 (1)](https://example.com/img.jpg)`;
        const result = findImagePosition(text, 'https://example.com/img.jpg', '图片 (1)');
        expect(result).not.toBeNull();
        expect(result?.alt).toBe('图片 (1)');
    });

    test('处理多个相同图片返回第一个', () => {
        const text = `![重复](https://example.com/same.jpg)

文字分隔

![重复](https://example.com/same.jpg)`;

        const result = findImagePosition(text, 'https://example.com/same.jpg', '重复');
        expect(result).not.toBeNull();
        // 应该找到第一个
        expect(result!.start).toBeLessThan(result!.end);
        expect(text.substring(result!.start, result!.end)).toBe('![重复](https://example.com/same.jpg)');
    });

    // 新增：测试带 URL 参数的图片
    describe('带 URL 参数的图片', () => {
        test('找到带查询参数的图片', () => {
            const url = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop';
            const text = `![示例图片](${url})`;

            const result = findImagePosition(text, url, '示例图片');
            expect(result).not.toBeNull();
            expect(result?.src).toBe(url);
            expect(text.substring(result!.start, result!.end)).toBe(`![示例图片](${url})`);
        });

        test('找到带参数和标题的图片', () => {
            const url = 'https://example.com/image.jpg?w=600&h=400';
            const text = `![图片](${url} "图片标题")`;

            const result = findImagePosition(text, url, '图片');
            expect(result).not.toBeNull();
            expect(result?.src).toBe(url); // 应该不包含标题
            expect(result?.alt).toBe('图片');
        });

        test('处理多个不同参数的同一图片', () => {
            const baseUrl = 'https://example.com/image.jpg';
            const text = `![小图](${baseUrl}?w=300)

![大图](${baseUrl}?w=600)`;

            // 找到第一个
            const result1 = findImagePosition(text, `${baseUrl}?w=300`, '小图');
            expect(result1).not.toBeNull();
            expect(result1?.alt).toBe('小图');

            // 找到第二个
            const result2 = findImagePosition(text, `${baseUrl}?w=600`, '大图');
            expect(result2).not.toBeNull();
            expect(result2?.alt).toBe('大图');
        });

        test('处理复杂的 URL 参数', () => {
            const url = 'https://cdn.example.com/image.png?v=1.0&token=abc123&sig=xyz789';
            const text = `![复杂参数图片](${url})`;

            const result = findImagePosition(text, url, '复杂参数图片');
            expect(result).not.toBeNull();
            expect(result?.src).toBe(url);
        });

        test('URL 参数中的特殊字符', () => {
            const url = 'https://example.com/image.jpg?size=large&quality=95&format=webp';
            const text = `![高质量图片](${url})`;

            const result = findImagePosition(text, url, '高质量图片');
            expect(result).not.toBeNull();
            expect(result?.src).toBe(url);
        });
    });

    // 新增：测试粘贴的图片（data URL）
    describe('粘贴图片（data URL）', () => {
        const longDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mN88++fPwMxwH9H/YfH/yFMAKlQK4T2Uq12AAAAAElFTkSuQmCC';

        test('找到粘贴的默认图片', () => {
            const text = `![图片 · 14:30](${longDataUrl})`;
            const result = findImagePosition(text, longDataUrl, '图片 · 14:30');
            expect(result).not.toBeNull();
            expect(result?.alt).toBe('图片 · 14:30');
            expect(result?.src).toBe(longDataUrl);
        });

        test('通过 alt 找到粘贴图片', () => {
            const text = `![图片 1 · 14:30](${longDataUrl})`;
            const result = findImagePosition(text, longDataUrl, '图片 1 · 14:30');
            expect(result).not.toBeNull();
            expect(result?.alt).toBe('图片 1 · 14:30');
        });

        test('处理多个粘贴图片', () => {
            const dataUrl1 = 'data:image/png;base64,AAAAAAA';
            const dataUrl2 = 'data:image/png;base64,BBBBBBB';

            const text = `![图片 1 · 14:30](${dataUrl1})

![图片 2 · 14:30](${dataUrl2})`;

            // 找到第一个
            const result1 = findImagePosition(text, dataUrl1, '图片 1 · 14:30');
            expect(result1).not.toBeNull();
            expect(text.substring(result1!.start, result1!.end)).toContain(dataUrl1);

            // 找到第二个
            const result2 = findImagePosition(text, dataUrl2, '图片 2 · 14:30');
            expect(result2).not.toBeNull();
            expect(result2!.start).toBeGreaterThan(result1!.start);
        });

        test('处理混合图片类型（URL + data URL）', () => {
            const text = `![网络图片](https://example.com/img.jpg)

![粘贴图片 · 14:30](${longDataUrl})`;

            const result = findImagePosition(text, longDataUrl, '粘贴图片 · 14:30');
            expect(result).not.toBeNull();
            expect(result?.alt).toBe('粘贴图片 · 14:30');
            expect(result?.src).toContain('data:image/png;base64');
        });
    });

    // 新增：测试 data URL 部分匹配
    describe('data URL 模糊匹配', () => {
        test('通过 alt 匹配找到 data URL 图片', () => {
            const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD';
            const text = `![截图 · 14:30](${dataUrl}moredatahere)`;

            const result = findImagePosition(text, dataUrl + 'moredatahere', '截图 · 14:30');
            expect(result).not.toBeNull();
            expect(result?.alt).toBe('截图 · 14:30');
        });

        test('找到最相似的 data URL（相同 alt）', () => {
            const text = `![图片](data:image/png;base64,ABC123VeryLongDataURL...)`;
            const similarDataUrl = 'data:image/png;base64,ABC123DifferentEnding...';

            const result = findImagePosition(text, similarDataUrl, '图片');
            // 由于 alt 相同，应该能找到（这是预期行为，因为多个粘贴图片通常有相同 alt）
            expect(result).not.toBeNull();
            expect(result?.alt).toBe('图片');
        });

        test('完全不同的 alt 和 URL 找不到', () => {
            const text = `![截图](data:image/png;base64,ABC123)`;
            const wrongDataUrl = 'data:image/jpeg;base64,XYZ789';

            const result = findImagePosition(text, wrongDataUrl, '照片');
            expect(result).toBeNull();
        });
    });

    // 新增：测试相对路径图片（PR 反馈修复）
    describe('相对路径图片（修复相对路径定位）', () => {
        test('找到相对路径图片', () => {
            const markdown = '![测试图片](./images/photo.png)';
            const result = findImagePosition(markdown, './images/photo.png', '测试图片');
            expect(result).not.toBeNull();
            expect(result?.src).toBe('./images/photo.png');
            expect(result?.alt).toBe('测试图片');
        });

        test('找到相对路径图片（带父目录）', () => {
            const markdown = '![图片](../assets/test.jpg)';
            const result = findImagePosition(markdown, '../assets/test.jpg', '图片');
            expect(result).not.toBeNull();
            expect(result?.src).toBe('../assets/test.jpg');
        });

        test('找到空 alt 的相对路径图片', () => {
            const markdown = '![](./images/photo.png)';
            const result = findImagePosition(markdown, './images/photo.png', '');
            expect(result).not.toBeNull();
            expect(result?.src).toBe('./images/photo.png');
            expect(result?.alt).toBe('');
        });

        test('找到带参数的相对路径图片', () => {
            const markdown = '![图片](./images/photo.png?w=600)';
            const result = findImagePosition(markdown, './images/photo.png?w=600', '图片');
            expect(result).not.toBeNull();
            expect(result?.src).toBe('./images/photo.png?w=600');
        });

        test('处理多个相对路径图片', () => {
            const markdown = `![图片1](./test1.png)

段落

![图片2](./test2.png)`;

            const result1 = findImagePosition(markdown, './test1.png', '图片1');
            expect(result1).not.toBeNull();

            const result2 = findImagePosition(markdown, './test2.png', '图片2');
            expect(result2).not.toBeNull();
            expect(result2!.start).toBeGreaterThan(result1!.start);
        });

        test('混合相对路径和绝对路径图片', () => {
            const markdown = `![本地图片](./local.png)

![网络图片](https://example.com/remote.jpg)`;

            const result1 = findImagePosition(markdown, './local.png', '本地图片');
            expect(result1).not.toBeNull();

            const result2 = findImagePosition(markdown, 'https://example.com/remote.jpg', '网络图片');
            expect(result2).not.toBeNull();
        });
    });
});
