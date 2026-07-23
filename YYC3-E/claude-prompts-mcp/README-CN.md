# Claude Prompts MCP Server

<div align="center">

<img src="assets/logo.png" alt="Claude Prompts MCP Server Logo" width="200" />

[![npm version](https://img.shields.io/npm/v/claude-prompts.svg?style=for-the-badge&logo=npm&color=0066cc)](https://www.npmjs.com/package/claude-prompts)
[![License: MIT](https://img.shields.io/badge/License-MIT-00ff88.svg?style=for-the-badge&logo=opensource)](https://opensource.org/licenses/MIT)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Compatible-ff6b35?style=for-the-badge&logo=anthropic)](https://modelcontextprotocol.io)

**为您的AI助手提供热重载提示词、结构化推理和链式工作流。专为Claude打造，可在任何地方工作。**

[快速开始](#快速开始) • [功能特性](#功能特性) • [语法参考](#语法参考) • [文档](#文档)

</div>

## 为什么使用

停止复制粘贴提示词。这个服务器将您的提示词库转变为可编程引擎。

- **版本控制** — 提示词是git中的Markdown文件。跟踪变更、查看差异、分支实验。
- **热重载** — 编辑模板，立即运行。无需重启。
- **结构化执行** — 不仅仅是文本。服务器解析运算符、注入方法论、强制执行质量检查、渲染最终提示词。

## 快速开始

MCP客户端会自动启动服务器——您只需配置并连接。

### 选项1：NPM（最快）

在您的`claude_desktop_config.json`中添加：

```json
{
  "mcpServers": {
    "claude-prompts": {
      "command": "npx",
      "args": ["-y", "claude-prompts@latest"]
    }
  }
}
```

重启Claude Desktop。使用以下命令测试：`prompt_manager(action: "list")`

**就是这样。** 客户端会处理其余工作。

---

### 选项1b：NPM使用自定义提示词

想要自己的提示词而不克隆仓库？创建一个工作区：

```bash
npx claude-prompts --init=~/my-prompts
```

这将创建一个带有入门提示词的工作区。然后将Claude Desktop指向它：

```json
{
  "mcpServers": {
    "claude-prompts": {
      "command": "npx",
      "args": ["-y", "claude-prompts@latest"],
      "env": {
        "MCP_WORKSPACE": "/home/YOUR_USERNAME/my-prompts"
      }
    }
  }
}
```

重启Claude Desktop。您的提示词现在支持热重载——直接编辑它们，或让Claude更新它们：

```text
用户: "让quick_review提示词也检查TypeScript错误"
Claude: prompt_manager(action:"update", id:"quick_review", ...)  # 自动更新
```

查看[服务器README](server/README.md#configuration)获取所有配置选项。

---

### 选项2：从源代码安装（用于自定义）

如果您想编辑提示词、创建自定义框架、检查或贡献，请克隆：

```bash
git clone https://github.com/minipuft/claude-prompts-mcp.git
cd claude-prompts-mcp/server
npm install && npm run build
```

然后配置Claude Desktop使用您的本地构建：

**Windows：**

```json
{
  "mcpServers": {
    "claude-prompts": {
      "command": "node",
      "args": ["C:\\path\\to\\claude-prompts-mcp\\server\\dist\\index.js"]
    }
  }
}
```

**Mac/Linux：**

```json
{
  "mcpServers": {
    "claude-prompts": {
      "command": "node",
      "args": ["/path/to/claude-prompts-mcp/server/dist/index.js"]
    }
  }
}
```

---

### 验证工作

重启Claude Desktop。在输入栏中，输入：

```text
prompt_manager list
```

## 工作原理

不是静态文件阅读器。它是一个带有反馈循环的**渲染管道**：

```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': {'background':'#0b1224','primaryColor':'#e2e8f0','primaryBorderColor':'#1f2937','primaryTextColor':'#0f172a','lineColor':'#94a3b8','fontFamily':'"DM Sans","Segoe UI",sans-serif','fontSize':'14px','edgeLabelBackground':'#0b1224'}}}%%
flowchart TB
    classDef actor fill:#0f172a,stroke:#cbd5e1,stroke-width:1.5px,color:#f8fafc;
    classDef server fill:#111827,stroke:#fbbf24,stroke-width:1.8px,color:#f8fafc;
    classDef process fill:#e2e8f0,stroke:#1f2937,stroke-width:1.6px,color:#0f172a;
    classDef client fill:#f4d0ff,stroke:#a855f7,stroke-width:1.6px,color:#2e1065;
    classDef clientbg fill:#1a0a24,stroke:#a855f7,stroke-width:1.8px,color:#f8fafc;
    classDef decision fill:#fef3c7,stroke:#f59e0b,stroke-width:1.6px,color:#78350f;

    linkStyle default stroke:#94a3b8,stroke-width:2px

    User["1. 用户发送命令"]:::actor
    Example[">>analyze @CAGEERF :: 'cite sources'"]:::actor
    User --> Example --> Parse

    subgraph Server["MCP Server"]
        direction TB
        Parse["2. 解析运算符"]:::process
        Inject["3. 注入框架 + 检查"]:::process
        Render["4. 渲染提示词"]:::process
        Decide{"6. 路由裁决"}:::decision
        Parse --> Inject --> Render
    end
    Server:::server

    subgraph Client["Claude (客户端)"]
        direction TB
        Execute["5. 运行提示词 + 检查"]:::client
    end
    Client:::clientbg

    Render -->|"带有检查标准的提示词"| Execute
    Execute -->|"裁决 + 输出"| Decide

    Decide -->|"PASS → 渲染下一步"| Render
    Decide -->|"FAIL → 渲染重试提示词"| Render
    Decide -->|"完成"| Result["7. 返回给用户"]:::actor
```

**反馈循环：**

1. **您发送**带有运算符的命令（`@framework`、`:: gates`、`-->` 链式）
2. **服务器解析**运算符并注入方法论指导 + 检查标准
3. **服务器返回**渲染后的提示词（检查会显示在底部作为自检说明）
4. **Claude执行**提示词并根据检查标准进行自我评估
5. **Claude响应**裁决结果（PASS/FAIL）及其输出
6. **服务器路由**：渲染下一个链式步骤（PASS）、渲染带有反馈的重试（FAIL）或返回最终结果（完成）

- **模板**：使用Nunjucks语法的Markdown文件（`{{var}}`）。
- **框架**：结构化思维模式（CAGEERF、ReACT、5W1H、SCAMPER），指导Claude如何思考问题。激活时，框架会注入：
  - **系统提示词指导**：逐步方法论说明
  - **方法论检查**：自动应用特定于框架阶段的质量检查
  - **工具覆盖**：上下文感知的工具描述，显示当前方法论状态
- **指导风格**：`server/prompts/guidance/`中的教学模板（`analytical`、`procedural`、`creative`、`reasoning`），用于塑造响应格式。
- **检查**：注入到提示词中的质量标准（例如，"必须引用来源"），供Claude自检。使用`:: criteria`内联或在`server/src/gates/definitions/`中定义。

> **注入控制**：使用修饰符覆盖默认值：`%guided`强制框架注入，`%clean`跳过所有指导，`%lean`只保留检查。在`config.json`中的`injection.system-prompt.frequency`下配置默认频率。有关详细信息，请参阅[MCP工具指南](docs/mcp-tools.md#understanding-framework-injection-frequency)。

## 功能特性

### 🔥 热重载

**问题**：提示词迭代缓慢。编辑文件 → 重启服务器 → 测试 → 重复。而且是您在调试提示词问题。

**解决方案**：服务器监视`server/prompts/*.md`的更改并立即重新加载。但真正的价值在于：**只需让Claude修复它**。当提示词表现不佳时，描述问题——Claude通过`prompt_manager`诊断并更新文件，您立即测试。无需手动编辑，无需重启。

```text
用户: "code_review提示词太冗长"
Claude: prompt_manager(action:"update", id:"code_review", ...)  # Claude修复它
用户: "测试它"
Claude: prompt_engine(command:">>code_review")                   # 立即运行更新后的版本
```

**期望**：Claude迭代提示词的速度比您快。您描述问题，Claude提出并应用修复，您验证。紧凑的反馈循环。

---

### 🔗 链式

**问题**：复杂任务需要多个推理步骤，但单个提示词试图一次完成所有任务。

**解决方案**：使用`-->`将工作分解为离散步骤。每个步骤的输出成为下一步的输入。在步骤之间添加质量检查。

```text
analyze code --> identify issues --> propose fixes --> generate tests
```

**期望**：服务器按顺序执行步骤，向前传递上下文。您可以看到每个步骤的输出，并在链式过程中出现问题时进行干预。

---

### 🧠 框架

**问题**：Claude的推理结构各不相同。有时很彻底，有时会跳过步骤。您想要一致、有条理的思考。

**解决方案**：框架将**思考方法论**注入系统提示词。LLM遵循定义的推理模式（例如，"首先收集上下文，然后分析，然后计划，然后执行"）。每个框架还会自动注入特定于其阶段的**质量检查**。

```text
@CAGEERF Review this architecture    # 注入结构化规划方法论
@ReACT Debug this error              # 注入迭代的原因-行动-观察循环
```

**期望**：Claude的响应遵循方法论的结构。您将在输出中看到标记的阶段。框架的检查会验证每个阶段是否正确完成。

---

### 🛡️ 检查

**问题**：Claude返回听起来合理的输出，但您需要满足特定标准——您希望Claude来验证这一点，而不是您自己。

**解决方案**：检查将**质量标准**注入提示词。Claude根据这些标准进行自我评估并报告PASS/FAIL及推理。失败的检查会触发重试或阻止链式。

```text
Summarize this document :: 'must be under 200 words' :: 'must include key statistics'
```

**期望**：Claude的响应包括自我评估部分。如果不满足标准，服务器可以自动重试并提供反馈或暂停等待您的决定。

---

### ✨ 智能选择

**问题**：您有多个可用的框架、样式和检查——但不确定哪种组合适合您的任务。

**解决方案**：`%judge`向Claude展示您的可用资源。Claude分析您的任务并推荐（或自动应用）最佳组合。

```text
%judge Help me refactor this legacy codebase
```

**期望**：Claude返回带有建议的资源菜单，然后使用所选运算符进行后续调用。

## 使用检查

检查将质量标准注入提示词。Claude自我检查并报告PASS/FAIL。

**内联——快速自然语言检查：**

```text
Help me refactor this function :: 'keep it under 20 lines' :: 'add error handling'
```

**带框架——方法论 + 自动检查：**

```text
@CAGEERF Explain React hooks :: 'include practical examples'
```

> 框架会自动注入其阶段特定的检查。您的内联检查（`:: 'include practical examples'`）会叠加在上面。

**链式——步骤之间的质量检查：**

```text
Research the topic :: 'use recent sources' --> Summarize findings :: 'be concise' --> Create action items
```

| 检查格式 | 语法                            | 用例                              |
| -------- | ------------------------------- | --------------------------------- |
| **内联** | `:: 'criteria text'`            | 快速检查，可读命令                |
| **命名** | `:: {name, description}`        | 具有明确意图的可重用检查          |
| **完整** | `:: {name, criteria[], guidance}` | 复杂验证，多个标准              |

**结构化检查（程序化）：**

```javascript
prompt_engine({
  command: ">>code_review",
  gates: [
    {
      name: "Security Check",
      criteria: ["No hardcoded secrets", "Input validation on user data"],
      guidance: "Flag vulnerabilities with severity ratings",
    },
  ],
});
```

有关完整的检查架构，请参阅[检查](docs/gates.md)。

## 语法参考

`prompt_engine`使用符号运算符来组合工作流：

| 符号 | 名称          | 功能描述                                         |
| :--- | :------------ | :----------------------------------------------- |
|  `>>`  | **提示词**    | 按ID执行模板（`>>code_review`）                  |
| `-->`  | **链式**     | 将输出传递到下一步（`step1 --> step2`）          |
|  `@`   | **框架**     | 注入方法论 + 自动检查（`@CAGEERF`）              |
|  `::`  | **检查**      | 添加质量标准（`:: 'cite sources'`）               |
|  `%`   | **修饰符**    | 切换执行模式（`%clean`、`%lean`、`%judge`）      |
|  `#`   | **风格**      | 应用语气/角色预设（`#analytical`）                |

**修饰符解释：**

- `%clean` — 跳过所有框架/检查注入（仅原始模板）
- `%lean` — 跳过框架指导，只保留检查
- `%guided` — 即使频率设置禁用，也要强制框架注入
- `%judge` — Claude分析任务并自动选择最佳资源

## 高级功能

### 检查重试与执行

服务器自动管理检查失败：

- **重试限制**：失败的检查最多重试2次（可配置），然后暂停等待输入。
- **执行模式**：
  - `blocking` — 必须通过才能继续（关键/高严重性检查）
  - `advisory` — 记录警告，无论如何继续（中/低严重性）
- **用户选择**：重试耗尽时，响应`retry`、`skip`或`abort`。

### 示例

**1. 智能驱动选择（两调用模式）**
不确定使用哪种风格、框架或检查？让Claude分析并决定。

```bash
# 阶段1：获取资源菜单
prompt_engine(command:"%judge >>code_review")
# Claude查看可用选项并分析您的任务

# 阶段2：Claude使用选择进行回调
prompt_engine(command:">>code_review @CAGEERF :: security_review #style(analytical)")
```

_`%judge`修饰符返回资源菜单。Claude分析任务，选择适当的资源，并使用内联运算符进行后续调用。_

**2. 链式推理**
每个阶段都有质量检查的多步骤工作流：

```text
Research AI trends :: 'use 2024 sources' --> Analyze implications --> Write executive summary :: 'keep under 500 words'
```

**3. 迭代提示词优化**
发现提示词有问题？让Claude修复它——更改立即生效：

```text
User: "The code_review prompt is too verbose, make it more concise"
Claude: prompt_manager(action:"update", id:"code_review", ...)

User: "Now test it"
Claude: prompt_engine(command:">>code_review")
# Uses the updated prompt instantly—no restart needed
```

这个反馈循环让您能够在发现边缘情况时持续改进提示词。

## 配置

通过`server/config.json`自定义行为。无需重建——只需重启。

| 部分          | 设置                           | 默认值                         | 描述                                                                             |
| :----------- | :---------------------------- | :--------------------------- | :-------------------------------------------------------------------------------- |
| `prompts`    | `file`                        | `prompts/promptsConfig.json` | 定义提示词类别和导入路径的主配置。                                               |
| `prompts`    | `registerWithMcp`             | `true`                       | 向Claude客户端公开提示词。设置为`false`进入内部使用模式。                         |
| `frameworks` | `enableSystemPromptInjection` | `true`                       | 自动将方法论指导（CAGEERF等）注入系统提示词。                                     |
| `gates`      | `definitionsDirectory`        | `src/gates/definitions`      | 自定义质量检查定义的路径（JSON）。                                               |
| `judge`      | `enabled`                     | `true`                       | 启用内置的智能阶段（`%judge`），显示框架/风格/检查选项。                         |

### 注入目标模式（高级）

默认情况下，框架指导会在步骤执行和检查审查时注入。要自定义**注入位置**，在配置中添加`injection`部分：

```json
{
  "injection": {
    "system-prompt": { "enabled": true, "target": "steps" },
    "gate-guidance": { "enabled": true, "target": "gates" }
  }
}
```

| 目标    | 行为                                   |
| :------ | :------------------------------------- |
| `both`  | 在步骤和检查审查时注入（默认）         |
| `steps` | 仅在正常步骤执行期间注入               |
| `gates` | 仅在检查审查步骤期间注入               |

适用于：`system-prompt`、`gate-guidance`、`style-guidance`

## 文档

- [架构](docs/architecture.md) — 执行管道深入解析
- [工具指南](docs/mcp-tools.md) — 完整命令参考
- [创作指南](docs/prompt-authoring-guide.md) — 创建模板和检查
- [链式](docs/chains.md) — 多步骤工作流
- [检查](docs/gates.md) — 质量验证

## 贡献

请参阅[CONTRIBUTING.md](CONTRIBUTING.md)。

```bash
cd server
npm run test        # 运行Jest测试
npm run typecheck   # 验证类型
npm run validate:all # 完整CI检查
```

## 许可证

[MIT](LICENSE)
