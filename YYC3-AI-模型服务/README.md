---
file: README.md
title: YYC³ AI-模型服务 — 分类目录索引
description: YYC³ AI-模型服务 分类目录索引：LLM 网关、推理服务、模型训练/蒸馏、RAG 与向量检索基础设施；收录 16 个项目
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-10
updated: 2026-11-10
status: stable
tags: [index, category, 模型服务]
category: category-index
language: zh-CN
audience: developers,architects
complexity: basic
---

# YYC³ AI-模型服务 — 分类目录索引

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

**AI-模型服务**：LLM 网关、推理服务、模型训练/蒸馏、RAG 与向量检索基础设施。

| 指标 | 值 |
| --- | --- |
| 收录项目 | 16 个 |
| 文件数 | 38,861 |
| 体积 | 1.46 GB |
| 合并重复副本 | 11 个 |

## 二、命名规则

- 项目目录统一为 `YYC3-AI-模型服务-{项目原名}`（《YYC³ 团队通用-命名规范》§5：路径与目录使用 ASCII `YYC3`）
- 原名中的空格统一归一为 `-`（如 `Accumulo 3.0.0` → `Accumulo-3.0.0`）
- `-v2` / `-v3` 后缀表示**同名但内容不同**的版本变体，非重复项，禁止直接合并

## 三、项目清单（16 个）

| 目录 | 原始路径 | 文件数 | 体积 | 技术信号 | 备注 |
| --- | --- | --- | --- | --- | --- |
| YYC3-AI-模型服务-GenerativeAI-Starter-Kit | `` | 151 | 0.6 MB | pyproject.toml, setup.py, requirements.txt ｜ .md .py .sh |  |
| YYC3-AI-模型服务-GenerativeAIExamples | `` | 66 | 0.2 MB | setup.py, requirements.txt, Dockerfile ｜ .md .py .txt |  |
| YYC3-AI-模型服务-gateway | `` | 766 | 37.4 MB | package.json, Dockerfile ｜ .ts .ipynb .json |  |
| YYC3-AI-模型服务-litellm | `` | 10,789 | 183.4 MB | package.json, pyproject.toml, docker-compose.yml ｜ .py .tsx .ts |  |
| YYC3-AI-模型服务-llama_index | `` | 9,795 | 728.1 MB | pyproject.toml ｜ .py .md .ipynb |  |
| YYC3-AI-模型服务-ms-swift | `` | 1,546 | 25.0 MB | setup.py, requirements.txt ｜ .py .sh .md |  |
| YYC3-AI-模型服务-nanobot | `` | 284 | 33.6 MB | pyproject.toml, docker-compose.yml, Dockerfile ｜ .py .md .sh |  |
| YYC3-AI-模型服务-new-api | `` | 2,219 | 20.4 MB | go.mod, docker-compose.yml, Dockerfile ｜ .go .tsx .jsx |  |
| YYC3-AI-模型服务-ollama | `` | 1,350 | 45.4 MB | go.mod, CMakeLists.txt, Dockerfile ｜ .go .png .tsx |  |
| YYC3-AI-模型服务-ollama-llm-platform | `` | 41 | 0.4 MB | package.json ｜ .ts .tsx .sh |  |
| YYC3-AI-模型服务-one-api | `` | 563 | 2.5 MB | go.mod, docker-compose.yml, Dockerfile ｜ .js .go .svg |  |
| YYC3-AI-模型服务-ragflow | `` | 6,267 | 68.5 MB | pyproject.toml, go.mod, Dockerfile ｜ .go .py .tsx |  |
| YYC3-AI-模型服务-server-main | `` | 1,667 | 16.4 MB | pyproject.toml, CMakeLists.txt ｜ .pbtxt .py .sh |  |
| YYC3-AI-模型服务-shannon | `` | 191 | 25.5 MB | package.json, docker-compose.yml, Dockerfile ｜ .ts .txt .md |  |
| YYC3-AI-模型服务-trt-samples-for-hackathon-cn | `` | 1,806 | 258.9 MB | — ｜ .py .log .md |  |
| YYC3-AI-模型服务-zeroclaw | `` | 1,360 | 49.6 MB | Cargo.toml, docker-compose.yml, Dockerfile ｜ .rs .md .png |  |

## 四、治理说明

本目录由 2026-11-10 全局资产治理（P2 去重 + P3 分类迁移 + 编号变体清理 + 版本裁决）生成：

- 基线标签：`pre-governance-20261110`
- 迁移前该分类下的项目分散在字母桶与领域桶中，现已统一收敛
- 累计清理：本分类移除 11 个重复/冗余副本（编号变体与旧版本）
- 回滚清单：[YYC3-项目治理-回滚清单.csv](../../docs/YYC3-项目治理-资产盘点/YYC3-项目治理-回滚清单.csv)
- 治理报告：[README.md](../../docs/YYC3-项目治理-资产盘点/README.md)

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| --- | --- | --- | --- |
| v1.0.0 | 2026-11-10 | 分类目录建立，收录 16 个项目（合并 11 个重复副本） | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
