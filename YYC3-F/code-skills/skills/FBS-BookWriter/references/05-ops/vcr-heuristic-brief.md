# VCR 自动化启发式简报（P2 降级矩阵）

**版本**：1.59D

全文视觉相关性（VCR）的人工标准见 `references/02-quality/quality-check.md` 与 `references/03-product/08-visual.md`。CI / S5 前置**不做**完整 VCR 语义评分时，使用 `scripts/quality-auditor.mjs` 内下列 **3 条机读启发式**（与 `--vcr-heuristic-warn` 联动）。

## 三条规则

| 代号 | 条件 | 含义 |
|------|------|------|
| **VCR-H1** | 存在 `![]()` 或 `![空白](url)` 形式图片 Markdown | 空 alt 不利于无障碍与版式审查。 |
| **VCR-H2** | `<!-- ILLUST: ... -->` 整块中缺少 `prompt:` | 插图意图未结构化，无法复现或外发绘制。 |
| **VCR-H3** | 汉字 ≥3000 且 Mermaid 代码块密度过高（启发式阈值） | 图多文少风险，需确认每图有正文解读。 |

## 使用方式

```bash
node scripts/quality-auditor.mjs --skill-root <技能根> --glob "chapters/*.md" --vcr-heuristic-warn
```

命中任一条时：报告内列出明细；**`--vcr-heuristic-warn` 下退出码 1**（可选门禁）。

## V1 与 ILLUST

`quality-auditor` 的 **V1 视觉密度**计数包含：Mermaid、Markdown 表格、`![...](...)`、`<figure>`、以及 **完整闭合**的 `<!-- ILLUST: ... -->` 块（与 `08-visual.md` 一致）。
