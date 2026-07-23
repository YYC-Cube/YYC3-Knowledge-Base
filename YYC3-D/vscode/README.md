# Visual Studio Code - 开源版 ("Code - OSS") / Open Source

<p align="center">
  <strong>
    <a href="#--项目概览-cn"><b>简体中文 (默认)</b></a> &nbsp;|&nbsp;
    <a href="#-the-repository-en"><b>English</b></a>
  </strong>
</p>

[![Feature Requests](https://img.shields.io/github/issues/microsoft/vscode/feature-request.svg)](https://github.com/microsoft/vscode/issues?q=is%3Aopen+is%3Aissue+label%3Afeature-request+sort%3Areactions-%2B1-desc)
[![Bugs](https://img.shields.io/github/issues/microsoft/vscode/bug.svg)](https://github.com/microsoft/vscode/issues?utf8=✓&q=is%3Aissue+is%3Aopen+label%3Abug)
[![Gitter](https://img.shields.io/badge/chat-on%20gitter-yellow.svg)](https://gitter.im/Microsoft/vscode)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/microsoft/vscode/blob/main/LICENSE.txt)

---

<!-- ============================================================ -->
<!-- 🇨🇳 简体中文 (默认) / Simplified Chinese (Default) -->
<!-- ============================================================ -->

<a id="cn"></a>

## 📖 项目概览

本仓库（"`Code - OSS`"）是微软与社区共同开发 [Visual Studio Code](https://code.visualstudio.com) 产品的核心基地。我们不仅在此协作编写代码和修复问题，还公开发布[路线图](https://github.com/microsoft/vscode/wiki/Roadmap)、[月度迭代计划](https://github.com/microsoft/vscode/wiki/Iteration-Plans)以及[终极目标规划](https://github.com/microsoft/vscode/wiki/Running-the-Endgame)。所有源代码基于标准 [MIT 许可证](https://github.com/microsoft/vscode/blob/main/LICENSE.txt) 向公众开放。

### 技术栈一览

| 维度 | 技术选型 |
|------|----------|
| **主语言** | TypeScript (ESNext) |
| **桌面运行时** | Electron |
| **CLI 工具** | Rust (Cargo) |
| **构建系统** | Gulp 4 + Esbuild + Rspack + Vite |
| **包管理** | pnpm + Cargo |
| **测试框架** | Mocha + Playwright |
| **CI/CD** | GitHub Actions |

### 架构分层

```
src/vs/
├── base/        → 基础工具库与跨平台抽象
├── platform/    → 平台服务与依赖注入基础设施
├── editor/      → 文本编辑器实现 (Monaco)
├── workbench/   → 主工作台 (Web + Desktop UI)
├── code/        → Electron 主进程
├── server/      → 远程服务器实现
└── sessions/    → Agent 会话窗口 (智能体工作流层)
```

## Visual Studio Code

<p align="center">
  <img alt="VS Code 运行截图" src="https://github.com/user-attachments/assets/56af271c-949d-454c-a3ea-16188c063414">
</p>

[Visual Studio Code](https://code.visualstudio.com) 是基于 `Code - OSS` 仓库并加入微软特定定制功能的发行版本，采用传统的 [Microsoft 产品许可证](https://code.visualstudio.com/License/) 发布。

VS Code 将代码编辑器的简洁性与开发者核心「编辑-构建-调试」周期所需的功能完美结合。它提供全面的代码编辑、导航和智能理解支持，同时具备轻量级调试、丰富的扩展模型以及与现有工具的轻量级集成能力。

VS Code 每月更新，持续带来新功能与问题修复。你可以在 [VS Code 官网](https://code.visualstudio.com/Download) 下载适用于 Windows、macOS 和 Linux 的版本。如需每日获取最新版本，请安装 [Insiders 构建](https://code.visualstudio.com/insiders)。

## 贡献指南

参与本项目的方式多种多样，例如：

* 提交 [Bug 和功能请求](https://github.com/microsoft/vscode/issues)，并协助验证修复结果
* 审查[源代码变更](https://github.com/microsoft/vscode/pulls)
* 审阅[文档](https://github.com/microsoft/vscode-docs) 并提交 Pull Request（从错别字修正到新内容均可）

如果你有兴趣直接修复问题并为代码库做贡献，请参阅[如何贡献](https://github.com/microsoft/vscode/wiki/How-to-Contribute)文档，内容涵盖：

* [如何从源码构建和运行](https://github.com/microsoft/vscode/wiki/How-to-Contribute)
* [开发工作流（含调试和测试）](https://github.com/microsoft/vscode/wiki/How-to-Contribute#debugging)
* [编码规范](https://github.com/microsoft/vscode/wiki/Coding-Guidelines)
* [提交 Pull Request](https://github.com/microsoft/vscode/wiki/How-to-Contribute#pull-requests)
* [寻找可处理的 Issue](https://github.com/microsoft/vscode/wiki/How-to-Contribute#where-to-contribute)
* [参与翻译贡献](https://aka.ms/vscodeloc)

## 反馈渠道

* 在 [Stack Overflow](https://stackoverflow.com/questions/tagged/vscode) 提问
* [申请新功能](CONTRIBUTING.md)
* 为[热门功能请求](https://github.com/microsoft/vscode/issues?q=is%3Aopen+is%3Aissue+label%3Afeature-request+sort%3Areactions-%2B1-desc)投票
* [提交 Issue](https://github.com/microsoft/vscode/issues)
* 在 [GitHub Discussions](https://github.com/microsoft/vscode-discussions/discussions) 或 [Slack](https://aka.ms/vscode-dev-community) 与扩展作者社区交流
* 关注 [@code](https://x.com/code) 分享你的想法！

访问我们的 [Wiki](https://github.com/microsoft/vscode/wiki/Feedback-Channels) 了解各渠道详细说明及其他社区驱动渠道信息。

## 相关项目

VS Code 的许多核心组件和扩展托管在 GitHub 上的独立仓库中。例如，[Node.js 调试适配器](https://github.com/microsoft/vscode-node-debug) 和 [Mono 调试适配器](https://github.com/microsoft/vscode-mono-debug) 就是相互独立的仓库。完整列表请访问 Wiki 上的[相关项目](https://github.com/microsoft/vscode/wiki/Related-Projects)页面。

## 内置扩展

VS Code 在 [extensions](extensions) 目录下包含一组内置扩展，涵盖多种语言的语法高亮和代码片段。为某语言提供丰富语言支持（内联建议、跳转定义等）的扩展以 `language-features` 为后缀。例如，`json` 扩展提供 JSON 语法着色，而 `json-language-features` 扩展则提供 JSON 的丰富语言支持。

## 开发容器

本仓库包含 Visual Studio Code Dev Containers / GitHub Codespaces 开发环境配置。

* 对于 [Dev Containers](https://aka.ms/vscode-remote/download/containers)，使用 **Dev Containers: Clone Repository in Container Volume...** 命令，该命令会在 Docker 卷中创建项目以获得更佳的磁盘 I/O 性能（尤其适用于 macOS 和 Windows）。
  * 如果已安装 VS Code 和 Docker，也可以点击[此处](https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/microsoft/vscode)快速启动。这将自动安装 Dev Containers 扩展（如需要）、将源码克隆到容器卷并启动开发容器。

* 对于 Codespaces，在 VS Code 中安装 [GitHub Codespaces](https://marketplace.visualstudio.com/items?itemName=GitHub.codespaces) 扩展，然后使用 **Codespaces: Create New Codespace** 命令。

Docker / Codespace 至少需要 **4 核心和 6 GB 内存（推荐 8 GB）** 才能完成完整构建。更多信息请参阅[开发容器说明](.devcontainer/README.md)。

## 行为准则

本项目遵循 [Microsoft 开源行为准则](https://opensource.microsoft.com/codeofconduct/)。更多信息请参阅[行为准则常见问题](https://opensource.microsoft.com/codeofconduct/faq/)或通过 [opencode@microsoft.com](mailto:opencode@microsoft.com) 联系我们。

## 许可证

Copyright (c) Microsoft Corporation. All rights reserved.

基于 [MIT](LICENSE.txt) 许可证授权。

---

<!-- ============================================================ -->
<!-- 🇺🇸 English -->
<!-- ============================================================ -->

<a id="en"></a>

## The Repository

This repository ("`Code - OSS`") is where we (Microsoft) develop the [Visual Studio Code](https://code.visualstudio.com) product together with the community. Not only do we work on code and issues here, but we also publish our [roadmap](https://github.com/microsoft/vscode/wiki/Roadmap), [monthly iteration plans](https://github.com/microsoft/vscode/wiki/Iteration-Plans), and our [endgame plans](https://github.com/microsoft/vscode/wiki/Running-the-Endgame). This source code is available to everyone under the standard [MIT license](https://github.com/microsoft/vscode/blob/main/LICENSE.txt).

### Tech Stack Overview

| Dimension | Technology |
|-----------|------------|
| **Primary Language** | TypeScript (ESNext) |
| **Desktop Runtime** | Electron |
| **CLI Tool** | Rust (Cargo) |
| **Build System** | Gulp 4 + Esbuild + Rspack + Vite |
| **Package Manager** | pnpm + Cargo |
| **Test Framework** | Mocha + Playwright |
| **CI/CD** | GitHub Actions |

### Architecture Layers

```
src/vs/
├── base/        → Foundation utilities and cross-platform abstractions
├── platform/    → Platform services and dependency injection infrastructure
├── editor/      → Text editor implementation (Monaco)
├── workbench/   → Main workbench (Web + Desktop UI)
├── code/        → Electron main process
├── server/      → Remote server implementation
└── sessions/    → Agent sessions window (agentic workflow layer)
```

## Visual Studio Code

<p align="center">
  <img alt="VS Code in action" src="https://github.com/user-attachments/assets/56af271c-949d-454c-a3ea-16188c063414">
</p>

[Visual Studio Code](https://code.visualstudio.com) is a distribution of the `Code - OSS` repository with Microsoft-specific customizations released under a traditional [Microsoft product license](https://code.visualstudio.com/License/).

[Visual Studio Code](https://code.visualstudio.com) combines the simplicity of a code editor with what developers need for their core edit-build-debug cycle. It provides comprehensive code editing, navigation, and understanding support along with lightweight debugging, a rich extensibility model, and lightweight integration with existing tools.

Visual Studio Code is updated monthly with new features and bug fixes. You can download it for Windows, macOS, and Linux on [Visual Studio Code's website](https://code.visualstudio.com/Download). To get the latest releases every day, install the [Insiders build](https://code.visualstudio.com/insiders).

## Contributing

There are many ways in which you can participate in this project, for example:

* [Submit bugs and feature requests](https://github.com/microsoft/vscode/issues), and help us verify as they are checked in
* Review [source code changes](https://github.com/microsoft/vscode/pulls)
* Review the [documentation](https://github.com/microsoft/vscode-docs) and make pull requests for anything from typos to new content.

If you are interested in fixing issues and contributing directly to the code base,
please see the document [How to Contribute](https://github.com/microsoft/vscode/wiki/How-to-Contribute), which covers the following:

* [How to build and run from source](https://github.com/microsoft/vscode/wiki/How-to-Contribute)
* [The development workflow, including debugging and running tests](https://github.com/microsoft/vscode/wiki/How-to-Contribute#debugging)
* [Coding guidelines](https://github.com/microsoft/vscode/wiki/Coding-Guidelines)
* [Submitting pull requests](https://github.com/microsoft/vscode/wiki/How-to-Contribute#pull-requests)
* [Finding an issue to work on](https://github.com/microsoft/vscode/wiki/How-to-Contribute#where-to-contribute)
* [Contributing to translations](https://aka.ms/vscodeloc)

## Feedback

* Ask a question on [Stack Overflow](https://stackoverflow.com/questions/tagged/vscode)
* [Request a new feature](CONTRIBUTING.md)
* Upvote [popular feature requests](https://github.com/microsoft/vscode/issues?q=is%3Aopen+is%3Aissue+label%3Afeature-request+sort%3Areactions-%2B1-desc)
* [File an issue](https://github.com/microsoft/vscode/issues)
* Connect with the extension author community on [GitHub Discussions](https://github.com/microsoft/vscode-discussions/discussions) or [Slack](https://aka.ms/vscode-dev-community)
* Follow [@code](https://x.com/code) and let us know what you think!

See our [wiki](https://github.com/microsoft/vscode/wiki/Feedback-Channels) for a description of each of these channels and information on some other available community-driven channels.

## Related Projects

Many of the core components and extensions to VS Code live in their own repositories on GitHub. For example, the [node debug adapter](https://github.com/microsoft/vscode-node-debug) and the [mono debug adapter](https://github.com/microsoft/vscode-mono-debug) repositories are separate from each other. For a complete list, please visit the [Related Projects](https://github.com/microsoft/vscode/wiki/Related-Projects) page on our [wiki](https://github.com/microsoft/vscode/wiki).

## Bundled Extensions

VS Code includes a set of built-in extensions located in the [extensions](extensions) folder, including grammars and snippets for many languages. Extensions that provide rich language support (inline suggestions, Go to Definition) for a language have the suffix `language-features`. For example, the `json` extension provides coloring for `JSON` and the `json-language-features` extension provides rich language support for `JSON`.

## Development Container

This repository includes a Visual Studio Code Dev Containers / GitHub Codespaces development container.

* For [Dev Containers](https://aka.ms/vscode-remote/download/containers), use the **Dev Containers: Clone Repository in Container Volume...** command which creates a Docker volume for better disk I/O on macOS and Windows.
  * If you already have VS Code and Docker installed, you can also click [here](https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/microsoft/vscode) to get started. This will cause VS Code to automatically install the Dev Containers extension if needed, clone the source code into a container volume, and spin up a dev container for use.

* For Codespaces, install the [GitHub Codespaces](https://marketplace.visualstudio.com/items?itemName=GitHub.codespaces) extension in VS Code, and use the **Codespaces: Create New Codespace** command.

Docker / the Codespace should have at least **4 cores and 6 GB of RAM (8 GB recommended)** to run a full build. See the [development container README](.devcontainer/README.md) for more information.

## Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## License

Copyright (c) Microsoft Corporation. All rights reserved.

Licensed under the [MIT](LICENSE.txt) license.
