# HTML 交付档位（D1 / D2 / D3）

**版本**：1.59D · **质量交叉引用**：[`quality-check.md`](../02-quality/quality-check.md) C0-5、[`book-level-consistency.md`](../02-quality/book-level-consistency.md) §10

## 定义

| 档位 | 含义 | 条件摘要 |
|------|------|----------|
| **D1** | 专业 HTML 终稿 | 由技能包 `assets/build.mjs` 构建；`npm install` 含脚注相关链；S6 前 **`html-delivery-smoke.mjs --strict --fail-on-warn`** 退出码 0 |
| **D2** | 仅 MD 或可编辑 HTML | 无完整构建链时的诚实声明 |
| **D3** | 会话内草稿 HTML | **禁止**冒充 D1 |

## 命令

```bash
node scripts/html-delivery-smoke.mjs --html <路径.html> --strict --fail-on-warn
```

无 Node 时须在交付说明中**显式降级**为 D2。
