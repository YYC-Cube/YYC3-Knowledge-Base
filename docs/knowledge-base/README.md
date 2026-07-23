---
file: README.md
description: YYC³ Knowledge Base — 技能资产导入目录索引
author: YanYuCloudCube Team
version: v1.0.0
created: 2026-07-23
updated: 2026-07-23
status: stable
tags: [知识库],[Skills],[NVIDIA],[可视化架构]
category: general
language: zh-CN
---

# YYC³ Knowledge Base — 技能资产目录

> 来源：`/Volumes/Build/YYC3-Knowledge-Base` 外部存储 + `分析总结-建议报告/` HTML 可视化架构

---

## 导入资产清单

### 文档类（4 份）

| 文件 | 说明 | 链接 |
| ---- | ---- | ---- |
| `卡片信息.md` | NVIDIA Skills 全量安装清单（42 个可安装 Skill 命令） | [打开](./卡片信息.md) |
| `命令信息.md` | 16 大类别 Skill 分类汇总表（约 150+ Skills） | [打开](./命令信息.md) |
| `技术实现边界.md` | 前端可视化架构技术实现细节 | [打开](./技术实现边界.md) |
| `分析总结-README.md` | 原始外部卷的目录索引 | [打开](./分析总结-README.md) |

### HTML 可视化架构（7 份）

| 文件 | 说明 |
| ---- | ---- |
| `YYC3-A-VISUAL-ARCHITECTURE.html` | YYC3-A 工作区可视化架构 |
| `YYC3-B-VISUAL-ARCHITECTURE.html` | YYC3-B 工作区可视化架构 |
| `YYC3-C-VISUAL-ARCHITECTURE.html` | YYC3-C 工作区可视化架构 |
| `YYC3-D-VISUAL-ARCHITECTURE.html` | YYC3-D 工作区可视化架构 |
| `YYC3-E-VISUAL-ARCHITECTURE.html` | YYC3-E 工作区可视化架构 |
| `YYC3-F-VISUAL-ARCHITECTURE.html` | YYC3-F 工作区可视化架构 |
| `YYC3-G-VISUAL-ARCHITECTURE.html` | YYC3-G 工作区可视化架构 |

---

## 安装指引

所有 NVIDIA Skills 可通过以下方式安装：

```bash
# 安装单个 Skill（需联网）
npx skills add NVIDIA/skills --skill {skill-name} --dir ./skills

# 示例：安装 RAG Blueprint
npx skills add NVIDIA/skills --skill rag-blueprint --dir ./skills

# 示例：安装 NemoClaw 安全配置
npx skills add NVIDIA/skills --skill nemoclaw-user-configure-security --dir ./skills
```

> ⚠️ 注意：需要网络能访问 `https://github.com/NVIDIA/skills.git`
> 当前环境暂无法克隆，待网络就绪后执行上述命令即可安装

---

## Skills 分类索引（16 大类）

| # | 类别 | 数量 | 核心 Skill 示例 |
|---|------|:----:| --------------- |
| 1 | **NemoClaw** — 沙箱安全与管理 | 16 | `nemoclaw-user-configure-security` |
| 2 | **RAG** — 检索增强生成 | 12 | `rag-blueprint`, `rag-eval`, `rag-perf` |
| 3 | **Dynamo** — 推理服务编排 | 11 | `dynamo-user-run-skill` |
| 4 | **Megatron-Bridge** — 分布式训练 | 30 | `megatron-bridge-user-multi-node` |
| 5 | **NeMo AutoModel** — 模型训练自动化 | 6 | `nemo-automodel-user-launch` |
| 6 | **NeMo-RL** — 强化学习 | 6 | `nemo-rl-user-auto-research` |
| 7 | **Nemotron** — 语音与定制化 | 4 | `nemotron-user-voice-riva` |
| 8 | **Earth2Studio** — 天气气候 AI | 7 | `earth2studio-user-install` |
| 9 | **cuOpt** — 数学优化与路径规划 | 7 | `cuopt-user-cli` |
| 10 | **Holoscan** — 医疗设备 SDK | 10 | `holoscan-user-container` |
| 11 | **DeepStream** — 视频分析 | 3 | `deepstream-user-vision` |
| 12 | **Omniverse** — 3D/USD 生态 | 3 | `omniverse-user-cad` |
| 13 | **Megatron-Core** — 框架工具链 | 10 | — |
| 14 | **Physical AI** — 物理 AI | 3 | — |
| 15 | **医疗影像 AI** | 8 | `medical-user-mr-generate` |
| 16 | **DICOM** — 医学影像数据 | 4 | `dicom-user-metadata` |
| | **合计** | **~150+** | |

---

## 外部卷目录结构

```
/Volumes/Build/YYC3-Knowledge-Base/
├── YYC3-A/          ← HTML 标准规范相关
├── YYC3-B/          ← DOM/Fetch/URL/FS/ZSH 等
├── YYC3-C/          ← Emmet/Moby(VSCode)/Tools/Go
├── YYC3-D/          ← ICU/UI/VS Code
├── YYC3-E/          ← Edict/Goose/I18N
├── YYC3-F/          ← GStack/Khoj/PI/Ruff/Shannon/Zeroclaw
├── YYC3-G/          ← 同 YYC3-F（备份）
├── YYC3-H/          ← Agent(Rust)/MUI/Spotube
├── YYC3-J/          ← Apollo/Emmet/LobeHub/Redux/Repomix
├── YYC3-N/          ← NVIDIA Python 库/DBM/JSON/RE/TOML
├── 卡片信息.md      ★ Skill 安装清单
├── 命令信息.md      ★ Skill 分类汇总
└── 技术实现边界.md   ★ 前端实现规范
```
