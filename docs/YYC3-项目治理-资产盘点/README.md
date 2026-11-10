---
file: README.md
title: YYC³ 项目治理 — 全局资产扫描 · 重复项与分类盘点
description: 对 YYC³ 知识库全局 718 个项目目录执行指纹扫描，输出首批确认重复清单、同名近似项裁决表与 24 类分类映射方案
author: YYC³ Team <admin@0379.email>
version: v1.3.0
created: 2026-11-10
updated: 2026-11-10
status: completed
tags: [governance, audit, duplicate, taxonomy, inventory]
category: governance
language: zh-CN
audience: developers,managers,architects
complexity: advanced
---

# YYC³ 项目治理 — 全局资产扫描 · 重复项与分类盘点

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

## 一、扫描范围与方法

### 1.1 范围

| 项 | 值 |
| --- | --- |
| 扫描根目录 | `YYC3-Knowledge-Base/` |
| 一级分类桶 | 35 个（11 个字母桶 `YYC3-A`~`YYC3-N` + 24 个领域桶） |
| 二级项目目录 | **718** 个 |
| 文件总量 | **1,233,337** |
| 有效体积（不含 `.git`/`.DS_Store`） | **16.36 GB** |
| 扫描日期 | 2026-11-10 |

### 1.2 判定方法（可复现）

1. **目录指纹**：对每个项目目录递归收集 `相对路径 + 文件字节数`，排序后做 SHA-1，得到 `clean` 指纹（排除 `.git`、`.DS_Store`、`__pycache__`）；另生成含 `.git` 的 `full` 指纹用于区分「内容一致但 git 元数据不同」。
2. **精确重复**：`clean` 指纹完全相同的目录判定为「确认重复一致」。
3. **近似重复**：同名但指纹不同的目录，按「新增文件数 / 缺失文件数 / 同路径异尺寸数」三项量化差异。
4. **抽样复核**：对体积最大的若干簇执行 `diff -rq` 实测，差异仅为 `.DS_Store` 二进制内容，与指纹结论一致。

> 判定口径：**内容级一致**（忽略 VCS 元数据与 macOS 资源文件）。此口径用于判定"重复"，不会误合并「同名但内容不同」的版本。

---

## 二、总体盘点结论

| 指标 | 数值 |
| --- | --- |
| 项目目录总数 | 718 |
| **确认完全重复的簇** | **179** |
| 落入重复簇的目录数 | **369** |
| 可回收冗余空间 | **1.35 GB** |
| 同名近似（版本漂移）组 | 136 |
| 建议分类体系 | 24 类 |

**核心结论**：知识库当前为「多桶冗余快照」形态。718 个目录中有 369 个（51%）处于完全重复状态，去重后可回收 1.35 GB；另有 136 组同名不同内容的版本漂移，需要按"版本演进"而非"重复"处理。字母桶 `YYC3-A` ~ `YYC3-N` 与领域桶之间存在大量交叉复制（同一仓库被重复落入 2~4 个桶），是冗余的主要来源。

---

## 三、首批：确认重复一致清单（179 簇）

> 判定：`clean` 指纹完全一致（逐路径逐字节），忽略 `.git` 与 `.DS_Store`。
> 「保留建议」按「优先保留领域桶 → 同体积取路径字典序」生成，可人工调整。

| # | 项目 | 分类 | 副本 | 单份文件 | 单份体积 | 冗余 | 保留建议 | 全部副本路径 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **ClickHouse** | Data-数据存储 | 2 | 38,175 | 289.1 MB | 289.1 MB | YYC3-G/ClickHouse | YYC3-G/ClickHouse<br>YYC3-H/ClickHouse |
| 2 | **html** | WebSpec-Web标准 | 3 | 128 | 109.4 MB | 218.7 MB | YYC3-WebSpec-Web标准/html | YYC3-WebSpec-Web标准/html<br>YYC3-A/html<br>YYC3-B/html |
| 3 | **shadcn-ui.tnasdownload** | UI-界面组件 | 3 | 8,581 | 68.6 MB | 137.1 MB | YYC3-A/shadcn-ui.tnasdownload | YYC3-A/shadcn-ui.tnasdownload<br>YYC3-D/shadcn-ui.tnasdownload<br>YYC3-F/shadcn-ui |
| 4 | **dify** | AI-应用工具 | 2 | 14,089 | 125.8 MB | 125.8 MB | YYC3-G/dify | YYC3-G/dify<br>YYC3-I/dify |
| 5 | **shadcn-ui** | UI-界面组件 | 2 | 8,584 | 68.6 MB | 68.6 MB | YYC3-UI-用户界面/shadcn-ui | YYC3-UI-用户界面/shadcn-ui<br>YYC3-UI-用户界面/shadcn-ui.tnasdownload |
| 6 | **platform.html5.org** | WebSpec-Web标准 | 2 | 71 | 60.5 MB | 60.5 MB | YYC3-WebSpec-Web标准/platform.html5.org | YYC3-WebSpec-Web标准/platform.html5.org<br>YYC3-B/platform.html5.org |
| 7 | **LaTeX-Workshop** | Editor-编辑器扩展 | 2 | 5,187 | 51.8 MB | 51.8 MB | YYC3-C/LaTeX-Workshop | YYC3-C/LaTeX-Workshop<br>YYC3-J/LaTeX-Workshop |
| 8 | **fish-shell** | Shell-终端 | 3 | 2,144 | 25.5 MB | 51.0 MB | YYC3-Shell-终端/fish-shell | YYC3-Shell-终端/fish-shell<br>YYC3-C/fish-shell<br>YYC3-J/fish-shell |
| 9 | **spotube** | Desktop-桌面应用 | 2 | 985 | 44.7 MB | 44.7 MB | YYC3-G/spotube | YYC3-G/spotube<br>YYC3-H/spotube |
| 10 | **nanobot** | AI-模型服务 | 2 | 284 | 33.6 MB | 33.6 MB | YYC3-AI-人工智能/nanobot | YYC3-AI-人工智能/nanobot<br>YYC3-J/nanobot |
| 11 | **lua-language-server** | LSP-语言服务 | 2 | 513 | 30.1 MB | 30.1 MB | YYC3-C/lua-language-server | YYC3-C/lua-language-server<br>YYC3-J/lua-language-server |
| 12 | **code-skills** | Skills-技能包 | 2 | 2,637 | 25.2 MB | 25.2 MB | YYC3-F/code-skills | YYC3-F/code-skills<br>YYC3-J/code-skills |
| 13 | **ai_completion** | AI-应用工具 | 2 | 4 | 19.9 MB | 19.9 MB | YYC3-AI-人工智能/ai_completion | YYC3-AI-人工智能/ai_completion<br>YYC3-F/ai_completion |
| 14 | **tools** | Tool-开发工具链 | 2 | 2,812 | 18.8 MB | 18.8 MB | YYC3-C/tools | YYC3-C/tools<br>YYC3-J/tools |
| 15 | **cuFOLIO** | Finance-金融量化 | 2 | 81 | 16.5 MB | 16.5 MB | YYC3-Finance-金融量化/cuFOLIO | YYC3-Finance-金融量化/cuFOLIO<br>YYC3-F/cuFOLIO |
| 16 | **Raphael-Publish** | Tool-开发工具链 | 2 | 48 | 16.3 MB | 16.3 MB | YYC3-Tool-开发工具/Raphael-Publish | YYC3-Tool-开发工具/Raphael-Publish<br>YYC3-J/Raphael-Publish |
| 17 | **last30days-skill** | Skills-技能包 | 2 | 179 | 15.3 MB | 15.3 MB | YYC3-Skills-技能包/last30days-skill | YYC3-Skills-技能包/last30days-skill<br>YYC3-J/last30days-skill |
| 18 | **claude-howto** | AI-应用工具 | 2 | 660 | 14.6 MB | 14.6 MB | YYC3-AI-人工智能/claude-howto | YYC3-AI-人工智能/claude-howto<br>YYC3-F/claude-howto |
| 19 | **logohero-carouse** | Design-设计资源 | 2 | 8 | 12.8 MB | 12.8 MB | YYC3-Design-设计资源/logohero-carouse | YYC3-Design-设计资源/logohero-carouse<br>YYC3-F/logohero-carouse |
| 20 | **all-skills** | Skills-技能包 | 2 | 394 | 9.2 MB | 9.2 MB | YYC3-Skills-技能包/all-skills | YYC3-Skills-技能包/all-skills<br>YYC3-J/all-skills |
| 21 | **go-syntax** | Syntax-语法高亮 | 2 | 20 | 8.8 MB | 8.8 MB | YYC3-C/go-syntax | YYC3-C/go-syntax<br>YYC3-J/go-syntax |
| 22 | **TypeScript-TmLanguage** | Syntax-语法高亮 | 2 | 959 | 7.5 MB | 7.5 MB | YYC3-D/TypeScript-TmLanguage | YYC3-D/TypeScript-TmLanguage<br>YYC3-J/TypeScript-TmLanguage |
| 23 | **streams** | WebSpec-Web标准 | 2 | 115 | 7.1 MB | 7.1 MB | YYC3-WebSpec-Web标准/streams | YYC3-WebSpec-Web标准/streams<br>YYC3-B/streams |
| 24 | **dom** | WebSpec-Web标准 | 2 | 30 | 6.9 MB | 6.9 MB | YYC3-WebSpec-Web标准/dom | YYC3-WebSpec-Web标准/dom<br>YYC3-B/dom |
| 25 | **lucide** | Design-设计资源 | 2 | 4,202 | 6.0 MB | 6.0 MB | YYC3-C/lucide | YYC3-C/lucide<br>YYC3-J/lucide |
| 26 | **fetch** | WebSpec-Web标准 | 2 | 30 | 5.7 MB | 5.7 MB | YYC3-WebSpec-Web标准/fetch | YYC3-WebSpec-Web标准/fetch<br>YYC3-B/fetch |
| 27 | **claude-prompts-mcp** | AI-应用工具 | 2 | 485 | 5.3 MB | 5.3 MB | YYC3-F/claude-prompts-mcp | YYC3-F/claude-prompts-mcp<br>YYC3-H/claude-prompts-mcp |
| 28 | **encoding** | WebSpec-Web标准 | 2 | 69 | 4.9 MB | 4.9 MB | YYC3-WebSpec-Web标准/encoding | YYC3-WebSpec-Web标准/encoding<br>YYC3-B/encoding |
| 29 | **git-commit-message-plus** | Tool-开发工具链 | 2 | 44 | 3.5 MB | 3.5 MB | YYC3-Tool-开发工具/git-commit-message-plus | YYC3-Tool-开发工具/git-commit-message-plus<br>YYC3-B/git-commit-message-plus |
| 30 | **latex.tmbundle** | Syntax-语法高亮 | 2 | 269 | 3.5 MB | 3.5 MB | YYC3-C/latex.tmbundle | YYC3-C/latex.tmbundle<br>YYC3-J/latex.tmbundle |
| 31 | **claude-plugins-official** | AI-应用工具 | 2 | 326 | 3.4 MB | 3.4 MB | YYC3-AI-人工智能/claude-plugins-official | YYC3-AI-人工智能/claude-plugins-official<br>YYC3-E/claude-plugins-official |
| 32 | **CowAgent** | Agent-智能体 | 2 | 488 | 3.3 MB | 3.3 MB | YYC3-Agent-智能体/CowAgent | YYC3-Agent-智能体/CowAgent<br>YYC3-F/CowAgent |
| 33 | **AI** | AI-应用工具 | 2 | 270 | 3.1 MB | 3.1 MB | YYC3-AI-人工智能/AI | YYC3-AI-人工智能/AI<br>YYC3-H/AI |
| 34 | **js-beautify** | Tool-开发工具链 | 2 | 190 | 2.7 MB | 2.7 MB | YYC3-C/js-beautify | YYC3-C/js-beautify<br>YYC3-J/js-beautify |
| 35 | **marketingskills** | Skills-技能包 | 2 | 364 | 2.6 MB | 2.6 MB | YYC3-Skills-技能包/marketingskills | YYC3-Skills-技能包/marketingskills<br>YYC3-F/marketingskills |
| 36 | **one-api** | AI-模型服务 | 2 | 563 | 2.5 MB | 2.5 MB | YYC3-AI-人工智能/one-api | YYC3-AI-人工智能/one-api<br>YYC3-I/one-api |
| 37 | **wattsi** | WebSpec-Web标准 | 2 | 70 | 2.4 MB | 2.4 MB | YYC3-WebSpec-Web标准/wattsi | YYC3-WebSpec-Web标准/wattsi<br>YYC3-B/wattsi |
| 38 | **MagicPython** | Syntax-语法高亮 | 2 | 336 | 2.4 MB | 2.4 MB | YYC3-C/MagicPython | YYC3-C/MagicPython<br>YYC3-J/MagicPython |
| 39 | **url** | WebSpec-Web标准 | 2 | 31 | 2.3 MB | 2.3 MB | YYC3-WebSpec-Web标准/url | YYC3-WebSpec-Web标准/url<br>YYC3-B/url |
| 40 | **awesome-design-md** | Design-设计资源 | 2 | 151 | 2.0 MB | 2.0 MB | YYC3-Design-设计资源/awesome-design-md | YYC3-Design-设计资源/awesome-design-md<br>YYC3-F/awesome-design-md |
| 41 | **ensurepip** | Runtime-标准库 | 2 | 4 | 1.7 MB | 1.7 MB | YYC3-Python-Python标准库/ensurepip | YYC3-Python-Python标准库/ensurepip<br>YYC3-N/ensurepip |
| 42 | **cuda-cpp-grammar** | Syntax-语法高亮 | 3 | 3 | 0.8 MB | 1.5 MB | YYC3-Syntax-语法定义/cuda-cpp-grammar | YYC3-Syntax-语法定义/cuda-cpp-grammar<br>YYC3-C/cuda-cpp-grammar<br>YYC3-J/cuda-cpp-grammar |
| 43 | **figures** | Design-设计资源 | 2 | 36 | 1.5 MB | 1.5 MB | YYC3-Icon-图标资源/figures | YYC3-Icon-图标资源/figures<br>YYC3-B/figures |
| 44 | **encodings** | Runtime-标准库 | 2 | 122 | 1.4 MB | 1.4 MB | YYC3-Python-Python标准库/encodings | YYC3-Python-Python标准库/encodings<br>YYC3-N/encodings |
| 45 | **emmet** | Tool-开发工具链 | 3 | 106 | 0.7 MB | 1.3 MB | YYC3-Tool-开发工具/emmet | YYC3-Tool-开发工具/emmet<br>YYC3-C/emmet<br>YYC3-J/emmet |
| 46 | **infra** | WebSpec-Web标准 | 2 | 28 | 1.3 MB | 1.3 MB | YYC3-WebSpec-Web标准/infra | YYC3-WebSpec-Web标准/infra<br>YYC3-B/infra |
| 47 | **marked** | Tool-开发工具链 | 2 | 419 | 1.2 MB | 1.2 MB | YYC3-Tool-开发工具/marked | YYC3-Tool-开发工具/marked<br>YYC3-C/marked |
| 48 | **quantitative-signal-discovery-agent** | Finance-金融量化 | 2 | 30 | 1.2 MB | 1.2 MB | YYC3-Finance-金融量化/quantitative-signal-discovery-agent | YYC3-Finance-金融量化/quantitative-signal-discovery-agent<br>YYC3-F/quantitative-signal-discovery-agent |
| 49 | **language-php** | Syntax-语法高亮 | 3 | 18 | 0.6 MB | 1.2 MB | YYC3-Syntax-语法定义/language-php | YYC3-Syntax-语法定义/language-php<br>YYC3-C/language-php<br>YYC3-J/language-php |
| 50 | **b2b-sdr-agent-template** | Business-商业应用 | 2 | 82 | 1.1 MB | 1.1 MB | YYC3-Business-商业/b2b-sdr-agent-template | YYC3-Business-商业/b2b-sdr-agent-template<br>YYC3-H/b2b-sdr-agent-template |
| 51 | **mimesniff** | WebSpec-Web标准 | 2 | 25 | 0.9 MB | 0.9 MB | YYC3-WebSpec-Web标准/mimesniff | YYC3-WebSpec-Web标准/mimesniff<br>YYC3-B/mimesniff |
| 52 | **xhr** | WebSpec-Web标准 | 2 | 25 | 0.9 MB | 0.9 MB | YYC3-WebSpec-Web标准/xhr | YYC3-WebSpec-Web标准/xhr<br>YYC3-B/xhr |
| 53 | **chatAgentTools** | Agent-智能体 | 2 | 76 | 0.8 MB | 0.8 MB | YYC3-Agent-智能体/chatAgentTools | YYC3-Agent-智能体/chatAgentTools<br>YYC3-H/chatAgentTools |
| 54 | **superpowers** | Tool-开发工具链 | 2 | 143 | 0.7 MB | 0.7 MB | YYC3-Tool-开发工具/superpowers | YYC3-Tool-开发工具/superpowers<br>YYC3-J/superpowers |
| 55 | **atom-language-julia** | Syntax-语法高亮 | 3 | 20 | 0.3 MB | 0.7 MB | YYC3-Syntax-语法定义/atom-language-julia | YYC3-Syntax-语法定义/atom-language-julia<br>YYC3-C/atom-language-julia<br>YYC3-J/atom-language-julia |
| 56 | **pskoett-ai-skills** | Skills-技能包 | 2 | 116 | 0.7 MB | 0.7 MB | YYC3-Skills-技能包/pskoett-ai-skills | YYC3-Skills-技能包/pskoett-ai-skills<br>YYC3-F/pskoett-ai-skills |
| 57 | **urlpattern** | WebSpec-Web标准 | 2 | 24 | 0.6 MB | 0.6 MB | YYC3-WebSpec-Web标准/urlpattern | YYC3-WebSpec-Web标准/urlpattern<br>YYC3-B/urlpattern |
| 58 | **GLM-skills** | Skills-技能包 | 2 | 63 | 0.6 MB | 0.6 MB | YYC3-Skills-技能包/GLM-skills | YYC3-Skills-技能包/GLM-skills<br>YYC3-H/GLM-skills |
| 59 | **Button** | UI-界面组件 | 2 | 103 | 0.6 MB | 0.6 MB | YYC3-UI-用户界面/Button | YYC3-UI-用户界面/Button<br>YYC3-D/Button |
| 60 | **console** | WebSpec-Web标准 | 2 | 36 | 0.5 MB | 0.5 MB | YYC3-WebSpec-Web标准/console | YYC3-WebSpec-Web标准/console<br>YYC3-B/console |
| 61 | **notifications** | WebSpec-Web标准 | 2 | 24 | 0.5 MB | 0.5 MB | YYC3-WebSpec-Web标准/notifications | YYC3-WebSpec-Web标准/notifications<br>YYC3-B/notifications |
| 62 | **plugin-dev** | Plugin-插件协议 | 2 | 61 | 0.5 MB | 0.5 MB | YYC3-MCP-MCP协议/plugin-dev | YYC3-MCP-MCP协议/plugin-dev<br>YYC3-B/plugin-dev |
| 63 | **security-scan** | Security-安全合规 | 2 | 53 | 0.5 MB | 0.5 MB | YYC3-Security-安全/security-scan | YYC3-Security-安全/security-scan<br>YYC3-B/security-scan |
| 64 | **pydoc_data** | Runtime-标准库 | 2 | 3 | 0.5 MB | 0.5 MB | YYC3-Python-Python标准库/pydoc_data | YYC3-Python-Python标准库/pydoc_data<br>YYC3-N/pydoc_data |
| 65 | **csharp-language-server** | LSP-语言服务 | 2 | 135 | 0.5 MB | 0.5 MB | YYC3-C/csharp-language-server | YYC3-C/csharp-language-server<br>YYC3-J/csharp-language-server |
| 66 | **fs** | WebSpec-Web标准 | 2 | 23 | 0.5 MB | 0.5 MB | YYC3-WebSpec-Web标准/fs | YYC3-WebSpec-Web标准/fs<br>YYC3-B/fs |
| 67 | **asyncio** | Runtime-标准库 | 2 | 33 | 0.5 MB | 0.5 MB | YYC3-Python-Python标准库/asyncio | YYC3-Python-Python标准库/asyncio<br>YYC3-N/asyncio |
| 68 | **git-tmbundle** | Syntax-语法高亮 | 2 | 172 | 0.5 MB | 0.5 MB | YYC3-C/git-tmbundle | YYC3-C/git-tmbundle<br>YYC3-J/git-tmbundle |
| 69 | **participate.whatwg.org** | WebSpec-Web标准 | 2 | 65 | 0.4 MB | 0.4 MB | YYC3-WebSpec-Web标准/participate.whatwg.org | YYC3-WebSpec-Web标准/participate.whatwg.org<br>YYC3-B/participate.whatwg.org |
| 70 | **background-sync** | WebSpec-Web标准 | 2 | 16 | 0.4 MB | 0.4 MB | YYC3-WebSpec-Web标准/background-sync | YYC3-WebSpec-Web标准/background-sync<br>YYC3-B/background-sync |
| 71 | **compat** | WebSpec-Web标准 | 2 | 40 | 0.4 MB | 0.4 MB | YYC3-WebSpec-Web标准/compat | YYC3-WebSpec-Web标准/compat<br>YYC3-B/compat |
| 72 | **agent** | Agent-智能体 | 2 | 45 | 0.4 MB | 0.4 MB | YYC3-Agent-智能体/agent | YYC3-Agent-智能体/agent<br>YYC3-H/agent |
| 73 | **EditorSyntax** | Editor-编辑器扩展 | 3 | 24 | 0.2 MB | 0.4 MB | YYC3-Syntax-语法定义/EditorSyntax | YYC3-Syntax-语法定义/EditorSyntax<br>YYC3-C/EditorSyntax<br>YYC3-J/EditorSyntax |
| 74 | **email** | Runtime-标准库 | 2 | 30 | 0.4 MB | 0.4 MB | YYC3-Python-Python标准库/email | YYC3-Python-Python标准库/email<br>YYC3-N/email |
| 75 | **fullscreen** | WebSpec-Web标准 | 2 | 26 | 0.4 MB | 0.4 MB | YYC3-WebSpec-Web标准/fullscreen | YYC3-WebSpec-Web标准/fullscreen<br>YYC3-B/fullscreen |
| 76 | **cloudbase** | Cloud-云原生 | 2 | 44 | 0.4 MB | 0.4 MB | YYC3-Cloud-云原生/cloudbase | YYC3-Cloud-云原生/cloudbase<br>YYC3-B/cloudbase |
| 77 | **YYC3-SKILL** | Skills-技能包 | 3 | 13 | 0.2 MB | 0.3 MB | YYC3-Skills-技能包/YYC3-SKILL | YYC3-Skills-技能包/YYC3-SKILL<br>YYC3-G/YYC3-SKILL<br>YYC3-H/YYC3-SKILL |
| 78 | **mcp** | Plugin-插件协议 | 2 | 23 | 0.3 MB | 0.3 MB | YYC3-MCP-MCP协议/mcp | YYC3-MCP-MCP协议/mcp<br>YYC3-H/mcp |
| 79 | **test** | Runtime-标准库 | 2 | 31 | 0.3 MB | 0.3 MB | YYC3-Python-Python标准库/test | YYC3-Python-Python标准库/test<br>YYC3-N/test |
| 80 | **Clone-Wars** | Design-设计资源 | 2 | 6 | 0.3 MB | 0.3 MB | YYC3-Design-设计资源/Clone-Wars | YYC3-Design-设计资源/Clone-Wars<br>YYC3-F/Clone-Wars |
| 81 | **xml** | Runtime-标准库 | 2 | 22 | 0.3 MB | 0.3 MB | YYC3-Python-Python标准库/xml | YYC3-Python-Python标准库/xml<br>YYC3-N/xml |
| 82 | **tkinter** | Runtime-标准库 | 2 | 13 | 0.3 MB | 0.3 MB | YYC3-Python-Python标准库/tkinter | YYC3-Python-Python标准库/tkinter<br>YYC3-N/tkinter |
| 83 | **language-sass** | Syntax-语法高亮 | 2 | 20 | 0.3 MB | 0.3 MB | YYC3-Syntax-语法定义/language-sass | YYC3-Syntax-语法定义/language-sass<br>YYC3-A/language-sass |
| 84 | **storage** | WebSpec-Web标准 | 2 | 28 | 0.3 MB | 0.3 MB | YYC3-WebSpec-Web标准/storage | YYC3-WebSpec-Web标准/storage<br>YYC3-B/storage |
| 85 | **multiprocessing** | Runtime-标准库 | 2 | 23 | 0.3 MB | 0.3 MB | YYC3-Python-Python标准库/multiprocessing | YYC3-Python-Python标准库/multiprocessing<br>YYC3-N/multiprocessing |
| 86 | **node-semver** | Tool-开发工具链 | 2 | 151 | 0.3 MB | 0.3 MB | YYC3-Tool-开发工具/node-semver | YYC3-Tool-开发工具/node-semver<br>YYC3-D/node-semver |
| 87 | **version** | Tool-开发工具链 | 2 | 151 | 0.3 MB | 0.3 MB | YYC3-Tool-开发工具/version | YYC3-Tool-开发工具/version<br>YYC3-E/version |
| 88 | **unittest** | Runtime-标准库 | 2 | 13 | 0.2 MB | 0.2 MB | YYC3-Python-Python标准库/unittest | YYC3-Python-Python标准库/unittest<br>YYC3-N/unittest |
| 89 | **GenerativeAIExamples** | AI-模型服务 | 2 | 60 | 0.2 MB | 0.2 MB | YYC3-G/GenerativeAIExamples | YYC3-G/GenerativeAIExamples<br>YYC3-H/GenerativeAIExamples |
| 90 | **books** | Doc-文档知识 | 2 | 3 | 0.2 MB | 0.2 MB | YYC3-Doc-文档资源/books | YYC3-Doc-文档资源/books<br>YYC3-B/books |
| 91 | **participant-data** | Doc-文档知识 | 2 | 4 | 0.2 MB | 0.2 MB | YYC3-Tool-开发工具/participant-data | YYC3-Tool-开发工具/participant-data<br>YYC3-B/participant-data |
| 92 | **importlib** | Runtime-标准库 | 2 | 25 | 0.2 MB | 0.2 MB | YYC3-Python-Python标准库/importlib | YYC3-Python-Python标准库/importlib<br>YYC3-N/importlib |
| 93 | **http** | Runtime-标准库 | 2 | 5 | 0.2 MB | 0.2 MB | YYC3-Python-Python标准库/http | YYC3-Python-Python标准库/http<br>YYC3-N/http |
| 94 | **language-coffee-script** | Syntax-语法高亮 | 2 | 17 | 0.2 MB | 0.2 MB | YYC3-Syntax-语法定义/language-coffee-script | YYC3-Syntax-语法定义/language-coffee-script<br>YYC3-A/language-coffee-script |
| 95 | **ionide-fsgrammar** | Syntax-语法高亮 | 2 | 31 | 0.2 MB | 0.2 MB | YYC3-C/ionide-fsgrammar | YYC3-C/ionide-fsgrammar<br>YYC3-J/ionide-fsgrammar |
| 96 | **logging** | Runtime-标准库 | 2 | 3 | 0.2 MB | 0.2 MB | YYC3-Python-Python标准库/logging | YYC3-Python-Python标准库/logging<br>YYC3-N/logging |
| 97 | **hot-skills** | Skills-技能包 | 2 | 72 | 0.2 MB | 0.2 MB | YYC3-Skills-技能包/hot-skills | YYC3-Skills-技能包/hot-skills<br>YYC3-B/hot-skills |
| 98 | **language-ruby** | Syntax-语法高亮 | 2 | 23 | 0.2 MB | 0.2 MB | YYC3-Syntax-语法定义/language-ruby | YYC3-Syntax-语法定义/language-ruby<br>YYC3-D/language-ruby |
| 99 | **cookiestore** | WebSpec-Web标准 | 2 | 17 | 0.2 MB | 0.2 MB | YYC3-WebSpec-Web标准/cookiestore | YYC3-WebSpec-Web标准/cookiestore<br>YYC3-B/cookiestore |
| 100 | **websockets** | WebSpec-Web标准 | 2 | 17 | 0.2 MB | 0.2 MB | YYC3-WebSpec-Web标准/websockets | YYC3-WebSpec-Web标准/websockets<br>YYC3-B/websockets |
| 101 | **_pyrepl** | Runtime-标准库 | 2 | 26 | 0.2 MB | 0.2 MB | YYC3-Python-Python标准库/_pyrepl | YYC3-Python-Python标准库/_pyrepl<br>YYC3-N/_pyrepl |
| 102 | **lexiang-knowledge-plugins** | Plugin-插件协议 | 2 | 25 | 0.2 MB | 0.2 MB | YYC3-Plugin-插件体系/lexiang-knowledge-plugins | YYC3-Plugin-插件体系/lexiang-knowledge-plugins<br>YYC3-B/lexiang-knowledge-plugins |
| 103 | **css.tmbundle** | Syntax-语法高亮 | 2 | 119 | 0.2 MB | 0.2 MB | YYC3-C/css.tmbundle | YYC3-C/css.tmbundle<br>YYC3-J/css.tmbundle |
| 104 | **sg** | Doc-文档知识 | 2 | 22 | 0.2 MB | 0.2 MB | YYC3-Doc-文档资源/sg | YYC3-Doc-文档资源/sg<br>YYC3-B/sg |
| 105 | **The-Deconstructors** | Business-商业应用 | 2 | 16 | 0.2 MB | 0.2 MB | YYC3-Business-商业/The-Deconstructors | YYC3-Business-商业/The-Deconstructors<br>YYC3-H/The-Deconstructors |
| 106 | **plugin-finder** | Plugin-插件协议 | 2 | 21 | 0.2 MB | 0.2 MB | YYC3-Plugin-插件体系/plugin-finder | YYC3-Plugin-插件体系/plugin-finder<br>YYC3-B/plugin-finder |
| 107 | **urllib** | Runtime-标准库 | 2 | 6 | 0.2 MB | 0.2 MB | YYC3-Python-Python标准库/urllib | YYC3-Python-Python标准库/urllib<br>YYC3-N/urllib |
| 108 | **quirks** | WebSpec-Web标准 | 2 | 19 | 0.2 MB | 0.2 MB | YYC3-WebSpec-Web标准/quirks | YYC3-WebSpec-Web标准/quirks<br>YYC3-B/quirks |
| 109 | **zipfile** | Runtime-标准库 | 2 | 4 | 0.1 MB | 0.1 MB | YYC3-Python-Python标准库/zipfile | YYC3-Python-Python标准库/zipfile<br>YYC3-N/zipfile |
| 110 | **build_tools** | Tool-开发工具链 | 2 | 25 | 0.1 MB | 0.1 MB | YYC3-Tool-开发工具/build_tools | YYC3-Tool-开发工具/build_tools<br>YYC3-H/build_tools |
| 111 | **archived-components** | UI-界面组件 | 2 | 9 | 0.1 MB | 0.1 MB | YYC3-UI-用户界面/archived-components | YYC3-UI-用户界面/archived-components<br>YYC3-H/archived-components |
| 112 | **html** | WebSpec-Web标准 | 2 | 3 | 0.1 MB | 0.1 MB | YYC3-Python-Python标准库/html | YYC3-Python-Python标准库/html<br>YYC3-N/html |
| 113 | **re** | Runtime-标准库 | 2 | 5 | 0.1 MB | 0.1 MB | YYC3-Python-Python标准库/re | YYC3-Python-Python标准库/re<br>YYC3-N/re |
| 114 | **build.whatwg.org** | WebSpec-Web标准 | 2 | 12 | 0.1 MB | 0.1 MB | YYC3-WebSpec-Web标准/build.whatwg.org | YYC3-WebSpec-Web标准/build.whatwg.org<br>YYC3-B/build.whatwg.org |
| 115 | **expand-abbreviation** | Tool-开发工具链 | 3 | 18 | 0.0 MB | 0.1 MB | YYC3-Syntax-语法定义/expand-abbreviation | YYC3-Syntax-语法定义/expand-abbreviation<br>YYC3-C/expand-abbreviation<br>YYC3-J/expand-abbreviation |
| 116 | **agent-team-agile-workflow** | Agent-智能体 | 2 | 9 | 0.1 MB | 0.1 MB | YYC3-Agent-智能体/agent-team-agile-workflow | YYC3-Agent-智能体/agent-team-agile-workflow<br>YYC3-B/agent-team-agile-workflow |
| 117 | **json-server** | Tool-开发工具链 | 2 | 33 | 0.1 MB | 0.1 MB | YYC3-Tool-开发工具/json-server | YYC3-Tool-开发工具/json-server<br>YYC3-F/json-server |
| 118 | **B2B-SKills** | Skills-技能包 | 2 | 18 | 0.1 MB | 0.1 MB | YYC3-Skills-技能包/B2B-SKills | YYC3-Skills-技能包/B2B-SKills<br>YYC3-H/B2B-SKills |
| 119 | **xmlrpc** | Runtime-标准库 | 2 | 3 | 0.1 MB | 0.1 MB | YYC3-Python-Python标准库/xmlrpc | YYC3-Python-Python标准库/xmlrpc<br>YYC3-N/xmlrpc |
| 120 | **loader** | WebSpec-Web标准 | 2 | 10 | 0.1 MB | 0.1 MB | YYC3-WebSpec-Web标准/loader | YYC3-WebSpec-Web标准/loader<br>YYC3-B/loader |
| 121 | **language-batchfile** | Syntax-语法高亮 | 3 | 26 | 0.0 MB | 0.1 MB | YYC3-Syntax-语法定义/language-batchfile | YYC3-Syntax-语法定义/language-batchfile<br>YYC3-C/language-batchfile<br>YYC3-J/language-batchfile |
| 122 | **compression** | WebSpec-Web标准 | 2 | 18 | 0.1 MB | 0.1 MB | YYC3-WebSpec-Web标准/compression | YYC3-WebSpec-Web标准/compression<br>YYC3-B/compression |
| 123 | **hookify** | Plugin-插件协议 | 2 | 24 | 0.1 MB | 0.1 MB | YYC3-Skills-技能包/hookify | YYC3-Skills-技能包/hookify<br>YYC3-B/hookify |
| 124 | **Accumulo 3.0.0** | Data-数据存储 | 2 | 3 | 0.1 MB | 0.1 MB | YYC3-Data-数据存储/Accumulo 3.0.0 | YYC3-Data-数据存储/Accumulo 3.0.0<br>YYC3-A/Accumulo 3.0.0 |
| 125 | **asp.vb.net.tmbundle** | Syntax-语法高亮 | 2 | 38 | 0.1 MB | 0.1 MB | YYC3-B/asp.vb.net.tmbundle | YYC3-B/asp.vb.net.tmbundle<br>YYC3-D/asp.vb.net.tmbundle |
| 126 | **concurrent** | Runtime-标准库 | 2 | 5 | 0.1 MB | 0.1 MB | YYC3-Python-Python标准库/concurrent | YYC3-Python-Python标准库/concurrent<br>YYC3-N/concurrent |
| 127 | **pathlib** | Runtime-标准库 | 2 | 3 | 0.1 MB | 0.1 MB | YYC3-Python-Python标准库/pathlib | YYC3-Python-Python标准库/pathlib<br>YYC3-N/pathlib |
| 128 | **turtledemo** | Runtime-标准库 | 2 | 22 | 0.1 MB | 0.1 MB | YYC3-Python-Python标准库/turtledemo | YYC3-Python-Python标准库/turtledemo<br>YYC3-N/turtledemo |
| 129 | **meta** | Plugin-插件协议 | 2 | 12 | 0.1 MB | 0.1 MB | YYC3-Spec-规范工具/meta | YYC3-Spec-规范工具/meta<br>YYC3-B/meta |
| 130 | **algorithmic-art** | Design-设计资源 | 2 | 5 | 0.1 MB | 0.1 MB | YYC3-Design-设计资源/algorithmic-art | YYC3-Design-设计资源/algorithmic-art<br>YYC3-B/algorithmic-art |
| 131 | **self-improving-agent** | Agent-智能体 | 2 | 15 | 0.1 MB | 0.1 MB | YYC3-Agent-智能体/self-improving-agent | YYC3-Agent-智能体/self-improving-agent<br>YYC3-F/self-improving-agent |
| 132 | **web-ui** | UI-界面组件 | 2 | 55 | 0.1 MB | 0.1 MB | YYC3-UI-用户界面/web-ui | YYC3-UI-用户界面/web-ui<br>YYC3-D/web-ui |
| 133 | **pr-review-toolkit** | Tool-开发工具链 | 2 | 10 | 0.1 MB | 0.1 MB | YYC3-Tool-开发工具/pr-review-toolkit | YYC3-Tool-开发工具/pr-review-toolkit<br>YYC3-B/pr-review-toolkit |
| 134 | **collections** | Runtime-标准库 | 2 | 1 | 0.1 MB | 0.1 MB | YYC3-Python-Python标准库/collections | YYC3-Python-Python标准库/collections<br>YYC3-N/collections |
| 135 | **json** | Runtime-标准库 | 2 | 5 | 0.0 MB | 0.0 MB | YYC3-Python-Python标准库/json | YYC3-Python-Python标准库/json<br>YYC3-N/json |
| 136 | **development-essentials** | Tool-开发工具链 | 2 | 18 | 0.0 MB | 0.0 MB | YYC3-Tool-开发工具/development-essentials | YYC3-Tool-开发工具/development-essentials<br>YYC3-B/development-essentials |
| 137 | **ppt-writer** | Tool-开发工具链 | 2 | 6 | 0.0 MB | 0.0 MB | YYC3-Tool-开发工具/ppt-writer | YYC3-Tool-开发工具/ppt-writer<br>YYC3-B/ppt-writer |
| 138 | **spec-factory** | Tool-开发工具链 | 2 | 19 | 0.0 MB | 0.0 MB | YYC3-Spec-规范工具/spec-factory | YYC3-Spec-规范工具/spec-factory<br>YYC3-B/spec-factory |
| 139 | **skills-registry** | Skills-技能包 | 2 | 8 | 0.0 MB | 0.0 MB | YYC3-Skills-技能包/skills-registry | YYC3-Skills-技能包/skills-registry<br>YYC3-B/skills-registry |
| 140 | **language-clojure** | Syntax-语法高亮 | 2 | 14 | 0.0 MB | 0.0 MB | YYC3-Syntax-语法定义/language-clojure | YYC3-Syntax-语法定义/language-clojure<br>YYC3-A/language-clojure |
| 141 | **zoneinfo** | Runtime-标准库 | 2 | 4 | 0.0 MB | 0.0 MB | YYC3-Python-Python标准库/zoneinfo | YYC3-Python-Python标准库/zoneinfo<br>YYC3-N/zoneinfo |
| 142 | **mcp-server** | Plugin-插件协议 | 2 | 8 | 0.0 MB | 0.0 MB | YYC3-MCP-MCP协议/mcp-server | YYC3-MCP-MCP协议/mcp-server<br>YYC3-B/mcp-server |
| 143 | **sysconfig** | Runtime-标准库 | 2 | 2 | 0.0 MB | 0.0 MB | YYC3-Python-Python标准库/sysconfig | YYC3-Python-Python标准库/sysconfig<br>YYC3-N/sysconfig |
| 144 | **feature-dev** | Tool-开发工具链 | 2 | 7 | 0.0 MB | 0.0 MB | YYC3-Tool-开发工具/feature-dev | YYC3-Tool-开发工具/feature-dev<br>YYC3-B/feature-dev |
| 145 | **cn-optimizer** | Tool-开发工具链 | 2 | 9 | 0.0 MB | 0.0 MB | YYC3-Tool-开发工具/cn-optimizer | YYC3-Tool-开发工具/cn-optimizer<br>YYC3-B/cn-optimizer |
| 146 | **make.tmbundle** | Syntax-语法高亮 | 2 | 11 | 0.0 MB | 0.0 MB | YYC3-C/make.tmbundle | YYC3-C/make.tmbundle<br>YYC3-J/make.tmbundle |
| 147 | **web-history** | Doc-文档知识 | 2 | 2 | 0.0 MB | 0.0 MB | YYC3-Tool-开发工具/web-history | YYC3-Tool-开发工具/web-history<br>YYC3-A/web-history |
| 148 | **testutils** | WebSpec-Web标准 | 2 | 16 | 0.0 MB | 0.0 MB | YYC3-WebSpec-Web标准/testutils | YYC3-WebSpec-Web标准/testutils<br>YYC3-B/testutils |
| 149 | **ralph-loop** | Tool-开发工具链 | 2 | 9 | 0.0 MB | 0.0 MB | YYC3-Tool-开发工具/ralph-loop | YYC3-Tool-开发工具/ralph-loop<br>YYC3-B/ralph-loop |
| 150 | **assert** | Tool-开发工具链 | 2 | 7 | 0.0 MB | 0.0 MB | YYC3-Tool-开发工具/assert | YYC3-Tool-开发工具/assert<br>YYC3-C/assert |
| 151 | **language-xml** | Syntax-语法高亮 | 2 | 16 | 0.0 MB | 0.0 MB | YYC3-Syntax-语法定义/language-xml | YYC3-Syntax-语法定义/language-xml<br>YYC3-A/language-xml |
| 152 | **tomllib** | Runtime-标准库 | 2 | 5 | 0.0 MB | 0.0 MB | YYC3-Python-Python标准库/tomllib | YYC3-Python-Python标准库/tomllib<br>YYC3-N/tomllib |
| 153 | **dbm** | Runtime-标准库 | 2 | 5 | 0.0 MB | 0.0 MB | YYC3-Python-Python标准库/dbm | YYC3-Python-Python标准库/dbm<br>YYC3-N/dbm |
| 154 | **curses** | Runtime-标准库 | 2 | 5 | 0.0 MB | 0.0 MB | YYC3-Python-Python标准库/curses | YYC3-Python-Python标准库/curses<br>YYC3-N/curses |
| 155 | **lsp-integration** | LSP-语言服务 | 2 | 6 | 0.0 MB | 0.0 MB | YYC3-LSP-语言服务/lsp-integration | YYC3-LSP-语言服务/lsp-integration<br>YYC3-D/lsp-integration |
| 156 | **wiki.whatwg.org** | WebSpec-Web标准 | 2 | 6 | 0.0 MB | 0.0 MB | YYC3-WebSpec-Web标准/wiki.whatwg.org | YYC3-WebSpec-Web标准/wiki.whatwg.org<br>YYC3-B/wiki.whatwg.org |
| 157 | **shaders-tmLanguage** | Syntax-语法高亮 | 2 | 3 | 0.0 MB | 0.0 MB | YYC3-Syntax-语法定义/shaders-tmLanguage | YYC3-Syntax-语法定义/shaders-tmLanguage<br>YYC3-D/shaders-tmLanguage |
| 158 | **security-rules** | Security-安全合规 | 2 | 5 | 0.0 MB | 0.0 MB | YYC3-Security-安全/security-rules | YYC3-Security-安全/security-rules<br>YYC3-B/security-rules |
| 159 | **commit-commands** | Tool-开发工具链 | 2 | 6 | 0.0 MB | 0.0 MB | YYC3-Tool-开发工具/commit-commands | YYC3-Tool-开发工具/commit-commands<br>YYC3-B/commit-commands |
| 160 | **frontend-design** | Design-设计资源 | 2 | 3 | 0.0 MB | 0.0 MB | YYC3-UI-用户界面/frontend-design | YYC3-UI-用户界面/frontend-design<br>YYC3-B/frontend-design |
| 161 | **sqlite3** | Runtime-标准库 | 2 | 4 | 0.0 MB | 0.0 MB | YYC3-Python-Python标准库/sqlite3 | YYC3-Python-Python标准库/sqlite3<br>YYC3-N/sqlite3 |
| 162 | **whattweetbot-keys** | WebSpec-Web标准 | 2 | 7 | 0.0 MB | 0.0 MB | YYC3-WebSpec-Web标准/whattweetbot-keys | YYC3-WebSpec-Web标准/whattweetbot-keys<br>YYC3-B/whattweetbot-keys |
| 163 | **security-guidance** | Security-安全合规 | 2 | 3 | 0.0 MB | 0.0 MB | YYC3-Security-安全/security-guidance | YYC3-Security-安全/security-guidance<br>YYC3-B/security-guidance |
| 164 | **mcp-client** | Plugin-插件协议 | 2 | 7 | 0.0 MB | 0.0 MB | YYC3-MCP-MCP协议/mcp-client | YYC3-MCP-MCP协议/mcp-client<br>YYC3-B/mcp-client |
| 165 | **examples** | Tool-开发工具链 | 2 | 2 | 0.0 MB | 0.0 MB | YYC3-Tool-开发工具/examples | YYC3-Tool-开发工具/examples<br>YYC3-E/examples |
| 166 | **code-simplifier** | Tool-开发工具链 | 2 | 2 | 0.0 MB | 0.0 MB | YYC3-Tool-开发工具/code-simplifier | YYC3-Tool-开发工具/code-simplifier<br>YYC3-B/code-simplifier |
| 167 | **jdtls-lsp** | LSP-语言服务 | 2 | 4 | 0.0 MB | 0.0 MB | YYC3-LSP-语言服务/jdtls-lsp | YYC3-LSP-语言服务/jdtls-lsp<br>YYC3-B/jdtls-lsp |
| 168 | **swift-lsp** | LSP-语言服务 | 2 | 4 | 0.0 MB | 0.0 MB | YYC3-LSP-语言服务/swift-lsp | YYC3-LSP-语言服务/swift-lsp<br>YYC3-B/swift-lsp |
| 169 | **clangd-lsp** | LSP-语言服务 | 2 | 4 | 0.0 MB | 0.0 MB | YYC3-LSP-语言服务/clangd-lsp | YYC3-LSP-语言服务/clangd-lsp<br>YYC3-B/clangd-lsp |
| 170 | **atuin** | Shell-终端 | 2 | 4 | 0.0 MB | 0.0 MB | YYC3-Shell-终端/atuin | YYC3-Shell-终端/atuin<br>YYC3-B/atuin |
| 171 | **rust-analyzer-lsp** | LSP-语言服务 | 2 | 4 | 0.0 MB | 0.0 MB | YYC3-LSP-语言服务/rust-analyzer-lsp | YYC3-LSP-语言服务/rust-analyzer-lsp<br>YYC3-B/rust-analyzer-lsp |
| 172 | **lua-lsp** | LSP-语言服务 | 2 | 4 | 0.0 MB | 0.0 MB | YYC3-LSP-语言服务/lua-lsp | YYC3-LSP-语言服务/lua-lsp<br>YYC3-B/lua-lsp |
| 173 | **pyright-lsp** | LSP-语言服务 | 2 | 4 | 0.0 MB | 0.0 MB | YYC3-LSP-语言服务/pyright-lsp | YYC3-LSP-语言服务/pyright-lsp<br>YYC3-B/pyright-lsp |
| 174 | **csharp-lsp** | LSP-语言服务 | 2 | 4 | 0.0 MB | 0.0 MB | YYC3-LSP-语言服务/csharp-lsp | YYC3-LSP-语言服务/csharp-lsp<br>YYC3-B/csharp-lsp |
| 175 | **gopls-lsp** | LSP-语言服务 | 2 | 4 | 0.0 MB | 0.0 MB | YYC3-LSP-语言服务/gopls-lsp | YYC3-LSP-语言服务/gopls-lsp<br>YYC3-B/gopls-lsp |
| 176 | **firebase** | Cloud-云原生 | 2 | 2 | 0.0 MB | 0.0 MB | YYC3-Cloud-云原生/firebase | YYC3-Cloud-云原生/firebase<br>YYC3-B/firebase |
| 177 | **context7** | Plugin-插件协议 | 2 | 2 | 0.0 MB | 0.0 MB | YYC3-MCP-MCP协议/context7 | YYC3-MCP-MCP协议/context7<br>YYC3-B/context7 |
| 178 | **gitlab** | Cloud-云原生 | 2 | 2 | 0.0 MB | 0.0 MB | YYC3-Cloud-云原生/gitlab | YYC3-Cloud-云原生/gitlab<br>YYC3-B/gitlab |
| 179 | **__phello__** | Runtime-标准库 | 2 | 2 | 0.0 MB | 0.0 MB | YYC3-Python-Python标准库/__phello__ | YYC3-Python-Python标准库/__phello__<br>YYC3-N/__phello__ |

### 3.1 冗余 TOP 10

| 项目 | 副本 | 单份体积 | 冗余 |
| --- | --- | --- | --- |
| ClickHouse | 2 | 289.1 MB | 289.1 MB |
| html | 3 | 109.4 MB | 218.7 MB |
| shadcn-ui.tnasdownload | 3 | 68.6 MB | 137.1 MB |
| dify | 2 | 125.8 MB | 125.8 MB |
| shadcn-ui | 2 | 68.6 MB | 68.6 MB |
| platform.html5.org | 2 | 60.5 MB | 60.5 MB |
| LaTeX-Workshop | 2 | 51.8 MB | 51.8 MB |
| fish-shell | 3 | 25.5 MB | 51.0 MB |
| spotube | 2 | 44.7 MB | 44.7 MB |
| nanobot | 2 | 33.6 MB | 33.6 MB |

### 3.2 按来源桶统计

| 桶 | 重复目录数 |
| --- | --- |
| YYC3-B | 72 |
| YYC3-Python-Python标准库 | 31 |
| YYC3-N | 31 |
| YYC3-WebSpec-Web标准 | 29 |
| YYC3-J | 28 |
| YYC3-C | 23 |
| YYC3-Tool-开发工具 | 21 |
| YYC3-H | 15 |
| YYC3-F | 15 |
| YYC3-Syntax-语法定义 | 12 |
| YYC3-Skills-技能包 | 10 |
| YYC3-D | 9 |
| YYC3-LSP-语言服务 | 9 |
| YYC3-A | 8 |
| YYC3-UI-用户界面 | 6 |
| YYC3-AI-人工智能 | 6 |
| YYC3-G | 5 |
| YYC3-Agent-智能体 | 5 |
| YYC3-MCP-MCP协议 | 5 |
| YYC3-Design-设计资源 | 4 |
| YYC3-E | 3 |
| YYC3-Security-安全 | 3 |
| YYC3-Cloud-云原生 | 3 |
| YYC3-I | 2 |
| YYC3-Shell-终端 | 2 |
| YYC3-Finance-金融量化 | 2 |
| YYC3-Business-商业 | 2 |
| YYC3-Doc-文档资源 | 2 |
| YYC3-Plugin-插件体系 | 2 |
| YYC3-Spec-规范工具 | 2 |
| YYC3-Icon-图标资源 | 1 |
| YYC3-Data-数据存储 | 1 |

---

## 四、第二批：同名近似项（版本漂移，需裁决）

以下 136 组目录同名但内容不同，**不属于"重复"**，应按版本演进治理：
`+N/-N` = 相对参考副本新增/缺失文件数，`ΔN` = 同路径但尺寸不同的文件数。

| 项目 | 副本 | 参考副本 | 差异性质 | 其余副本差异 |
| --- | --- | --- | --- | --- |
| types | 2 | YYC3-TypeDef-类型定义/types | 微量差异（元数据/配置） | YYC3-E/types（+0/-2/Δ0） |
| DefinitelyTyped | 2 | YYC3-TypeDef-类型定义/DefinitelyTyped | 中度差异（少量源码） | YYC3-A/DefinitelyTyped（+0/-17/Δ0） |
| ClickHouse | 3 | YYC3-Data-数据存储/ClickHouse | 中度差异（少量源码） | YYC3-G/ClickHouse（+0/-27/Δ3）; YYC3-H/ClickHouse（+0/-27/Δ3） |
| kubernetes | 2 | YYC3-H/kubernetes | 结构性差异（不同版本/分支） | YYC3-Cloud-云原生/kubernetes（+0/-2822/Δ0） |
| vscode | 2 | YYC3-D/vscode | 结构性差异（不同版本/分支） | YYC3-C/vscode（+37/-171/Δ359） |
| icu | 2 | YYC3-Data-数据存储/icu | 中度差异（少量源码） | YYC3-D/icu（+0/-16/Δ0） |
| i18n | 2 | YYC3-WebSpec-Web标准/i18n | 微量差异（元数据/配置） | YYC3-E/i18n（+0/-2/Δ0） |
| razor | 2 | YYC3-B/razor | 中度差异（少量源码） | YYC3-Framework-框架/razor（+4/-3/Δ2） |
| antigravity-awesome-skills | 2 | YYC3-Skills-技能包/antigravity-awesome-skills | 中度差异（少量源码） | YYC3-J/antigravity-awesome-skills（+0/-11/Δ12） |
| open-design | 4 | YYC3-H/open-design | 结构性差异（不同版本/分支） | YYC3-Design-设计资源/open-design（+166/-3546/Δ728）; YYC3-E/open-design（+166/-3549/Δ727）; YYC3-F/open-design（+3/-5697/Δ145） |
| lsp | 2 | YYC3-LSP-语言服务/lsp | 中度差异（少量源码） | YYC3-E/lsp（+0/-16/Δ1） |
| ruff | 2 | YYC3-Tool-开发工具/ruff | 微量差异（元数据/配置） | YYC3-F/ruff（+0/-2/Δ0） |
| mui-x | 2 | YYC3-UI-用户界面/mui-x | 微量差异（元数据/配置） | YYC3-H/mui-x（+0/-1/Δ0） |
| lobehub | 2 | YYC3-AI-人工智能/lobehub | 中度差异（少量源码） | YYC3-J/lobehub（+0/-22/Δ0） |
| prettier | 2 | YYC3-Tool-开发工具/prettier | 微量差异（元数据/配置） | YYC3-F/prettier（+0/-2/Δ0） |
| shadcn-ui.tnasdownload | 3 | YYC3-UI-用户界面/shadcn-ui.tnasdownload | 微量差异（元数据/配置） | YYC3-A/shadcn-ui.tnasdownload（+0/-2/Δ0）; YYC3-D/shadcn-ui.tnasdownload（+0/-2/Δ0） |
| shadcn-ui | 2 | YYC3-UI-用户界面/shadcn-ui | 微量差异（元数据/配置） | YYC3-F/shadcn-ui（+0/-2/Δ0） |
| ui | 2 | YYC3-UI-用户界面/ui | 微量差异（元数据/配置） | YYC3-D/ui（+0/-2/Δ0） |
| void | 2 | YYC3-Tool-开发工具/void | 结构性差异（不同版本/分支） | YYC3-J/void（+0/-54/Δ0） |
| site-packages | 2 | YYC3-Python-Python标准库/site-packages | 结构性差异（不同版本/分支） | YYC3-N/site-packages（+0/-54/Δ115） |
| Core-files | 2 | YYC3-Tool-开发工具/Core-files | 微量差异（元数据/配置） | YYC3-B/Core-files（+0/-2/Δ0） |
| pyright | 2 | YYC3-LSP-语言服务/pyright | 中度差异（少量源码） | YYC3-C/pyright（+0/-4/Δ0） |
| syntax | 2 | YYC3-LSP-语言服务/syntax | 中度差异（少量源码） | YYC3-E/syntax（+3/-22/Δ2） |
| claude-code-templates-main | 2 | YYC3-AI-人工智能/claude-code-templates-main | 微量差异（元数据/配置） | YYC3-F/claude-code-templates-main（+0/-2/Δ0） |
| LaTeX-Workshop | 3 | YYC3-Editor-编辑器/LaTeX-Workshop | 中度差异（少量源码） | YYC3-C/LaTeX-Workshop（+0/-6/Δ0）; YYC3-J/LaTeX-Workshop（+0/-6/Δ0） |
| shell | 2 | YYC3-Shell-终端/shell | 微量差异（元数据/配置） | YYC3-E/shell（+0/-0/Δ0） |
| ant-design | 2 | YYC3-UI-用户界面/ant-design | 中度差异（少量源码） | YYC3-B/ant-design（+0/-13/Δ0） |
| content | 2 | YYC3-Tool-开发工具/content | 中度差异（少量源码） | YYC3-E/content（+0/-1/Δ3） |
| lucide | 3 | YYC3-Icon-图标资源/lucide | 中度差异（少量源码） | YYC3-C/lucide（+0/-11/Δ0）; YYC3-J/lucide（+0/-11/Δ0） |
| ionic-site | 3 | YYC3-Tool-开发工具/ionic-site | 中度差异（少量源码） | YYC3-C/ionic-site（+0/-1/Δ5）; YYC3-J/ionic-site（+0/-1/Δ5） |
| containers | 2 | YYC3-Cloud-云原生/containers | 中度差异（少量源码） | YYC3-E/containers（+0/-5/Δ0） |
| moby | 2 | YYC3-Cloud-云原生/moby | 中度差异（少量源码） | YYC3-C/moby（+0/-22/Δ0） |
| tdesign-vue-next | 2 | YYC3-UI-用户界面/tdesign-vue-next | 中度差异（少量源码） | YYC3-H/tdesign-vue-next（+0/-8/Δ1） |
| tools | 3 | YYC3-Tool-开发工具/tools | 微量差异（元数据/配置） | YYC3-C/tools（+0/-0/Δ0）; YYC3-J/tools（+0/-0/Δ0） |
| code-skills | 3 | YYC3-Skills-技能包/code-skills | 结构性差异（不同版本/分支） | YYC3-F/code-skills（+0/-7/Δ40）; YYC3-J/code-skills（+0/-7/Δ40） |
| external_plugins | 2 | YYC3-Plugin-插件体系/external_plugins | 微量差异（元数据/配置） | YYC3-B/external_plugins（+0/-3/Δ0） |
| skills | 5 | YYC3-Skills-技能包/skills | 结构性差异（不同版本/分支） | YYC3-B/skills（+10/-1255/Δ0）; YYC3-F/skills（+0/-3/Δ0）; YYC3-H/skills（+56/-1255/Δ0）; YYC3-I/skills（+216/-1252/Δ3） |
| goose | 2 | YYC3-Agent-智能体/goose | 中度差异（少量源码） | YYC3-E/goose（+0/-3/Δ4） |
| rust-analyzer | 2 | YYC3-LSP-语言服务/rust-analyzer | 中度差异（少量源码） | YYC3-E/rust-analyzer（+0/-3/Δ4） |
| openclaude | 2 | YYC3-AI-人工智能/openclaude | 微量差异（元数据/配置） | YYC3-J/openclaude（+0/-2/Δ1） |
| new-api | 3 | YYC3-G/new-api | 结构性差异（不同版本/分支） | YYC3-AI-人工智能/new-api（+65/-196/Δ233）; YYC3-J/new-api（+65/-198/Δ231） |
| Cherry-Studio | 2 | YYC3-Agent-智能体/Cherry-Studio | 中度差异（少量源码） | YYC3-F/Cherry-Studio（+0/-4/Δ0） |
| amazon-q-developer-cli | 2 | YYC3-Cloud-云原生/amazon-q-developer-cli | 微量差异（元数据/配置） | YYC3-A/amazon-q-developer-cli（+0/-0/Δ0） |
| Everything-claude-code | 2 | YYC3-AI-人工智能/Everything-claude-code | 中度差异（少量源码） | YYC3-J/Everything-claude-code（+0/-2/Δ8） |
| trt-samples-for-hackathon-cn | 2 | YYC3-AI-人工智能/trt-samples-for-hackathon-cn | 中度差异（少量源码） | YYC3-F/trt-samples-for-hackathon-cn（+0/-3/Δ2） |
| zsh | 2 | YYC3-Shell-终端/zsh | 微量差异（元数据/配置） | YYC3-B/zsh（+0/-2/Δ0） |
| EasySpider | 2 | YYC3-Tool-开发工具/EasySpider | 结构性差异（不同版本/分支） | YYC3-F/EasySpider（+0/-808/Δ0） |
| server-main | 2 | YYC3-AI-人工智能/server-main | 中度差异（少量源码） | YYC3-J/server-main（+0/-3/Δ8） |
| cb_teams_marketplace | 2 | YYC3-B/cb_teams_marketplace | 微量差异（元数据/配置） | YYC3-Business-商业/cb_teams_marketplace（+0/-0/Δ0） |
| core | 3 | YYC3-Tool-开发工具/core | 结构性差异（不同版本/分支） | YYC3-B/core（+46/-1343/Δ0）; YYC3-E/core（+0/-4/Δ0） |
| autocomplete | 2 | YYC3-Tool-开发工具/autocomplete | 中度差异（少量源码） | YYC3-A/autocomplete（+0/-4/Δ0） |
| onlook | 2 | YYC3-UI-用户界面/onlook | 中度差异（少量源码） | YYC3-H/onlook（+0/-29/Δ0） |
| ms-swift | 2 | YYC3-AI-人工智能/ms-swift | 中度差异（少量源码） | YYC3-F/ms-swift（+0/-12/Δ0） |
| autocomplete-specs | 2 | YYC3-Shell-终端/autocomplete-specs | 微量差异（元数据/配置） | YYC3-H/autocomplete-specs（+0/-2/Δ0） |
| acc-marketplace | 2 | YYC3-B/acc-marketplace | 微量差异（元数据/配置） | YYC3-Business-商业/acc-marketplace（+0/-0/Δ0） |
| buildwithclaude | 2 | YYC3-AI-人工智能/buildwithclaude | 中度差异（少量源码） | YYC3-B/buildwithclaude（+0/-5/Δ3） |
| zeroclaw | 2 | YYC3-Tool-开发工具/zeroclaw | 中度差异（少量源码） | YYC3-F/zeroclaw（+0/-7/Δ0） |
| gstack | 2 | YYC3-Agent-智能体/gstack | 微量差异（元数据/配置） | YYC3-F/gstack（+0/-1/Δ0） |
| repomix | 2 | YYC3-Tool-开发工具/repomix | 结构性差异（不同版本/分支） | YYC3-J/repomix（+0/-0/Δ68） |
| plugins | 3 | YYC3-B/plugins | 结构性差异（不同版本/分支） | YYC3-H/plugins（+514/-467/Δ0）; YYC3-Plugin-插件体系/plugins（+0/-0/Δ1） |
| cc-switch | 2 | YYC3-Tool-开发工具/cc-switch | 中度差异（少量源码） | YYC3-F/cc-switch（+0/-13/Δ0） |
| TypeScript-TmLanguage | 3 | YYC3-C/TypeScript-TmLanguage | 微量差异（元数据/配置） | YYC3-D/TypeScript-TmLanguage（+0/-1/Δ0）; YYC3-J/TypeScript-TmLanguage（+0/-1/Δ0） |
| Agent-Skills | 2 | YYC3-J/Agent-Skills | 结构性差异（不同版本/分支） | YYC3-Skills-技能包/Agent-Skills（+0/-0/Δ82） |
| ruby-lsp | 2 | YYC3-LSP-语言服务/ruby-lsp | 中度差异（少量源码） | YYC3-D/ruby-lsp（+0/-7/Δ0） |
| standards | 2 | YYC3-WebSpec-Web标准/standards | 微量差异（元数据/配置） | YYC3-E/standards（+0/-2/Δ0） |
| pi | 2 | YYC3-Tool-开发工具/pi | 微量差异（元数据/配置） | YYC3-F/pi（+0/-0/Δ0） |
| khoj | 2 | YYC3-AI-人工智能/khoj | 中度差异（少量源码） | YYC3-F/khoj（+0/-5/Δ2） |
| agents | 3 | YYC3-Agent-智能体/agents | 结构性差异（不同版本/分支） | YYC3-B/agents（+9/-424/Δ0）; YYC3-J/agents（+0/-0/Δ1） |
| serena | 3 | YYC3-Agent-智能体/serena | 结构性差异（不同版本/分支） | YYC3-B/serena（+2/-368/Δ0）; YYC3-J/serena（+0/-2/Δ7） |
| claude-howto | 3 | YYC3-AI-人工智能/claude-howto | 结构性差异（不同版本/分支） | YYC3-F/claude-howto（+0/-0/Δ0）; YYC3-J/claude-howto（+9/-106/Δ95） |
| claude-mem-main | 2 | YYC3-AI-人工智能/claude-mem-main | 中度差异（少量源码） | YYC3-F/claude-mem-main（+0/-3/Δ1） |
| better-cpp-syntax | 2 | YYC3-J/better-cpp-syntax | 中度差异（少量源码） | YYC3-C/better-cpp-syntax（+0/-4/Δ0） |
| one-api | 3 | YYC3-AI-人工智能/one-api | 微量差异（元数据/配置） | YYC3-I/one-api（+0/-0/Δ0）; YYC3-J/one-api（+0/-1/Δ0） |
| claude-prompts-mcp | 4 | YYC3-AI-人工智能/claude-prompts-mcp | 中度差异（少量源码） | YYC3-E/claude-prompts-mcp（+0/-35/Δ2）; YYC3-F/claude-prompts-mcp（+0/-36/Δ2）; YYC3-H/claude-prompts-mcp（+0/-36/Δ2） |
| lua-language-server | 3 | YYC3-LSP-语言服务/lua-language-server | 中度差异（少量源码） | YYC3-C/lua-language-server（+0/-7/Δ1）; YYC3-J/lua-language-server（+0/-7/Δ1） |
| sourcekit-lsp | 2 | YYC3-LSP-语言服务/sourcekit-lsp | 微量差异（元数据/配置） | YYC3-E/sourcekit-lsp（+0/-2/Δ0） |
| temp-ai-management | 2 | YYC3-AI-人工智能/temp-ai-management | 结构性差异（不同版本/分支） | YYC3-F/temp-ai-management（+0/-71/Δ0） |
| CowAgent | 3 | YYC3-Agent-智能体/CowAgent | 结构性差异（不同版本/分支） | YYC3-F/CowAgent（+0/-0/Δ0）; YYC3-J/CowAgent（+0/-15/Δ76） |
| marked | 3 | YYC3-C/marked | 结构性差异（不同版本/分支） | YYC3-J/marked（+0/-399/Δ0）; YYC3-Tool-开发工具/marked（+0/-0/Δ0） |
| autocomplete-tools | 2 | YYC3-Tool-开发工具/autocomplete-tools | 微量差异（元数据/配置） | YYC3-H/autocomplete-tools（+0/-3/Δ0） |
| Understand-Anything | 2 | YYC3-AI-人工智能/Understand-Anything | 微量差异（元数据/配置） | YYC3-F/Understand-Anything（+0/-2/Δ0） |
| AgentBench-main | 2 | YYC3-Agent-智能体/AgentBench-main | 微量差异（元数据/配置） | YYC3-J/AgentBench-main（+0/-0/Δ1） |
| Colorsublime-Themes | 2 | YYC3-A/Colorsublime-Themes | 中度差异（少量源码） | YYC3-Design-设计资源/Colorsublime-Themes（+0/-0/Δ6） |
| Qwen-Agent | 2 | YYC3-AI-人工智能/Qwen-Agent | 中度差异（少量源码） | YYC3-D/Qwen-Agent（+0/-4/Δ0） |
| MagicPython | 3 | YYC3-C/MagicPython | 微量差异（元数据/配置） | YYC3-J/MagicPython（+0/-0/Δ0）; YYC3-Syntax-语法定义/MagicPython（+0/-0/Δ1） |
| ui-ux-pro-max-skill | 2 | YYC3-Skills-技能包/ui-ux-pro-max-skill | 中度差异（少量源码） | YYC3-J/ui-ux-pro-max-skill（+0/-0/Δ17） |
| cwc-workshops | 2 | YYC3-Tool-开发工具/cwc-workshops | 中度差异（少量源码） | YYC3-F/cwc-workshops（+0/-6/Δ0） |
| screenshot-to-code | 3 | YYC3-H/screenshot-to-code | 结构性差异（不同版本/分支） | YYC3-AI-人工智能/screenshot-to-code（+10/-43/Δ66）; YYC3-F/screenshot-to-code（+10/-46/Δ66） |
| free-claude-code | 2 | YYC3-AI-人工智能/free-claude-code | 微量差异（元数据/配置） | YYC3-F/free-claude-code（+0/-1/Δ0） |
| better-shell-syntax | 2 | YYC3-J/better-shell-syntax | 中度差异（少量源码） | YYC3-C/better-shell-syntax（+0/-4/Δ0） |
| better-c-syntax | 2 | YYC3-J/better-c-syntax | 中度差异（少量源码） | YYC3-C/better-c-syntax（+0/-4/Δ0） |
| system_prompts_leaks | 3 | YYC3-AI-人工智能/system_prompts_leaks | 结构性差异（不同版本/分支） | YYC3-F/system_prompts_leaks（+0/-0/Δ2）; YYC3-J/system_prompts_leaks（+51/-135/Δ14） |
| agent-browser | 2 | YYC3-Agent-智能体/agent-browser | 微量差异（元数据/配置） | YYC3-B/agent-browser（+0/-2/Δ0） |
| edict | 3 | YYC3-Tool-开发工具/edict | 结构性差异（不同版本/分支） | YYC3-E/edict（+0/-5/Δ0）; YYC3-F/edict（+24/-35/Δ7） |
| ai-model-distillation-for-financial-data | 2 | YYC3-Finance-金融量化/ai-model-distillation-for-financial-data | 中度差异（少量源码） | YYC3-F/ai-model-distillation-for-financial-data（+0/-20/Δ0） |
| better-snippet-syntax | 2 | YYC3-J/better-snippet-syntax | 中度差异（少量源码） | YYC3-C/better-snippet-syntax（+0/-4/Δ0） |
| better-objcpp-syntax | 2 | YYC3-J/better-objcpp-syntax | 中度差异（少量源码） | YYC3-C/better-objcpp-syntax（+0/-4/Δ0） |
| better-objc-syntax | 2 | YYC3-J/better-objc-syntax | 中度差异（少量源码） | YYC3-C/better-objc-syntax（+0/-4/Δ0） |
| js-beautify | 3 | YYC3-Tool-开发工具/js-beautify | 微量差异（元数据/配置） | YYC3-C/js-beautify（+0/-0/Δ0）; YYC3-J/js-beautify（+0/-0/Δ0） |
| shannon | 2 | YYC3-AI-人工智能/shannon | 微量差异（元数据/配置） | YYC3-F/shannon（+0/-3/Δ0） |
| career-ops | 2 | YYC3-Business-商业/career-ops | 微量差异（元数据/配置） | YYC3-J/career-ops（+0/-1/Δ0） |
| idlelib | 2 | YYC3-N/idlelib | 微量差异（元数据/配置） | YYC3-Python-Python标准库/idlelib（+0/-0/Δ1） |
| NVIDA | 2 | YYC3-Python-Python标准库/NVIDA | 微量差异（元数据/配置） | YYC3-N/NVIDA（+0/-1/Δ0） |
| GenerativeAI-Starter-Kit | 2 | YYC3-AI-人工智能/GenerativeAI-Starter-Kit | 中度差异（少量源码） | YYC3-H/GenerativeAI-Starter-Kit（+0/-8/Δ0） |
| superpowers | 4 | YYC3-I/superpowers | 结构性差异（不同版本/分支） | YYC3-B/superpowers（+8/-107/Δ20）; YYC3-J/superpowers（+6/-10/Δ30）; YYC3-Tool-开发工具/superpowers（+6/-10/Δ30） |
| csharp-language-server | 3 | YYC3-C/csharp-language-server | 微量差异（元数据/配置） | YYC3-J/csharp-language-server（+0/-0/Δ0）; YYC3-LSP-语言服务/csharp-language-server（+0/-0/Δ1） |
| graphify | 2 | YYC3-Business-商业/graphify | 微量差异（元数据/配置） | YYC3-J/graphify（+0/-1/Δ0） |
| html | 5 | YYC3-A/html | 结构性差异（不同版本/分支） | YYC3-B/html（+0/-0/Δ0）; YYC3-N/html（+3/-121/Δ0）; YYC3-Python-Python标准库/html（+3/-121/Δ0）; YYC3-WebSpec-Web标准/html（+0/-0/Δ0） |
| old-google-code-html5 | 2 | YYC3-A/old-google-code-html5 | 微量差异（元数据/配置） | YYC3-Syntax-语法定义/old-google-code-html5（+0/-0/Δ3） |
| ai-agent | 2 | YYC3-Agent-智能体/ai-agent | 微量差异（元数据/配置） | YYC3-H/ai-agent（+0/-2/Δ0） |
| misc-server | 2 | YYC3-B/misc-server | 微量差异（元数据/配置） | YYC3-MCP-MCP协议/misc-server（+0/-0/Δ2） |
| app-ideas | 2 | YYC3-Design-设计资源/app-ideas | 微量差异（元数据/配置） | YYC3-F/app-ideas（+0/-0/Δ2） |
| practicalEthicalHacking | 2 | YYC3-F/practicalEthicalHacking | 中度差异（少量源码） | YYC3-Security-安全/practicalEthicalHacking（+0/-0/Δ4） |
| GenerativeAIExamples | 3 | YYC3-AI-人工智能/GenerativeAIExamples | 中度差异（少量源码） | YYC3-G/GenerativeAIExamples（+0/-6/Δ0）; YYC3-H/GenerativeAIExamples（+0/-6/Δ0） |
| playwright-mcp | 2 | YYC3-MCP-MCP协议/playwright-mcp | 微量差异（元数据/配置） | YYC3-C/playwright-mcp（+0/-1/Δ2） |
| vscode-logfile-highlighter | 2 | YYC3-B/vscode-logfile-highlighter | 结构性差异（不同版本/分支） | YYC3-Editor-编辑器/vscode-logfile-highlighter（+0/-62/Δ0） |
| csharp-tmLanguage | 2 | YYC3-Syntax-语法定义/csharp-tmLanguage | 中度差异（少量源码） | YYC3-B/csharp-tmLanguage（+0/-1/Δ7） |
| dart-syntax-highlight | 2 | YYC3-Syntax-语法定义/dart-syntax-highlight | 微量差异（元数据/配置） | YYC3-A/dart-syntax-highlight（+0/-1/Δ0） |
| html-build | 2 | YYC3-WebSpec-Web标准/html-build | 微量差异（元数据/配置） | YYC3-B/html-build（+0/-3/Δ0） |
| ollama-llm-platform | 2 | YYC3-AI-人工智能/ollama-llm-platform | 中度差异（少量源码） | YYC3-H/ollama-llm-platform（+0/-7/Δ0） |
| financial-fraud-detection | 2 | YYC3-Finance-金融量化/financial-fraud-detection | 微量差异（元数据/配置） | YYC3-F/financial-fraud-detection（+0/-1/Δ0） |
| swift-tmlanguage | 2 | YYC3-Syntax-语法定义/swift-tmlanguage | 中度差异（少量源码） | YYC3-C/swift-tmlanguage（+0/-4/Δ0） |
| ionide-fsgrammar | 3 | YYC3-Syntax-语法定义/ionide-fsgrammar | 微量差异（元数据/配置） | YYC3-C/ionide-fsgrammar（+0/-2/Δ1）; YYC3-J/ionide-fsgrammar（+0/-2/Δ1） |
| blog.whatwg.org | 2 | YYC3-B/blog.whatwg.org | 中度差异（少量源码） | YYC3-WebSpec-Web标准/blog.whatwg.org（+0/-0/Δ7） |
| Better-Less | 2 | YYC3-Syntax-语法定义/Better-Less | 微量差异（元数据/配置） | YYC3-B/Better-Less（+0/-1/Δ0） |
| awesome-openclaw-skills | 2 | YYC3-Skills-技能包/awesome-openclaw-skills | 微量差异（元数据/配置） | YYC3-F/awesome-openclaw-skills（+0/-1/Δ0） |
| domparsing | 2 | YYC3-A/domparsing | 中度差异（少量源码） | YYC3-WebSpec-Web标准/domparsing（+0/-0/Δ4） |
| lua.tmbundle | 3 | YYC3-D/lua.tmbundle | 中度差异（少量源码） | YYC3-C/lua.tmbundle（+7/-23/Δ1）; YYC3-J/lua.tmbundle（+6/-23/Δ1） |
| Handlebars | 2 | YYC3-A/Handlebars | 微量差异（元数据/配置） | YYC3-Tool-开发工具/Handlebars（+0/-0/Δ2） |
| go-syntax | 3 | YYC3-Syntax-语法定义/go-syntax | 微量差异（元数据/配置） | YYC3-C/go-syntax（+0/-2/Δ0）; YYC3-J/go-syntax（+0/-2/Δ0） |
| vscode-swift | 2 | YYC3-Editor-编辑器/vscode-swift | 中度差异（少量源码） | YYC3-B/vscode-swift（+0/-4/Δ0） |
| markdown-it-katex | 2 | YYC3-Tool-开发工具/markdown-it-katex | 微量差异（元数据/配置） | YYC3-A/markdown-it-katex（+0/-1/Δ0） |
| YAML-Syntax-Highlighter | 2 | YYC3-Syntax-语法定义/YAML-Syntax-Highlighter | 微量差异（元数据/配置） | YYC3-D/YAML-Syntax-Highlighter（+0/-2/Δ0） |
| rust-syntax | 2 | YYC3-Syntax-语法定义/rust-syntax | 微量差异（元数据/配置） | YYC3-D/rust-syntax（+0/-2/Δ0） |
| ctypes | 2 | YYC3-N/ctypes | 微量差异（元数据/配置） | YYC3-Python-Python标准库/ctypes（+0/-0/Δ1） |
| config-3.13-darwin | 2 | YYC3-Python-Python标准库/config-3.13-darwin | 微量差异（元数据/配置） | YYC3-N/config-3.13-darwin（+0/-1/Δ0） |

### 4.1 裁决建议

| 情形 | 判据 | 处置 |
| --- | --- | --- |
| 仅 `.git` 差异 | 内容零差异 | 按第三章去重，保留一份并保留其 `.git` |
| 差异 ≤ 3 个文件且均为元数据 | 新增/缺失文件为配置或锁文件 | 保留文件最全的一份 |
| 差异涉及源码 | `Δ` 数量 > 5 | 视为不同版本，**不合并**，按 `-v1/-v2` 保留并标注版本 |
| 结构性差异（如 `open-design` 12k vs 1.6k 文件） | 体积比 > 1.5 | 视为不同分支/快照，分别保留 |

---

## 五、分类体系（24 类）

命名定义：`YYC3-「分类名称」-「项目原名」`
约束：ASCII 前缀 `YYC3` + 分类名 + 原名，空格归一为 `-`，与《YYC³ 团队通用-命名规范》§5 品牌写法一致。

| 分类名称 | 项目数 | 文件数 | 体积 | 其中重复目录 | 判定依据（架构 / 技术 / 场景） |
| --- | --- | --- | --- | --- | --- |
| AI-模型服务 | 30 | 49,129 | 1.70 GB | 6 | LLM 网关、推理、训练/蒸馏、RAG |
| Tool-开发工具链 | 85 | 138,586 | 1.59 GB | 48 | 格式化、构建、CLI、文档工具 |
| Agent-智能体 | 40 | 39,581 | 1.43 GB | 10 | 自主任务编排、编码智能体、多智能体框架 |
| Data-数据存储 | 9 | 144,309 | 1.40 GB | 4 | 数据库、存储引擎、数据处理 |
| AI-应用工具 | 48 | 90,454 | 1.34 GB | 12 | 面向终端用户的 AI 应用与模板工程 |
| WebSpec-Web标准 | 73 | 32,114 | 1.32 GB | 61 | WHATWG/W3C 规范与工具链 |
| TypeDef-类型定义 | 4 | 250,409 | 1.04 GB | 0 | 类型声明仓库 |
| Doc-文档知识 | 15 | 15,271 | 1021.2 MB | 8 | 书籍、课程、知识型文档 |
| IDE-编辑器内核 | 15 | 67,042 | 966.0 MB | 0 | 编辑器/IDE 主体 |
| UI-界面组件 | 21 | 97,983 | 743.6 MB | 11 | 组件库、设计系统、主题包 |
| Design-设计资源 | 23 | 38,993 | 719.9 MB | 14 | 图标、主题、视觉素材 |
| Skills-技能包 | 39 | 44,842 | 567.8 MB | 21 | Skill 集合与技能市场 |
| Cloud-云原生 | 14 | 53,915 | 411.8 MB | 6 | 容器、K8s、Serverless、CI |
| Shell-终端 | 11 | 22,782 | 387.4 MB | 5 | Shell 实现与终端增强 |
| LSP-语言服务 | 34 | 45,315 | 378.9 MB | 22 | 语言服务器与语言工具链 |
| Plugin-插件协议 | 31 | 12,371 | 299.8 MB | 18 | MCP 协议与插件宿主 |
| Syntax-语法高亮 | 96 | 27,172 | 261.5 MB | 42 | TextMate bundle / tmLanguage 语法定义 |
| Frontend-前端框架 | 9 | 13,619 | 253.5 MB | 0 | 应用级前端框架与模板站 |
| Editor-编辑器扩展 | 20 | 19,102 | 215.3 MB | 5 | 编辑器插件与扩展 |
| Runtime-标准库 | 71 | 16,873 | 172.9 MB | 60 | 语言运行时与标准库 |
| Desktop-桌面应用 | 4 | 5,730 | 144.8 MB | 2 | Electron / Flutter 桌面端成品 |
| Business-商业应用 | 10 | 6,793 | 99.0 MB | 4 | 商业场景应用与模板 |
| Finance-金融量化 | 8 | 688 | 46.9 MB | 4 | 量化、风控、金融数据 |
| Security-安全合规 | 8 | 264 | 4.8 MB | 6 | 安全扫描、规则、攻防 |

### 5.1 分类判据

| 分类 | 判据 |
| --- | --- |
| Agent-智能体 | 自主任务编排、编码智能体、多智能体框架（含 `SKILL.md`/`pyproject`/`Cargo.toml` + agent 关键词） |
| AI-模型服务 | LLM 网关、推理服务、模型训练/蒸馏、RAG 引擎、向量检索 |
| AI-应用工具 | 面向终端用户的 AI 应用与提示词/模板工程 |
| UI-界面组件 | 组件库、设计系统、主题包（React/Vue 组件 + shadcn/antd/mui） |
| Frontend-前端框架 | 应用级前端框架与模板站（bootstrap/htmx/ionic/reveal） |
| Desktop-桌面应用 | Electron / Flutter 桌面端成品应用 |
| IDE-编辑器内核 | 编辑器/IDE 主体（vscode 系、theia、zed、lapce） |
| Editor-编辑器扩展 | 编辑器插件扩展（vscode 扩展、LaTeX-Workshop、主题 UI） |
| Syntax-语法高亮 | TextMate bundle、tmLanguage、语法/语法高亮定义 |
| LSP-语言服务 | 语言服务器、语言工具链、类型定义服务 |
| TypeDef-类型定义 | 类型声明仓库（DefinitelyTyped 等） |
| Tool-开发工具链 | 格式化、构建、CLI、包管理、文档工具 |
| Shell-终端 | Shell 实现与终端增强（zsh/fish/atuin） |
| Cloud-云原生 | 容器、K8s、Serverless、云平台、CI |
| Data-数据存储 | 数据库、存储引擎、数据处理基础设施 |
| Security-安全合规 | 安全扫描、规则、攻防 |
| Finance-金融量化 | 量化、风控、金融数据 |
| WebSpec-Web标准 | WHATWG/W3C 规范与配套工具链 |
| Runtime-标准库 | 语言运行时与标准库（Python stdlib 等） |
| Skills-技能包 | Skill 集合与技能市场 |
| Plugin-插件协议 | MCP 协议、插件宿主与插件集合 |
| Design-设计资源 | 图标、主题、视觉素材、设计文档 |
| Business-商业应用 | 商业场景应用与模板 |
| Doc-文档知识 | 书籍、课程、知识型文档 |

---

## 六、分类映射清单

- 全量映射（718 行，含技术信号与副本数）：[YYC3-项目治理-分类映射.csv](./YYC3-项目治理-分类映射.csv)
- 重复项全量清单（179 簇）：[YYC3-项目治理-重复项清单.csv](./YYC3-项目治理-重复项清单.csv)
- 全局汇总映射（当前 386 项全量对照）：[YYC3-项目治理-全局汇总映射.md](../YYC3-项目治理-全局汇总映射.md)
- 分类可视化架构（24 页）：[分类架构索引](../YYC3-Knowledge-Base/index.html)

### 6.1 映射示例

| 当前路径 | 分类 | 建议新目录名 |
| --- | --- | --- |
| `YYC3-A/Accumulo 3.0.0` | Data-数据存储 | `YYC3-Data-数据存储-Accumulo-3.0.0` |
| `YYC3-A/Colorsublime-Themes` | Design-设计资源 | `YYC3-Design-设计资源-Colorsublime-Themes` |
| `YYC3-A/DefinitelyTyped` | TypeDef-类型定义 | `YYC3-TypeDef-类型定义-DefinitelyTyped` |
| `YYC3-A/Handlebars` | Tool-开发工具链 | `YYC3-Tool-开发工具链-Handlebars` |
| `YYC3-A/SASS.tmbundle` | Syntax-语法高亮 | `YYC3-Syntax-语法高亮-SASS.tmbundle` |
| `YYC3-A/amazon-q-developer-cli` | Agent-智能体 | `YYC3-Agent-智能体-amazon-q-developer-cli` |
| `YYC3-A/domparsing` | WebSpec-Web标准 | `YYC3-WebSpec-Web标准-domparsing` |
| `YYC3-A/shadcn-ui.tnasdownload` | UI-界面组件 | `YYC3-UI-界面组件-shadcn-ui.tnasdownload` |
| `YYC3-A/web-history` | Doc-文档知识 | `YYC3-Doc-文档知识-web-history` |
| `YYC3-AI-人工智能/AI` | AI-应用工具 | `YYC3-AI-应用工具-AI` |
| `YYC3-AI-人工智能/GenerativeAI-Starter-Kit` | AI-模型服务 | `YYC3-AI-模型服务-GenerativeAI-Starter-Kit` |
| `YYC3-B/Agent` | Skills-技能包 | `YYC3-Skills-技能包-Agent` |
| `YYC3-B/acc-marketplace` | Business-商业应用 | `YYC3-Business-商业应用-acc-marketplace` |
| `YYC3-B/atuin` | Shell-终端 | `YYC3-Shell-终端-atuin` |
| `YYC3-B/clangd-lsp` | LSP-语言服务 | `YYC3-LSP-语言服务-clangd-lsp` |
| `YYC3-B/cloudbase` | Cloud-云原生 | `YYC3-Cloud-云原生-cloudbase` |
| `YYC3-B/context7` | Plugin-插件协议 | `YYC3-Plugin-插件协议-context7` |
| `YYC3-B/security-guidance` | Security-安全合规 | `YYC3-Security-安全合规-security-guidance` |
| `YYC3-B/vscode-codicons` | Editor-编辑器扩展 | `YYC3-Editor-编辑器扩展-vscode-codicons` |
| `YYC3-C/vscode` | IDE-编辑器内核 | `YYC3-IDE-编辑器内核-vscode` |
| `YYC3-F/ai-model-distillation-for-financial-data` | Finance-金融量化 | `YYC3-Finance-金融量化-ai-model-distillation-for-financial-data` |
| `YYC3-G/spotube` | Desktop-桌面应用 | `YYC3-Desktop-桌面应用-spotube` |
| `YYC3-H/bootstrap` | Frontend-前端框架 | `YYC3-Frontend-前端框架-bootstrap` |
| `YYC3-N/NVIDA` | Runtime-标准库 | `YYC3-Runtime-标准库-NVIDA` |

### 6.2 命名冲突处理

同名项目在去重后仍存在「同名不同内容」的情形（见第四章），映射表中以首个保留项占用规范名，其余版本建议追加 `-v2` 或 `-<源桶>` 后缀（如 `YYC3-AI-应用工具-claude-prompts-mcp` 与 `-v2`），避免覆盖。

---

## 七、执行方案与结果

> **治理决策（2026-11-10）**：重复项保留策略采用**领域桶优先**（同体积按路径字典序）；P1~P3 已执行，P4 已同步根 README 与工作区说明。

| 步骤 | 动作 | 状态 | 结果 |
| --- | --- | --- | --- |
| P1 | 冻结基线：打 tag `pre-governance-20261110` | ✅ 完成 | tag 指向 `eb9f03fc05` |
| P2 | 删除 190 个确认重复副本（领域桶优先保留） | ✅ 完成 | 回收 1.35 GB，718 → 528 个项目 |
| P3 | 建立 24 个分类目录，按 `YYC3-{分类}-{原名}` 迁入 | ✅ 完成 | 528 个项目全部迁入，0 命名违规 |
| P4 | 更新全库引用（根 README、工作区说明） | ✅ 完成 | 旧 35 桶引用已替换为 24 类 |
| P5 | 治理后回归校验 | ✅ 完成 | 指纹多重集一致；重复簇 0；分类覆盖 100% |

### 7.1 执行结果

| 指标 | 执行前 | 首批后 | 二次清理后 |
| --- | --- | --- | --- |
| 一级目录 | 35 个（含 11 个字母桶） | 24 个 | **24 个** |
| 项目目录 | 718 | 528 | **386** |
| 文件数 | 1,233,337 | 1,123,722 | **670,941** |
| 精确重复簇 | 179 | 0 | **0** |
| 命名合规 | 混合（字母桶 + 领域桶） | 100% | **100%** |

### 7.2 例外与处理

| 情形 | 数量 | 处理 |
| --- | --- | --- |
| 同名但内容不同（版本变体） | 134 组 | 追加 `-v2/-v3` 后缀并存，不合并 |
| APFS 大小写不敏感导致的命名冲突 | 2 例 | `Everything-claude-code` / `Agent-Skills` 追加 `-v3` |
| 原名含空格 | 1 例 | `Accumulo 3.0.0` → `Accumulo-3.0.0` |

### 7.3 二次清理：编号变体复核

对全部 150 个 `-v2/-v3` 编号目录逐一与同名基目录做**逐路径归一化比对**（NFC 归一，规避 macOS 文件名 Unicode 形式差异）：

| 判定 | 数量 | 处理 |
| --- | --- | --- |
| 变体文件**全部**存在于基目录且尺寸一致（无独有内容） | **127** | 直接清除，零内容损失 |
| 变体含独有文件（真实版本差异） | 23 | 保留，标注"版本变体" |

> 清除 127 个副本后，项目数 528 → **401**，文件数减少 **414,799**；剩余 23 个变体均存在基目录中不存在的文件（如 `kubernetes-v2` 独有 7,731 个文件），不可合并。

> 回滚方式：`git checkout pre-governance-20261110 -- <原路径>` 可恢复任一被删副本；迁移记录见 [回滚清单](./YYC3-项目治理-回滚清单.csv)。

### 7.4 第三批：版本裁决（保留最新/最全）

对 13 组同名版本逐一比对「文件数 / 体积 / 版本号 / 独有文件」，保留最新且最完整的版本，其余删除，并把保留项改回规范名。

| 组 | 保留 | 删除 | 依据 |
| --- | --- | --- | --- |
| edict / edict-v3 | `edict`（215 文件） | `edict-v3` | 保留项含核心架构文档，v3 为旧快照 |
| new-api / new-api-v2 | `new-api`（原 v2，2219 文件） | 旧 `new-api`（1015 文件） | 新版多 electron/.agents 等 1629 文件 |
| claude-howto / v2 | `claude-howto`（660 文件） | `-v2` | v2 缺 127 文件 |
| Everything-claude-code / v3 | `Everything-claude-code`（原 v3，2.0.0-rc.1） | 旧版 1.10.0 | 版本更新 |
| screenshot-to-code / v2 | `screenshot-to-code`（原 v2，316 文件） | 旧版（265 文件） | 新版多 evals/asset 抽取模块 |
| kubernetes / v2 | `kubernetes`（原 v2，23692 文件） | 旧版（16019 文件） | 旧版缺 7731 文件 |
| open-design / v2 / v4 | `open-design`（原 v2，0.16.2） | 0.10.0 与 v4 | 版本最新且最全，v4 被完全覆盖 |
| vscode-logfile-highlighter / v2 | `vscode-logfile-highlighter`（原 v2，62 文件） | 空目录 | 旧目录 0 文件 |
| vscode / v2 | `vscode`（1.124.0） | `-v2`（1.113.0） | 版本更新 |
| plugins / v3 | 两者均保留：`plugins`（CodeBuddy 55 个）与 `plugins-claude`（Claude 73 个） | 无 | **非重复**，插件集不同 |
| core / v3 | 两者均保留：`core`（fig/autocomplete）与 `core-sdk`（TS SDK） | 无 | **非重复**，项目不同 |
| Agent-Skills-v2 / v3 | `Agent-Skills`（922 文件） | `-v3` | 两者完全一致 |
| superpowers / v2 | `superpowers`（原 v2，5.1.0） | 旧版 5.0.7 | 版本更新 |

> 另将 `agent-skills`（框架仓库）更名为 `agent-skills-framework`，避免与 `Agent-Skills`（技能集合）大小写冲突。
> 裁决后：项目数 401 → **386**，文件数 708,923 → **670,941**。

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| --- | --- | --- | --- |
| v1.3.0 | 2026-11-10 | 第三批版本裁决：13 组比对后删除 12 个冗余版本、11 项规范名回归；24 个分类 README 全量重生成 | YYC³ Team |
| v1.2.0 | 2026-11-10 | 二次清理：复核 150 个编号变体，清除 127 个零独有内容的重复副本；保留 23 个真实版本差异 | YYC³ Team |
| v1.1.0 | 2026-11-10 | 执行 P2 去重（-190 副本）与 P3 分类迁移（528 项目 / 24 类），生成分类 README，回归校验通过 | YYC³ Team |
| v1.0.0 | 2026-11-10 | 首次全局指纹扫描：718 目录、179 组精确重复、136 组同名近似、24 类分类映射 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
