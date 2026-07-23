# 写作者 vs 维护者读什么

**版本**：1.59D

## 写作者 / 主编（P0）

1. [`SKILL.md`](../../SKILL.md) 行为约定 + L0 指针  
2. [`skill-index.md`](../01-core/skill-index.md) 快速学习路径  
3. [`promise-code-user-alignment.md`](./promise-code-user-alignment.md)  
4. [`section-3-workflow.md`](../01-core/section-3-workflow.md)  
5. [`quality-check.md`](../02-quality/quality-check.md)

## 维护者 / 集成

- `scripts/*.mjs` 头注释  
- [`search-policy.json`](./search-policy.json)  
- [`p0-cli-map.md`](./p0-cli-map.md)（P0 规则与脚本对照）  
- `package.json` scripts（`gate:s3`、`fbs:esm`、`audit:pending` 等）

## 勿混用

NLU 全文与 §4 全文**不要**默认注入；见 `section-nlu.md`「NLU 与 §4 的上下文边界」。
