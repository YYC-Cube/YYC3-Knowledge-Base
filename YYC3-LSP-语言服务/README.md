---
file: README.md
title: YYC³ LSP-语言服务 — 分类目录索引
description: YYC³ LSP-语言服务 分类目录索引：语言服务器、语言工具链与代码分析；收录 16 个项目
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-10
updated: 2026-11-10
status: stable
tags: [index, category, 语言服务]
category: category-index
language: zh-CN
audience: developers,architects
complexity: basic
---

# YYC³ LSP-语言服务 — 分类目录索引

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

## 核心理念

**五高架构**：高可用 | 高性能 | 高安全 | 高扩展 | 高智能
**五标体系**：标准化 | 规范化 | 自动化 | 可视化 | 智能化
**五化转型**：流程化 | 数字化 | 生态化 | 工具化 | 服务化
**五维评估**：时间维 | 空间维 | 属性维 | 事件维 | 关联维

---

## 一、分类定位

**LSP-语言服务**：语言服务器、语言工具链与代码分析。

| 指标 | 值 |
| --- | --- |
| 收录项目 | 16 个 |
| 文件数 | 22,379 |
| 体积 | 174.8 MB |
| 合并重复副本 | 7 个 |

## 二、命名规则

- 项目目录统一为 `YYC3-LSP-语言服务-{项目原名}`（《YYC³ 团队通用-命名规范》§5：路径与目录使用 ASCII `YYC3`）
- 原名中的空格统一归一为 `-`（如 `Accumulo 3.0.0` → `Accumulo-3.0.0`）
- `-v2` / `-v3` 后缀表示**同名但内容不同**的版本变体，非重复项，禁止直接合并

## 三、项目清单（16 个）

| 目录 | 原始路径 | 文件数 | 体积 | 技术信号 | 备注 |
| --- | --- | --- | --- | --- | --- |
| YYC3-LSP-语言服务-clangd-lsp | `` | 4 | 0.0 MB | — ｜ .json .md |  |
| YYC3-LSP-语言服务-csharp-language-server | `` | 135 | 0.5 MB | — ｜ .fs .cs .csproj |  |
| YYC3-LSP-语言服务-csharp-lsp | `` | 4 | 0.0 MB | — ｜ .json .md |  |
| YYC3-LSP-语言服务-gopls-lsp | `` | 4 | 0.0 MB | — ｜ .json .md |  |
| YYC3-LSP-语言服务-jdtls-lsp | `` | 4 | 0.0 MB | — ｜ .json .md |  |
| YYC3-LSP-语言服务-lsp | `` | 10,881 | 71.7 MB | — ｜ .pyi .rs .py |  |
| YYC3-LSP-语言服务-lsp-integration | `` | 6 | 0.0 MB | package.json ｜ .ts .json |  |
| YYC3-LSP-语言服务-lua-language-server | `` | 520 | 31.4 MB | Dockerfile ｜ .lua .txt .json |  |
| YYC3-LSP-语言服务-lua-lsp | `` | 4 | 0.0 MB | — ｜ .json .md |  |
| YYC3-LSP-语言服务-pyright | `` | 7,184 | 23.0 MB | package.json ｜ .pyi .py .ts |  |
| YYC3-LSP-语言服务-pyright-lsp | `` | 4 | 0.0 MB | — ｜ .json .md |  |
| YYC3-LSP-语言服务-ruby-lsp | `` | 859 | 24.5 MB | Gemfile ｜ .rb .json .rbi |  |
| YYC3-LSP-语言服务-rust-analyzer | `` | 2,259 | 19.8 MB | Cargo.toml ｜ .rs .rast .txt |  |
| YYC3-LSP-语言服务-rust-analyzer-lsp | `` | 4 | 0.0 MB | — ｜ .json .md |  |
| YYC3-LSP-语言服务-sourcekit-lsp | `` | 503 | 4.0 MB | CMakeLists.txt ｜ .swift .md .txt |  |
| YYC3-LSP-语言服务-swift-lsp | `` | 4 | 0.0 MB | — ｜ .json .md |  |

## 四、治理说明

本目录由 2026-11-10 全局资产治理（P2 去重 + P3 分类迁移 + 编号变体清理 + 版本裁决）生成：

- 基线标签：`pre-governance-20261110`
- 迁移前该分类下的项目分散在字母桶与领域桶中，现已统一收敛
- 累计清理：本分类移除 7 个重复/冗余副本（编号变体与旧版本）
- 回滚清单：[YYC3-项目治理-回滚清单.csv](../../docs/YYC3-项目治理-资产盘点/YYC3-项目治理-回滚清单.csv)
- 治理报告：[README.md](../../docs/YYC3-项目治理-资产盘点/README.md)

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| --- | --- | --- | --- |
| v1.0.0 | 2026-11-10 | 分类目录建立，收录 16 个项目（合并 7 个重复副本） | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
