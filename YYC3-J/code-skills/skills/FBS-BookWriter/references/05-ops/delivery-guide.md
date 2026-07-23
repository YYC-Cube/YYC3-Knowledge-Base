# 交付指南：从 MD 到多格式

**版本**：1.59D

## 步骤摘要

1. 在**本书根**维护终稿 Markdown（及 `.fbs/` 元数据）。
2. 在**技能根**执行：  
   `node assets/build.mjs`（可选 `--check`）→ 生成 HTML。  
3. D1 终稿：跑 `node scripts/html-delivery-smoke.mjs --html <out.html> --strict --fail-on-warn`。
4. PDF：浏览器打印或由用户自选工具；不承诺技能包内一键 PDF 链。

## 安装

见 [`01-user-install-guide.md`](../03-product/01-user-install-guide.md)。
