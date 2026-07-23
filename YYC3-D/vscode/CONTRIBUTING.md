# 贡献 VS Code / Contributing to VS Code

<p align="center">
  <strong>
    <a href="#--欢迎贡献-cn"><b>简体中文 (默认)</b></a> &nbsp;|&nbsp;
    <a href="#-contributing-to-vs-code-en"><b>English</b></a>
  </strong>
</p>

---

<!-- ============================================================ -->
<!-- 🇨🇳 简体中文 (默认) / Simplified Chinese (Default) -->
<!-- ============================================================ -->

<a id="cn"></a>

## 欢迎贡献

欢迎并感谢你对 VS Code 贡献的兴趣！

除了编写代码之外，你还可以通过多种方式参与贡献。本文档旨在为你提供如何参与的高层概览。

## 提问

有问题？请不要直接开 Issue，而是前往 [Stack Overflow](https://stackoverflow.com/questions/tagged/visual-studio-code) 并使用标签 `visual-studio-code` 提问。

活跃的社区很乐意帮助你。一个表述清晰的问题也将成为其他搜索帮助者的宝贵资源。

## 反馈意见

欢迎提出你的评论和反馈，开发团队通过多种渠道保持开放沟通。

详情请参阅 [反馈渠道](https://github.com/microsoft/vscode/wiki/Feedback-Channels) Wiki 页面。

## 报告问题

你在 VS Code 中发现了可复现的问题吗？你有功能请求吗？我们非常希望收到以下信息！以下是有效报告 Issue 的方法。

### 确定报告位置

VS Code 项目分布在多个仓库中。请尽量在正确的仓库中提交 Issue。如果不确定哪个仓库正确，请查阅[相关项目](https://github.com/microsoft/vscode/wiki/Related-Projects)列表。

在[禁用所有扩展](https://code.visualstudio.com/docs/editor/extension-gallery#_disable-an-extension)后是否仍能复现该问题？如果你发现问题是由已安装的扩展引起的，请直接在该扩展的仓库中提交 Issue。

### 搜索已有 Issue

在创建新 Issue 前，请在[开放 Issue 列表](https://github.com/microsoft/vscode/issues)中搜索，确认该问题或功能请求是否已被提交。

请务必浏览[最热门的功能请求](https://github.com/microsoft/vscode/issues?q=is%3Aopen+is%3Aissue+label%3Afeature-request+sort%3Areactions-%2B1-desc)。

如果你发现你的问题已经存在，请发表相关评论并添加你的[反应](https://github.com/blog/2119-add-reactions-to-pull-requests-issues-and-comments)。用反应代替 "+1" 评论：

* 👍 - 支持
* 👎 - 反对

如果找不到描述你 Bug 或功能的现有 Issue，请按照以下指南创建新 Issue。

### 撰写高质量的 Bug 报告和功能请求

每个问题和功能请求只提交一个 Issue。不要在同一 Issue 中列举多个 Bug 或功能请求。

除非是完全相同的问题，否则不要将你的 Issue 作为评论添加到现有 Issue 上。许多问题看起来相似但原因不同。

提供的信息越详细，他人成功复现问题并找到修复方案的可能性就越高。

使用 VS Code 帮助菜单中的「Report Issue」内置工具可以简化此流程——它会自动提供 VS Code 版本、所有已安装扩展和系统信息。此外，该工具还会在现有 Issue 中搜索以确认是否已存在类似问题。

请在每个 Issue 中包含以下信息：

* VS Code 版本
* 操作系统
* 已安装的扩展列表
* 导致问题的可复现步骤（1... 2... 3...）
* 预期结果 vs 实际结果
* 展示问题发生的图片、动画或视频链接
* 演示问题的代码片段或开发者可以轻松拉取以本地复现的代码仓库链接
  * **注意：** 由于开发者需要复制和粘贴代码片段，将代码片段作为媒体文件（如 .gif）提供是不够的。
* 开发者工具控制台中的错误（从菜单打开：Help > Toggle Developer Tools）

### 创建 Pull Request

请参阅[创建 Pull Request](https://github.com/microsoft/vscode/wiki/How-to-Contribute#pull-requests)文章以及本项目贡献指南。

### 最终检查清单

请务必完成以下事项：

* [ ] 在 Issue 仓库中搜索，确保你的报告是新 Issue
* [ ] 禁用所有扩展后重新复现问题
* [ ] 简化问题周围的代码以更好地隔离问题

如果开发者无法立即复现问题也不必担心。他们只会要求更多信息！

### 跟踪你的 Issue

提交后，你的报告将进入 [Issue 跟踪](https://github.com/microsoft/vscode/wiki/Issue-Tracking)工作流。请了解后续流程，以便知道预期什么以及如何在整个过程中持续协助。

## 自动化 Issue 管理

我们使用 GitHub Actions 来辅助管理 Issues。这些 Actions 及其说明可以在[此处](https://github.com/microsoft/vscode-github-triage-actions)查看。这些 Actions 的一些示例：

* 自动关闭任何标记为 `info-needed` 且过去 7 天内无响应的 Issue
* Issue 关闭 45 天后自动锁定
* 自动执行 VS Code [功能请求流水线](https://github.com/microsoft/vscode/wiki/Issues-Triaging#managing-feature-requests)

如果你认为机器人处理有误请新开 Issue 并告知我们。

## 贡献修复

如果你有兴趣编写代码来修复问题，请参阅 Wiki 中的[如何贡献](https://github.com/microsoft/vscode/wiki/How-to-Contribute)文档。

## 致谢

无论大小，你对开源的贡献使这样的伟大项目成为可能。感谢你抽出时间做出贡献。

---

<!-- ============================================================ -->
<!-- 🇺🇸 English -->
<!-- ============================================================ -->

<a id="en"></a>

## Contributing to VS Code

Welcome, and thank you for your interest in contributing to VS Code!

There are several ways in which you can contribute, beyond writing code. The goal of this document is to provide a high-level overview of how you can get involved.

## Asking Questions

Have a question? Instead of opening an issue, please ask on [Stack Overflow](https://stackoverflow.com/questions/tagged/visual-studio-code) using the tag `visual-studio-code`.

The active community will be eager to assist you. Your well-worded question will serve as a resource to others searching for help.

## Providing Feedback

Your comments and feedback are welcome, and the development team is available via a handful of different channels.

See the [Feedback Channels](https://github.com/microsoft/vscode/wiki/Feedback-Channels) wiki page for details on how to share your thoughts.

## Reporting Issues

Have you identified a reproducible problem in VS Code? Do you have a feature request? We want to hear about it! Here's how you can report your issue as effectively as possible.

### Identify Where to Report

The VS Code project is distributed across multiple repositories. Try to file the issue against the correct repository. Check the list of [Related Projects](https://github.com/microsoft/vscode/wiki/Related-Projects) if you aren't sure which repo is correct.

Can you recreate the issue even after [disabling all extensions](https://code.visualstudio.com/docs/editor/extension-gallery#_disable-an-extension)? If you find the issue is caused by an extension you have installed, please file an issue on the extension's repo directly.

### Look For an Existing Issue

Before you create a new issue, please do a search in [open issues](https://github.com/microsoft/vscode/issues) to see if the issue or feature request has already been filed.

Be sure to scan through the [most popular](https://github.com/microsoft/vscode/issues?q=is%3Aopen+is%3Aissue+label%3Afeature-request+sort%3Areactions-%2B1-desc) feature requests.

If you find your issue already exists, make relevant comments and add your [reaction](https://github.com/blog/2119-add-reactions-to-pull-requests-issues-and-comments). Use a reaction in place of a "+1" comment:

* 👍 - upvote
* 👎 - downvote

If you cannot find an existing issue that describes your bug or feature, create a new issue using the guidelines below.

### Writing Good Bug Reports and Feature Requests

File a single issue per problem and feature request. Do not enumerate multiple bugs or feature requests in the same issue.

Do not add your issue as a comment to an existing issue unless it's for the identical issue. Many issues look similar but have different causes.

The more information you can provide, the more likely someone will be successful at reproducing the issue and finding a fix.

The built-in tool for reporting an issue, which you can access by using `Report Issue` in VS Code's Help menu, can help streamline this process by automatically providing the version of VS Code, all your installed extensions, and your system info. Additionally, the tool will search among existing issues to see if a similar issue already exists.

Please include the following with each issue:

* Version of VS Code
* Your operating system
* List of extensions that you have installed
* Reproducible steps (1... 2... 3...) that cause the issue
* What you expected to see, versus what you actually saw
* Images, animations, or a link to a video showing the issue occurring
* A code snippet that demonstrates the issue or a link to a code repository the developers can easily pull down to recreate the issue locally
  * **Note:** Because the developers need to copy and paste the code snippet, including a code snippet as a media file (i.e. .gif) is not sufficient.
* Errors from the Dev Tools Console (open from the menu: Help > Toggle Developer Tools)

### Creating Pull Requests

* Please refer to the article on [creating pull requests](https://github.com/microsoft/vscode/wiki/How-to-Contribute#pull-requests) and contributing to this project.

### Final Checklist

Please remember to do the following:

* [ ] Search the issue repository to ensure your report is a new issue
* [ ] Recreate the issue after disabling all extensions
* [ ] Simplify your code around the issue to better isolate the problem

Don't feel bad if the developers can't reproduce the issue right away. They will simply ask for more information!

### Follow Your Issue

Once submitted, your report will go into the [issue tracking](https://github.com/microsoft/vscode/wiki/Issue-Tracking) workflow. Be sure to understand what will happen next, so you know what to expect and how to continue to assist throughout the process.

## Automated Issue Management

We use GitHub Actions to help us manage issues. These Actions and their descriptions can be [viewed here](https://github.com/microsoft/vscode-github-triage-actions). Some examples of what these Actions do are:

* Automatically close any issue marked `info-needed` if there has been no response in the past 7 days.
* Automatically lock issues 45 days after they are closed.
* Automatically implement the VS Code [feature request pipeline](https://github.com/microsoft/vscode/wiki/Issues-Triaging#managing-feature-requests).

If you believe the bot got something wrong, please open a new issue and let us know.

## Contributing Fixes

If you are interested in writing code to fix issues, please see [How to Contribute](https://github.com/microsoft/vscode/wiki/How-to-Contribute) in the wiki.

## Thank You

Your contributions to open source, large or small, make great projects like this possible. Thank you for taking the time to contribute.
