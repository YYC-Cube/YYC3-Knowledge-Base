---
file: README.md
title: YYC³ 知识库 — CI 校验脚本
description: docs 一致性校验脚本说明：检查项、运行方式与失败处置
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-26
updated: 2026-11-26
status: stable
tags: [ci, docs, 校验, 治理]
category: governance
language: zh-CN
audience: developers,maintainers
complexity: basic
---

# YYC³ 知识库 — CI 校验脚本

本目录存放 GitHub Actions 使用的校验脚本，作为 **Pages 部署的前置门禁**：
文档改错、口径漂移、链接外泄都会在 CI 阶段被拦下，而不是发布后再发现。

## 一、脚本清单

| 脚本 | 作用 | 使用方 |
| ---- | ---- | ------ |
| `check_docs.py` | docs 一致性 / 链接 / 结构 / front matter 校验 | `docs-check.yml`、`pages.yml`（validate 作业） |

## 二、本地运行

```bash
python3 .github/scripts/check_docs.py          # 常规校验
python3 .github/scripts/check_docs.py --strict # CI 模式（front matter 缺失即失败）
```

仅需 `docs/` 目录即可运行，无需完整仓库（CI 用 sparse-checkout 只拉 docs 与脚本）。

## 三、检查项

| # | 检查项 | 失败含义 |
| - | ------ | -------- |
| 1 | 资产看板 `DATA` 结构自洽 | 分类/项目/文件/体积汇总互不相等，或 `path` 重复 |
| 2 | 分类 ↔ 可视化架构页 1:1 | 新增/删除分类后漏建或漏删页面 |
| 3 | 侧栏导航项数量、页脚快照、高亮项 | 页面共用骨架被改坏 |
| 4 | 每张分类页首屏统计与卡片数 | 页面数字与 `DATA` 漂移 |
| 5 | 分类索引 README 表格与 `DATA` 一致 | 表格行数/项目数/文件数不一致 |
| 6 | 全局汇总映射行数、连续编号、合计行 | 映射表漏行或编号断裂 |
| 7 | docs 内外泄链接、失效链接 | 链接指向 `docs/` 之外（Pages 只发布 docs/，线上必然 404） |
| 8 | HTML 标签闭合 | 手工改页面导致结构损坏 |
| 9 | Markdown front matter 齐备 | 缺少标头字段（`--strict` 下失败） |

> 代码示例中的链接会被自动剔除（`<script>`/`<style>` 块、Markdown 代码块与行内代码），
> 避免把示例代码里的 `/test`、`${var}` 之类误判为失效链接。

## 四、失败处置

1. 按报错定位：报错信息直接给出文件、行内对象与期望值
2. 数字类不一致 → 以资产看板 `DATA` 为唯一真源，回填分类页/README/映射表
3. 新增分类 → 需同时更新：`DATA.categories`、分类页、索引卡片、分类索引 README、全局汇总映射
4. 链接外泄 → 改为仓库 GitHub 链接或 `docs/` 内相对路径

## 五、关联

- [部署工作流](../workflows/pages.yml) · [校验工作流](../workflows/docs-check.yml)
- [全局汇总映射](../../docs/YYC3-项目治理-全局汇总映射.md) · [资产看板](../../docs/YYC3-KNOWLEDGE-BASE.html)
