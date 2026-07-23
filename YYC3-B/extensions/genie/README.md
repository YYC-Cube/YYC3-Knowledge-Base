# 腾讯云代码助手 CodeBuddy

## 产品介绍 Product Introduction

腾讯云代码助手（Tencent Cloud CodeBuddy，以下简称 CodeBuddy），由腾讯云自研的一款开发编程提效辅助工具，基于腾讯混元 + DeepSeek、GLM 多轮模型驱动，构建对开发者友好，好用易用的代码助手，为开发者提供AI技术问答、Craft软件编码智能体、智能代码补全、单元测试、智能评审、代码修复等 Agent 智能体拓展能力，新增 Rules 规则管理，兼容 MCP 开放生态，并可支持团队知识库管理、自定义智能体与指令管理、多模型接入、企业账号集成等功能，辅助开发者提升编码效率和质量，助力研发团队提质增效。

Tencent Cloud CodeBuddy (hereinafter referred to as **CodeBuddy**) is a developer productivity tool independently developed by Tencent Cloud. Powered by Tencent Hunyuan + DeepSeek and GLM multi-turn models, it delivers a developer-friendly, easy-to-use coding assistant.CodeBuddy provides AI technical Q&A, Craft coding Agents, intelligent code completion, unit testing, smart code review, code repair, and other Agent-based capabilities. It introduces **Rules** for rule management, is compatible with the **MCP** open ecosystem, and supports team knowledge base management, custom Agents and command management, multi-model integration, and enterprise account integration.CodeBuddy helps developers improve coding efficiency and quality, supporting R&D teams in achieving higher productivity and better results.

### 主要特点

- 兼容 Visual Studio Code、JetBrains IDEs (IntelliJ IDEA、Rider、Pycharm、Android Studio、鸿蒙DevEco Studio）、Visual Studio、CloudStudio 、微信开发者小程序工具等主流 IDE)。
- 编程语言及框架：支持 Java、Python、Go、C/C++、JavaScript、TypeScript、HTML、PHP、Ruby、Rust、Swift、Scala、Lua、 Dart、Node.JS、CSS3 等主流编程语言。
- 免费体验：访问 https://copilot.tencent.com 了解更多。

（注：产品功能存在持续更新，部分IDE因版本发布原因，存在滞后，请以官方文档最新信息为准）

### Key Features

- Compatible with major IDEs: Visual Studio Code, JetBrains IDEs (IntelliJ IDEA, Rider, PyCharm, Android Studio, HarmonyOS DevEco Studio), Visual Studio, CloudStudio, WeChat Mini Program Developer Tools, and more.
- Programming languages & frameworks: Supports mainstream languages including Java, Python, Go, C/C++, JavaScript, TypeScript, HTML, PHP, Ruby, Rust, Swift, Scala, Lua, Dart, Node.js, CSS3, and more.
- Free trial: Visit [https://copilot.tencent.com](https://copilot.tencent.com) to learn more.

(Note: Product features are continuously updated, and some IDEs may experience delays due to version release schedules. Please refer to the latest information in the official documentation.)

## 产品特性 Product Features

### 全新软件开发智能体 Craft

自主完成多文件代码生成和改写

New software development intelligent agent Craft: autonomously completes multi-file code generation and rewriting

输入指令，AI 深度理解，支持多文件代码编写与修改，自动生成可执行的应用。

Simply input your instructions—AI deeply comprehends your requirements, supports multi-file coding and editing, and automatically generates executable applications.

![Craft演示](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100039847436/3068a5c8c42211f09c26525400bf7822.gif)

### AI 技术对话

人工智能技术对话，复杂问题轻松解决

AI-Powered Tech Chat: Intelligent AI-driven conversations to effortlessly tackle complex technical challenges.

- 基于海量技术文档、微信开发文档、腾讯云API文档等进行训练，并支持团队自定义知识库管理，轻松问答。
  Trained on vast technical documentation, WeChat development docs, Tencent Cloud API references, and more—with support for team-customized knowledge base management for seamless Q&A.
  ![Swarm框架](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100039847436/99a62840c42611f0b4a7525400454e06.gif)

- 支持灵活配置和切换多种模型，并支持第三方 DeepSeek 模型接入
  Supports flexible configuration and switching between multiple models, including third-party DeepSeek model integration.
  ![多模型切换和接入](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100039847436/4d7ab67ec42711f083155254001c06ec.png)

- 技术对话集成 IDE，支持将对话代码内容一键插入编译区当中，快速问答
  Integrated IDE Tech Chat: Supports one-click insertion of code from conversations directly into the compilation area for rapid Q&A.
  ![应用代码](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100039847436/76e7042cc42811f08c0e52540044a08e.gif)

- 支持框选或全选编译区代码内容，进行代码规范检查与错误修复
  Supports selecting or highlighting code in the compilation area for automated code compliance checks and error fixes.
  ![fix](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100039847436/66fe1abec42a11f0b35752540099c741.gif)

- 智能生成代码注释，清晰解释既有代码，快速接手历史项目
  Intelligent Code Annotation: Automatically generates clear explanations for existing code, enabling faster onboarding for legacy projects.
  ![代码注释](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100039847436/905aa831c42d11f0aa02525400e889b2.gif)

### 代码补全

智能补全 · 高效完成编程工作

Code Completion: Smart suggestions to efficiently complete your programming tasks.

- 支持 200种语言及框架生成，20 多种语法深度学习，31+种补全策略，支持注释描述的补全，变量补全，函数补全等，按照Enter 回车补全，Tab 一键采纳
  With compatibility for 200+ programming languages and frameworks, deep learning models trained on 20+ syntax types, and 31+ intelligent completion strategies—including comment-driven suggestions, variable name generation, and function implementation—seamlessly integrate suggestions by pressing Enter and instantly accept them with Tab.
  ![代码补全](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100039847436/f830edd6c42e11f0a0935254007c27c5.gif)

- 基于上下文理解以及开发者编辑行为，智能感知当前编码环境，实时提供下一步代码编辑建议，并给出相应推荐，Tab 即可轻松完成编码，激发研发心流，极大提升编码效率
  Context-Aware Intelligent Coding Assistance: Leveraging deep contextual understanding and real-time analysis of developer behavior, it intelligently adapts to your coding environment—providing instant suggestions for the next logical step. Simply press Tab to accept recommendations, seamlessly maintaining your flow state and significantly boosting productivity.
  ![智能编码](https://qcloudimg.tencent-cloud.cn/image/document/9648a58269a91f448a33c2553b8a68c3.png) 

### 支持MCP协议

兼容MCP开放生态，与外部系统实现标准化连接

兼容 MCP 开放生态，推动 AI 与外部系统标准化连接，串联端到端的开发全流程

- MCP兼容性：无缝对接MCP开放生态，实现标准化系统连接
- AI-系统桥梁：提供统一的AI驱动外部平台交互能力
- 端到端开发流：贯通从编码到部署的全研发生命周期

Supports MCP protocol and is compatible with the MCP open ecosystem, enabling standardized connections with external systems.

Compatible with the MCP open ecosystem, it promotes standardized AI-to-external-system connectivity and streamlines end-to-end development workflows.

- MCP Compatibility: Seamlessly integrates with the MCP open ecosystem for standardized system connections
- AI-System Bridge: Delivers unified AI-driven interaction capabilities with external platforms
- End-to-End Development Flow: Connects the entire development lifecycle from coding to deployment
  ![mcp](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100039847436/ef4dafe5c45411f0a6dd5254005ef0f7.gif)

### 智能代码评审智能体 Intelligent Code Review Agent

支持代码批量评审，及时发现问题，并给出优化建议。自动生成commit message，规范开发流程

Supports batch code reviews, promptly identifies issues, and provides optimization suggestions. Automatically generates commit messages to standardize the development process.

![代码评审](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100039847436/60a0e708c44a11f09c26525400bf7822.gif)

### 支持自定义创建规则

支持创建用户规则和项目规则，通过给大模型提供上下文，从而规范大模型的行为。

Support creating user rules and project rules, providing context to the model to standardize its behavior.

![rules](https://write-document-release-1258344699.cos.ap-guangzhou.tencentcos.cn/100039847436/afd1a101c44f11f08c0e52540044a08e.gif)

## 开始使用 CodeBuddy Get Started with CodeBuddy

### 快速安装 Installation

打开你的IDE，在插件市场中搜索「腾讯云代码助手 CodeBuddy 」，下载安装与登陆即可。

Open your IDE, search for "Tencent Cloud Code Assistant CodeBuddy" in the plugin marketplace, then download, install, and log in.

- VSCode: 从插件市场中安装

- JetBrains: 从插件市场中安装

- 微信开发者工具：从插件市场中安装

- Visual Studio 2022：从插件市场中安装

- Xcode: 下载dmg安装包到 MacOS 本地安装

- VSCode: Install from the plugin marketplace

- JetBrains: Install from the plugin marketplace

- WeChat Developer Tools: Install from the plugin marketplace

- Visual Studio 2022: Install from the plugin marketplace

- Xcode: Download the DMG installation package for local installation on macOS

### 快速使用 Quick Start

#### 快捷键 Keyboard Shortcuts

| 功能 Function                                 | macOS  | Windows  |
| ------------------------------------------- | ------ | -------- |
| 触发代码补全<br>Trigger code completion           | Enter  | Enter    |
| 采纳所有推荐代码<br>Accept all suggested code       | Tab    | Tab      |
| 按行采纳推荐代码<br>Accept line-by-line             | ⌘ + ↓  | Ctrl + ↓ |
| 按词采纳推荐代码<br>Accept word-by-word             | ⌘ + →  | Ctrl + → |
| 添加到对话<br>Add to Chat                          | ctrl+cmd+i  | Ctrl + Alt + I  |
| 打开 AI 对话<br>Open AI Chat                      | ⌥ + I  | Alt + I  |
| 手动触发推荐<br>Manually trigger suggestion       | ⌥ + \\ | Alt + \\  |
| 撤销当前推荐状态<br>Cancel current suggestion       | Esc    | Esc      |

#### 快捷指令问答 Quick Command Q&A

在对话输入框中，输入 / 调用预置的快捷指令：

In the conversation input box, type / or @ to access preset quick commands:

- **/cr**：对本地所选代码进行代码审查；Perform code review on the selected local code.
- **/explain：** 解释所选代码的工作原理；Generates a detailed explanation of how the selected code works
- **/fix：** 针对所选代码中的问题提出修复方案；Analyzes selected code and proposes solutions for bugs, errors, or improvements
- **/tests：** 为所选代码生成单元测试；Generate unit tests for selected code
- **/generate rules：** 为当前项目生成项目规则；Generate project rules for the current project.
  
  

#### @ 符号 @ symbol

在对话输入框中，您可以输入 **@** 或直接点击输入框上方的 **@** 符号，为大模型提供上下文，提升模型响应的质量。

In the chat input box, you can type **@** or click the **@** icon above the input box to provide context to the model and improve response quality.

**File & Folders**：选择文件或文件夹作为对话上下文信息；Select files or folders to include as contextual information for the chat.

**Git**：引用当前未提交的文件变更；Reference current uncommitted file changes.

**Docs**：选择添加知识库作为对话上下文信息，包括官方知识库和自定义知识库；Add knowledge bases as chat context, including both official and custom knowledge bases.

**Terminal**：添加终端最后执行的命令作为对话上下文信息；Add the last executed terminal command as contextual information.

**Rules**：引用创建好的规则，约束大模型的行为；Reference created rules to constrain the model’s behavior.



#### 知识库列表

在对话输入框中，输入 @ 调用预置的知识库。知识库涵盖主流的代码仓库集合：

Type @ to access premium code knowledge bases:

##### 前端开发 Frontend Development

- #TDesign: TDesign 组件完整 API 文档

- #React: React 前端开发框架（支持最新版本）

- #Vue: Vue.js 前端开发框架

- #TDesign: TDesign Component API Reference

- #React: React Framework Documentation

- #Vue: Vue.js Frontend Framework Guide

##### 后端与AI框架 Backend Frameworks

- #SpringBoot: Spring 企业级开发框架

- #SpringAI: 基于 Spring 的 AI 应用开发框架

- #Langchain: Langchain AI 工具链开发套件

- #SpringBoot: Spring Development Framework

- #SpringAI: AI Application Framework for Spring

- #Langchain: Langchain-based AI Toolkit

##### 云原生与微信生态 Cloud Native & WeChat Ecosystem

- #云原生构建: 云原生构建（CNB）业务知识库

- #微信云开发: 微信云开发+云托管解决方案

- #微信小游戏: 微信小游戏开发文档

- #微信支付: 微信支付集成指南

- #CloudNativeBuild: Cloud Native Build Knowledge Base

- #WeChatCloud: WeChat Cloud Development + Cloud Run

- #WeChatMiniGames: WeChat Mini Games Documentation

- #WeChatPay: WeChat Payment Solutions

##### 腾讯云服务 Tencent Cloud Service API

- #腾讯云API: 腾讯云全系 API 文档

Tencent Cloud API: Tencent Cloud API References

##### 自定义知识 Customization

- #自定义知识库: 您的专属业务知识库

\#Custom: Your Private Knowledge Base

您可以通过[联系我们]推荐需要新增的代码库。
注：查询时请在命令前添加#符号（例如：#React useState用法示例）

You can recommend new code libraries through [Contact Us].
Note: Prefix commands with # to query specific knowledge bases (e.g., #React useState hook examples).

### 更多帮助 For more assistance

请访问腾讯云在线帮助文档 https://cloud.tencent.com/document/product/1749/105967

For more assistance, please visit the Tencent Cloud online documentation at:
https://cloud.tencent.com/document/product/1749/105967

### 数据隐私/安全性 Data Privacy & Security

您的代码是安全且属于您私有的财产，我们将根据隐私声明遵循负责任的做法，以确保您的代码片段不会被用于其他用户的建议回答，以及被训练。

Your code is secure and remains your private property. In accordance with our Privacy Policy, we follow responsible practices to ensure that your code snippets will not be used for model training or suggested to other users.

### 联系我们，获取最新动态 Contact Us for the Latest Updates

CodeBuddy 用户交流群: 欢迎随时和我们反馈问题，我们第一时间解决

CodeBuddy User Community: We welcome all users to join our official communication channel for real-time support and feedback!

<img src="https://cs-res-1258344699.file.myqcloud.com/ai/20240508_SaaS/group_gts_new.png" width="200" />

CodeBuddy 官方公众号 

<img src="https://cs-res-1258344699.file.myqcloud.com/ai/20240508_SaaS/qr-group.png" width="200" />
