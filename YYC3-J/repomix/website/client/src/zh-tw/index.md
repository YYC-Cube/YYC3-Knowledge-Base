---
layout: home
title: Repomix
titleTemplate: 將程式碼庫打包成AI友好的格式
aside: false
editLink: false

features:
  - icon: 🤖
    title: AI 優化
    details: 以 AI 易於理解和處理的方式格式化程式碼庫。

  - icon: ⚙️
    title: Git 感知
    details: 自動識別並尊重您的 .gitignore 文件。

  - icon: 🛡️
    title: 注重安全
    details: 集成 Secretlint 進行強大的安全檢查，檢測並防止敏感信息的洩露。

  - icon: 📊
    title: 令牌計數
    details: 提供每個文件和整個程式碼庫的令牌計數，便於控制 LLM 上下文限制。

---

<script setup>
import YouTubeVideo from '../../components/YouTubeVideo.vue'
import { VIDEO_IDS } from '../../utils/videos'
</script>

<div class="cli-section">

<br>
<!--@include: ../shared/sponsors-section.md-->

## 🏆 開源獎項提名

我們深感榮幸！Repomix 已被提名為 [JSNation Open Source Awards 2025](https://osawards.com/javascript/) 的 **Powered by AI** 類別獎項。

這一切都離不開所有使用和支持 Repomix 的用戶。謝謝大家！

## 什麼是 Repomix？

Repomix 是一個強大的工具，可以將您的整個程式碼庫打包到一個 AI 友好的檔案中。無論您是在進行程式碼審查、重構，還是需要 AI 協助您的專案，Repomix 都可以輕鬆地與 AI 工具共享您的整個儲存庫上下文。

<YouTubeVideo :videoId="VIDEO_IDS.REPOMIX_DEMO" />

## 快速開始

使用 Repomix 生成打包文件（`repomix-output.xml`）後，您可以將其發送給 AI 助手（如 ChatGPT、Claude），並附上這樣的提示：

```
此文件包含了倉庫中所有文件的合併內容。
我想重構程式碼，請先幫我審查一下。
```

AI 將分析您的整個程式碼庫並提供全面的見解：

![Repomix 使用示例1](/images/docs/repomix-file-usage-1.png)

在討論具體修改時，AI 可以幫助生成程式碼。通過像 Claude 的 Artifacts 這樣的功能，您甚至可以一次性接收多個相互依賴的文件：

![Repomix 使用示例2](/images/docs/repomix-file-usage-2.png)

祝您編碼愉快！🚀

## 為什麼選擇 Repomix？

Repomix的強項在於可以與ChatGPT、Claude、Gemini、Grok等訂閱服務配合使用而無需擔心成本，同時提供完整的程式碼庫上下文，消除了檔案探索的需要——使分析更快速，往往也更準確。

透過將整個程式碼庫作為上下文，Repomix支援廣泛的應用場景，包括實作規劃、錯誤調查、第三方函式庫安全檢查、文件生成等等。

## 使用 CLI 工具 {#using-the-cli-tool}

Repomix 可以作為命令行工具使用，提供強大的功能和自定義選項。

**CLI 工具可以訪問私有倉庫**，因為它使用您本地安裝的 Git。

### 快速上手

您可以在專案目錄中無需安裝即可立即嘗試 Repomix：

```bash
npx repomix@latest
```

或者全局安裝以便重複使用：

```bash
# 使用 npm 安裝
npm install -g repomix

# 或使用 yarn 安裝
yarn global add repomix

# 或使用 bun 安裝
bun add -g repomix

# 或使用 Homebrew 安裝（macOS/Linux）
brew install repomix

# 然後在任意專案目錄中運行
repomix
```

就是這麼簡單！Repomix 將在您的當前目錄中生成一個 `repomix-output.xml` 文件，其中包含了以 AI 友好格式整理的整個程式碼庫。



### 基本用法

打包整個程式碼庫：

```bash
repomix
```

打包特定目錄：

```bash
repomix path/to/directory
```

使用 [glob 模式](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax)打包特定文件：

```bash
repomix --include "src/**/*.ts,**/*.md"
```

排除特定文件：

```bash
repomix --ignore "**/*.log,tmp/"
```

處理遠端倉庫：
```bash
# 使用簡寫格式
npx repomix --remote yamadashy/repomix

# 使用完整 URL（支援分支和特定路徑）
npx repomix --remote https://github.com/yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix/tree/main

# 使用提交 URL
npx repomix --remote https://github.com/yamadashy/repomix/commit/836abcd7335137228ad77feb28655d85712680f1
```

初始化配置文件（`repomix.config.json`）：

```bash
repomix --init
```

生成打包文件後，您可以將其用於 Claude、ChatGPT、Gemini 等生成式 AI 工具。

#### Docker 使用方法

您也可以使用 Docker 運行 Repomix 🐳  
如果您想在隔離環境中運行 Repomix 或更偏好使用容器，這是一個很好的選擇。

基本用法（當前目錄）：

```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix
```

打包特定目錄：
```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory
```

處理遠端倉庫並輸出到 `output` 目錄：

```bash
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote https://github.com/yamadashy/repomix
```

### 輸出格式

選擇您偏好的輸出格式：

```bash
# XML 格式（預設）
repomix --style xml

# Markdown 格式
repomix --style markdown

# JSON 格式
repomix --style json

# 純文字格式
repomix --style plain
```

### 自定義設置

創建 `repomix.config.json` 進行持久化設置：

```json
{
  "output": {
    "style": "markdown",
    "filePath": "custom-output.md",
    "removeComments": true,
    "showLineNumbers": true,
    "topFilesLength": 10
  },
  "ignore": {
    "customPatterns": ["*.test.ts", "docs/**"]
  }
}
```

## 真實世界使用案例

### [LLM 程式碼生成工作流程](https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/)

一位開發者分享了他們如何使用 Repomix 從現有程式碼庫中提取程式碼上下文，然後與 Claude 和 Aider 等 LLM 一起利用該上下文進行漸進式改進、程式碼審查和自動化文件生成。

### [為 LLM 建立知識資料包](https://lethain.com/competitive-advantage-author-llms/)

作者正在使用 Repomix 將他們的書面內容——部落格、文件和書籍——封裝為 LLM 相容格式，使讀者能夠透過 AI 驅動的問答系統與他們的專業知識進行互動。

[探索更多使用案例 →](./guide/use-cases)

## 進階使用者指南

Repomix 為進階使用案例提供強大的功能。以下是進階使用者的一些重要指南：

- **[MCP 伺服器](./guide/mcp-server)** - AI 助理的 Model Context Protocol 整合
- **[GitHub Actions](./guide/github-actions)** - 在 CI/CD 工作流程中自動化程式碼庫封裝
- **[程式碼壓縮](./guide/code-compress)** - 基於 Tree-sitter 的智慧壓縮（約 70% 令牌減少）
- **[作為函式庫使用](./guide/development/using-repomix-as-a-library)** - 將 Repomix 整合到您的 Node.js 應用程式中
- **[自訂指令](./guide/custom-instructions)** - 為輸出新增自訂提示和指令
- **[安全功能](./guide/security)** - 內建 Secretlint 整合和安全檢查
- **[最佳實務](./guide/tips/best-practices)** - 使用經過驗證的策略最佳化您的 AI 工作流程

### 更多示例
::: tip 需要更多幫助？ 💡
查看我們的[使用指南](./guide/)獲取詳細說明，或訪問[GitHub 倉庫](https://github.com/yamadashy/repomix)獲取更多示例和原始碼。
:::

</div>
