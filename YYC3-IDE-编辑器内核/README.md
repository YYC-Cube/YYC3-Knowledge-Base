---
file: README.md
title: YYC³ IDE-编辑器内核 — 分类目录索引
description: YYC³ IDE-编辑器内核 分类目录索引：编辑器/IDE 主体实现与发行版；收录 13 个项目
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-10
updated: 2026-11-10
status: stable
tags: [index, category, 编辑器内核]
category: category-index
language: zh-CN
audience: developers,architects
complexity: basic
---

# YYC³ IDE-编辑器内核 — 分类目录索引

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

**IDE-编辑器内核**：编辑器/IDE 主体实现与发行版。

| 指标 | 值 |
| --- | --- |
| 收录项目 | 13 个 |
| 文件数 | 49,604 |
| 体积 | 702.2 MB |
| 合并重复副本 | 2 个 |

## 二、命名规则

- 项目目录统一为 `YYC3-IDE-编辑器内核-{项目原名}`（《YYC³ 团队通用-命名规范》§5：路径与目录使用 ASCII `YYC3`）
- 原名中的空格统一归一为 `-`（如 `Accumulo 3.0.0` → `Accumulo-3.0.0`）
- `-v2` / `-v3` 后缀表示**同名但内容不同**的版本变体，非重复项，禁止直接合并

## 三、项目清单（13 个）

| 目录 | 原始路径 | 文件数 | 体积 | 技术信号 | 备注 |
| --- | --- | --- | --- | --- | --- |
| YYC3-IDE-编辑器内核-RedPanda-CPP | `` | 1,929 | 16.3 MB | CMakeLists.txt ｜ .png .svg .cpp |  |
| YYC3-IDE-编辑器内核-arduino-ide | `` | 1,646 | 18.4 MB | package.json, go.mod ｜ .yml .ts .json |  |
| YYC3-IDE-编辑器内核-code-server | `` | 242 | 1.6 MB | package.json ｜ .ts .diff .md |  |
| YYC3-IDE-编辑器内核-ide | `` | 406 | 4.8 MB | — ｜ .ts .tsx .md |  |
| YYC3-IDE-编辑器内核-lapce | `` | 382 | 5.9 MB | Cargo.toml ｜ .svg .rs .toml |  |
| YYC3-IDE-编辑器内核-liteide | `` | 1,877 | 12.3 MB | — ｜ .h .cpp .png |  |
| YYC3-IDE-编辑器内核-openvscode-server | `` | 9,138 | 128.9 MB | package.json ｜ .ts .json .css |  |
| YYC3-IDE-编辑器内核-spyder | `` | 2,440 | 46.4 MB | pyproject.toml, setup.py ｜ .js .py .svg |  |
| YYC3-IDE-编辑器内核-theia | `` | 4,043 | 39.5 MB | package.json ｜ .ts .json .tsx |  |
| YYC3-IDE-编辑器内核-void | `` | 7,844 | 126.5 MB | package.json ｜ .ts .json .css |  |
| YYC3-IDE-编辑器内核-vscode | `` | 15,102 | 197.1 MB | package.json ｜ .ts .json .css |  |
| YYC3-IDE-编辑器内核-vscodium | `` | 354 | 29.2 MB | — ｜ .patch .ico .icns |  |
| YYC3-IDE-编辑器内核-zed | `` | 4,201 | 75.2 MB | Cargo.toml ｜ .rs .svg .json |  |

## 四、治理说明

本目录由 2026-11-10 全局资产治理（P2 去重 + P3 分类迁移 + 编号变体清理 + 版本裁决）生成：

- 基线标签：`pre-governance-20261110`
- 迁移前该分类下的项目分散在字母桶与领域桶中，现已统一收敛
- 累计清理：本分类移除 2 个重复/冗余副本（编号变体与旧版本）
- 回滚清单：[YYC3-项目治理-回滚清单.csv](../../docs/YYC3-项目治理-资产盘点/YYC3-项目治理-回滚清单.csv)
- 治理报告：[README.md](../../docs/YYC3-项目治理-资产盘点/README.md)

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| --- | --- | --- | --- |
| v1.0.0 | 2026-11-10 | 分类目录建立，收录 13 个项目（合并 2 个重复副本） | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
