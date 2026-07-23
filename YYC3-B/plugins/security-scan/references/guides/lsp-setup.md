# LSP 配置（共享片段）

> 引用方：commands/project.md、commands/diff.md

## 语言检测

通过 Glob 检查 `{pom.xml,build.gradle*,package.json,tsconfig.json,go.mod,requirements.txt,pyproject.toml,setup.py,Cargo.toml,*.sln,*.csproj,Package.swift,CMakeLists.txt,composer.json}`。

回退策略：`**/*.{c,cpp,h,hpp}` 和 `**/*.lua`（取匹配数较多的一个）。

| 标记文件 | 语言 | 说明 |
|---|---|---|
| `pom.xml`, `build.gradle*` | Java | LSP 仅支持 `.java`，不支持 Kotlin `.kt` |
| `package.json`, `tsconfig.json` | JavaScript/TypeScript | LSP 支持 `.ts .tsx .js .jsx .mts .cts .mjs .cjs` |
| `go.mod` | Go | LSP 支持 `.go` |
| `requirements.txt`, `pyproject.toml`, `setup.py` | Python | LSP 支持 `.py .pyi` |
| `Cargo.toml` | Rust | LSP 支持 `.rs` |
| `*.sln`, `*.csproj` | C# | LSP 支持 `.cs` |
| `Package.swift` | Swift | LSP 支持 `.swift` |
| `CMakeLists.txt` | C/C++ | LSP 支持 `.c .h .cpp .cc .cxx .hpp .hxx .C .H` |
| `composer.json` | PHP | LSP 支持 `.php` |

> **Lua 说明**：Lua 无标准项目标记文件，通过回退策略 `**/*.lua` 识别（见上方"回退策略"）。LSP 支持 `.lua`。

### 文件类型优先级映射

语言检测完成后，按以下优先级选取探活文件。优先使用 LSP 支持最稳定的文件类型：

| 语言 | 探活文件类型优先级（从高到低） | 来源 |
|---|---|---|
| JS/TS | `.ts` → `.tsx` → `.js` → `.jsx` → `.mts` → `.cts` → `.mjs` → `.cjs` | typescript-lsp/.lsp.json |
| Java | `.java` | jdtls-lsp/.lsp.json |
| Go | `.go` | gopls-lsp/.lsp.json |
| Python | `.py` → `.pyi` | pyright-lsp/.lsp.json |
| Rust | `.rs` | rust-analyzer-lsp/.lsp.json |
| C# | `.cs` | csharp-lsp/.lsp.json |
| Swift | `.swift` | swift-lsp/.lsp.json |
| C/C++ | `.c` → `.cpp` → `.cc` → `.cxx` → `.h` → `.hpp` → `.hxx` | clangd-lsp/.lsp.json |
| PHP | `.php` | php-lsp/.lsp.json |
| Lua | `.lua` | lua-lsp/.lsp.json |

> **维护提示**：此表数据来源于各 LSP 插件的 `.lsp.json` 中 `extensionToLanguage` 字段。
> 当 CodeBuddy 新增 LSP 插件时，需同步更新此表。
> 校验方法：`Read $marketplace/plugins/{name}-lsp/.lsp.json` 提取 extensionToLanguage 的 key 列表。

## LSP 插件完整清单

> 以下为 `codebuddy-plugins-official` marketplace 中全部 10 个 LSP 插件，基于各插件 `.lsp.json` 和 `.codebuddy-plugin/plugin.json` 的实际配置。

| # | 语言 | 插件名称 | 二进制文件 | 启动参数 | 已注册文件扩展名 | 二进制安装命令 |
|---|---|---|---|---|---|---|
| 1 | Java | `jdtls-lsp` | `jdtls` | _(无)_ | `.java` | `brew install jdtls` |
| 2 | JS/TS | `typescript-lsp` | `typescript-language-server` | `--stdio` | `.ts .tsx .js .jsx .mts .cts .mjs .cjs` | `npm i -g typescript-language-server typescript` |
| 3 | Go | `gopls-lsp` | `gopls` | `serve` | `.go` | `go install golang.org/x/tools/gopls@latest` |
| 4 | Python | `pyright-lsp` | `pyright-langserver` | `--stdio` | `.py .pyi` | `pip install pyright` |
| 5 | Rust | `rust-analyzer-lsp` | `rust-analyzer` | _(无)_ | `.rs` | `rustup component add rust-analyzer` |
| 6 | C# | `csharp-lsp` | `csharp-ls` | _(无)_ | `.cs` | `dotnet tool install --global csharp-ls` |
| 7 | Swift | `swift-lsp` | `sourcekit-lsp` | _(无)_ | `.swift` | Xcode 内置 |
| 8 | C/C++ | `clangd-lsp` | `clangd` | _(无)_ | `.c .h .cpp .cc .cxx .hpp .hxx .C .H` | `brew install llvm` |
| 9 | PHP | `php-lsp` | `intelephense` | `--stdio` | `.php` | `npm i -g intelephense` |
| 10 | Lua | `lua-lsp` | `lua-language-server` | _(无)_ | `.lua` | `brew install lua-language-server` |

**所有插件均位于** `codebuddy-plugins-official` marketplace。

### 不支持的常见语言（无官方 LSP 插件）

以下语言目前 CodeBuddy 官方 marketplace **没有**对应 LSP 插件，扫描时自动回退为 `Grep + Read`：

| 语言 | 标记文件 | 说明 |
|---|---|---|
| Kotlin | `build.gradle.kts` | `jdtls-lsp` 仅注册 `.java`，不包含 `.kt .kts` |
| Ruby | `Gemfile` | 无官方插件 |
| Scala | `build.sbt` | 无官方插件 |
| Dart/Flutter | `pubspec.yaml` | 无官方插件 |
| Elixir | `mix.exs` | 无官方插件 |
| Perl | `Makefile.PL`, `cpanfile` | 无官方插件 |
| R | `DESCRIPTION` | 无官方插件 |
| Shell/Bash | `*.sh` | 无官方插件 |

> **维护提示**：当 CodeBuddy 新增 LSP 插件时，需将其从此「不支持」表移至上方「完整清单」表，并同步更新「文件类型优先级映射」和「语言检测」表。

## LSP 预热与探活

检测到语言后，先判断是否走快速路径，再决定完整探活。

### 快速路径（二进制在 PATH + 插件已安装已启用）

> **设计理由**：如果之前已经安装配置好 LSP，每次扫描不需要再走完整的 PATH 检查 → 插件状态 → 3 轮重试 → 自动安装流程。只做 1 次 LSP 调用确认可用即可。

```
which {lspBinary} 2>/dev/null && binaryInPath = true || binaryInPath = false

if binaryInPath:
  pluginPath = 在已知 marketplace 目录中查找 {lspPluginName} 插件
  pluginInstalled = pluginPath 存在且包含 .lsp.json
  Read ~/.codebuddy/settings.json
  pluginEnabled = enabledPlugins 中包含 "{lspPluginName}@{marketplace}"

  if pluginInstalled 且 pluginEnabled:
    # ★ 快速路径：一切就绪，只需验证 LSP 运行时可用
    选取 1 个源文件，按「探活文件和位置选择」规则确定 hover 位置
    result = LSP hover(probeFile, line=targetLine, character=targetChar)

    if result 判定为成功:
      lspStatus = "available"
      → 探活结束，直接使用 LSP（跳过所有后续步骤）

    # 快速路径失败 → 直接进入自动安装流程（步骤 4）
    → 继续步骤 4（自动安装）

# 快速路径不满足条件 → 进入完整探活流程
```

---

### 完整探活流程（快速路径不满足时执行）

### 步骤 1：PATH 前置检查

> **设计理由**：PATH 问题是 LSP 启动失败的最常见原因。前置检查可避免用户经历无效探活等待。

```
which {lspBinary} 2>/dev/null && binaryInPath = true || binaryInPath = false

if !binaryInPath:
  # 执行常见路径探测（见下方「各语言常见安装路径表」）
  对候选路径逐一检查 [ -x "$candidate" ]

  if 探测到二进制路径 foundPath:
    binDir = dirname(foundPath)
    → 执行「PATH 检测与指引子流程」(binDir, lspBinary)
    # 子流程通过 AskUserQuestion 获取用户选择

    if userChoice == "repair":
      → 记录 lspStatus = "unavailable"，pathDiagnostic.action = "repair"
      → 终止探活（用户需修复 PATH 并重启 CodeBuddy 后重新运行扫描）
    elif userChoice == "downgrade":
      → 记录 lspStatus = "unavailable"，pathDiagnostic.action = "downgrade"
      → 终止探活（以 Grep + Read 模式继续扫描）

  # else: 二进制确实未安装，继续步骤 2（后续自动安装会处理）
```

#### 各语言常见安装路径表

| 语言 | 二进制 | 候选路径（按优先级） |
|------|--------|---------------------|
| Go | `gopls` | `~/go/bin/gopls`, `$GOPATH/bin/gopls`, `$GOBIN/gopls` |
| Java | `jdtls` | `/opt/homebrew/bin/jdtls`, `/usr/local/bin/jdtls` |
| JS/TS | `typescript-language-server` | `~/.npm-global/bin/typescript-language-server`, `$NVM_DIR/versions/node/*/bin/typescript-language-server`, `/usr/local/bin/typescript-language-server` |
| Python | `pyright-langserver` | `~/.local/bin/pyright-langserver`, `~/Library/Python/*/bin/pyright-langserver`, `/usr/local/bin/pyright-langserver` |
| Rust | `rust-analyzer` | `~/.rustup/toolchains/*/bin/rust-analyzer`, `~/.cargo/bin/rust-analyzer` |
| C# | `csharp-ls` | `~/.dotnet/tools/csharp-ls` |
| Swift | `sourcekit-lsp` | `/usr/bin/sourcekit-lsp`, Xcode 内置路径 |
| C/C++ | `clangd` | `/opt/homebrew/opt/llvm/bin/clangd`, `/usr/local/opt/llvm/bin/clangd`, `/usr/bin/clangd` |
| PHP | `intelephense` | `~/.npm-global/bin/intelephense`, `/usr/local/bin/intelephense` |
| Lua | `lua-language-server` | `/opt/homebrew/bin/lua-language-server`, `/usr/local/bin/lua-language-server` |

### 步骤 2：插件状态检查

```
pluginPath = 在已知 marketplace 目录中查找 {lspPluginName} 插件
pluginInstalled = pluginPath 存在且包含 .lsp.json
Read ~/.codebuddy/settings.json
pluginEnabled = enabledPlugins 中包含 "{lspPluginName}@{marketplace}"

if pluginInstalled 且 !pluginEnabled:
  → 输出提示："插件 {lspPluginName} 已安装但未启用，请在 CodeBuddy 设置中启用。"
  → AskUserQuestion:
    - "我已启用，继续扫描" → 继续步骤 3
    - "跳过，以降级模式继续" → lspStatus = "unavailable"，终止探活
```

### 步骤 3：探活（1 轮）

> **设计理由**：探活只需确认 LSP 运行时是否可用，1 次调用足够。失败则直接进入自动安装，不做无意义的重试等待。

```
1. 按「文件类型优先级映射」，选取优先级最高的文件类型的 1 个源文件
   按「探活文件和位置选择」规则确定 hover 目标位置

2. 执行 1 次探活：
   result = LSP hover(probeFile, line=targetLine, character=targetChar)

   if result 判定为成功:
     lspStatus = "available"
     → 探活结束

   if result 判定为失败:
     → 进入步骤 5（自动安装流程）
```

### 步骤 4：自动安装流程（探活失败时触发）

> **触发条件**：步骤 3 探活失败。

```
# 向用户展示安装引导
输出：
  "检测到项目语言为 {language}，但对应的 LSP 未就绪。

   诊断结果：
     - 二进制 {lspBinary}：{已安装 | 未安装}
     - 插件 {lspPluginName}：{已安装 | 未安装}

   LSP 提供精确的语义分析能力（调用链追踪、符号定位、类型推断），
   启用 LSP 可显著提升漏洞检测的准确率和深度。"

AskUserQuestion:
  - "自动安装（推荐）" → 执行安装
  - "跳过，以降级模式继续" → lspStatus = "unavailable"，终止
```

#### 步骤 5a：安装二进制（需要时）

仅当 `which {lspBinary}` 返回 NOT_FOUND 时执行：

```bash
{binaryInstallCommand} 2>&1
```

安装后验证：

```
which {lspBinary} 2>/dev/null
if NOT_FOUND:
  # 安装成功但不在 PATH —— 执行路径探测
  对候选路径逐一检查 [ -x "$candidate" ]
  if 探测到:
    → 执行「PATH 检测与指引子流程」(binDir, lspBinary)
    → 继续步骤 5b（不阻塞）
  else:
    → 记录警告，继续步骤 5b
```

#### 步骤 5b：安装 CodeBuddy LSP 插件（需要时）

仅当插件未安装时执行：

```bash
codebuddy plugin install {lspPluginName}@codebuddy-plugins-official 2>&1
```

**安装结果判定**：

| 输出内容 | 判定 | 操作 |
|---------|------|------|
| 包含 `Successfully` | 成功 | 继续步骤 5c |
| 包含 `already installed` | 已安装 | 继续步骤 5c |
| 包含 `Failed to acquire lock` | 锁冲突 | 按错误信息删除锁文件，重试 1 次 |
| 其他错误 | 失败 | 记录错误，继续步骤 5c |

#### 步骤 5c：安装后验证探活（1 次）

```
result = LSP hover(probeFile, line=targetLine, character=targetChar)
if 失败:
  result = LSP documentSymbol(probeFile)

if result 判定为成功:
  lspStatus = "available"
  → 安装流程结束

# 安装后验证仍失败
输出："LSP 安装完成但预热仍失败。可能需要重启 CodeBuddy 使配置生效。"

AskUserQuestion:
  - "我已重启，继续扫描" → 再执行 1 次验证探活
    - 成功 → lspStatus = "available"
    - 失败 → lspStatus = "unavailable"
  - "跳过，以降级模式继续" → lspStatus = "unavailable"
```

> 这是阶段 1 初始化中**唯一**的用户交互点。LSP 可用 = 无需交互。

## PATH 检测与指引子流程（共享）

> **引用方**：步骤 1 PATH 前置检查、步骤 5a 安装后验证。
>
> **设计约束**：由于沙箱限制，编排器**无法**修改系统环境变量或写入 shell 配置文件。因此本子流程**检测问题后通过 AskUserQuestion 让用户选择**修复或降级。

```
# 输入：binDir — 二进制所在目录（如 ~/go/bin）
# 输入：lspBinary — 二进制名称（如 gopls）
# 输出：userChoice（"repair" 或 "downgrade"）

## 步骤 1：确定 shell 配置文件名（仅用于指引文案）
defaultShell = basename "$SHELL"   # zsh 或 bash
if defaultShell == "zsh":
  shellConfigHint = "~/.zshrc"
elif defaultShell == "bash":
  shellConfigHint = "~/.bashrc 或 ~/.bash_profile"
else:
  shellConfigHint = "shell 配置文件"

## 步骤 2：向用户展示诊断信息并提供选择
输出提示：
  "检测到 {lspBinary} 已安装在 {binDir}/{lspBinary}，但该目录不在 PATH 中。
   LSP 需要在 PATH 中找到 {lspBinary} 才能启动。

   如需修复，请执行以下操作：
   1. 将以下内容添加到 {shellConfigHint}：
      export PATH="{binDir}:$PATH"
   2. 重启 CodeBuddy 使配置生效"

AskUserQuestion:
  question: "检测到 {lspBinary} 已安装但不在 PATH 中，LSP 无法启动。请选择如何处理？"
  header: "LSP 配置"
  options:
    - label: "修复 PATH 后重试"
      description: "手动添加 {binDir} 到 PATH 并重启 CodeBuddy，下次扫描将启用 LSP"
    - label: "继续（降级模式）"
      description: "跳过 LSP，以 Grep + Read 模式继续当前扫描"

userChoice = 用户选择结果
  # "修复 PATH 后重试" → return "repair"
  # "继续（降级模式）" → return "downgrade"

## 步骤 3：记录到 lspProbe.pathDiagnostic
pathDiagnostic = {
  whichResult: "missing",
  foundAtPath: "{binDir}/{lspBinary}",
  binDir: binDir,
  userGuideShown: true,
  userChoice: userChoice
}
```

## 探活文件和位置选择（关键）

> **错误的文件和位置选择是探活误判的首要原因**。

**文件选择规则**：

```
1. 排除目录：node_modules、vendor、dist、build、.git、__pycache__、target、out
2. 排除文件：
   - 自动生成文件（package-lock.json、go.sum、*.min.js、*.d.ts）
   - 空文件（0 字节）
   - 超大文件（> 10000 行）
3. 优选文件：
   - 包含类/函数定义的源文件（非纯配置/纯数据文件）
   - 文件行数在 10-500 行之间
4. 每种文件类型选取 2 个候选文件（主 + 备用）
```

**hover 位置选择规则**：

```
Read probeFile offset=1 limit=30  # 读取前 30 行
扫描这 30 行，找到第一个满足以下条件的行：
  - 非空行
  - 非纯注释行（//、#、/*、*、"""、'''）
  - 非纯 import/require/use/include 语句
  - 包含标识符（函数名、类名、变量名）

targetLine = 找到的行号
targetChar = 该行中第一个标识符的起始列号

# 如果前 30 行全是 import/注释，则使用 documentSymbol 代替 hover
if 未找到合适位置:
  改用 LSP documentSymbol(probeFile) 作为首选操作
```

**示例**：

```python
# probeFile: src/service/UserService.java
# 前 5 行：
# 1: package com.example.service;
# 2:
# 3: import java.util.List;
# 4:
# 5: public class UserService {

# → 选择 line=5, character=13（"UserService" 标识符起始位置）
```

## 探活成功/失败判定（精确定义）

> 编排器必须严格按以下规则判定，不得凭主观感觉。

**成功（LSP 可用）**：

| LSP 操作返回 | 判定 | 说明 |
|-------------|------|------|
| 返回 hover 内容（非空对象） | 成功 | LSP 正常工作 |
| 返回空对象 `{}` 或 `null`（**无错误信息**） | 成功 | LSP Server 已连接，该位置无 hover 信息 |
| 返回空数组 `[]`（documentSymbol） | 成功 | LSP Server 已连接，文件无符号 |
| 返回 workspaceSymbol 结果（含或不含匹配） | 成功 | LSP Server 已连接并完成索引 |

**失败（LSP 不可用）**：

| LSP 操作返回 | 判定 | 说明 |
|-------------|------|------|
| 错误信息含 `"No LSP server configured for file type"` | 失败 | 文件类型未注册 |
| 错误信息含 `"LSP server failed to start"` | 失败 | Server 启动失败 |
| 错误信息含 `"LSP server timed out"` | 可重试 | Server 超时 |
| 错误信息含 `"LSP request failed"` | 可重试 | 请求失败 |
| 工具调用本身报错 | 可重试 | 可能是网络/进程问题 |

**关键判定原则**：**只有明确的错误信息才视为失败。没有错误信息的任何返回（包括空返回）一律视为成功。**

## 探活结果记录

将探活详情写入 `stage1-context.json`：

```json
{
  "lspProbe": {
    "pluginInstalled": true,
    "pluginEnabled": true,
    "attempts": [
      {"file": "src/service/UserService.java", "type": ".java", "op": "hover", "line": 5, "character": 13, "result": "ok", "retry": 0}
    ],
    "availableFileTypes": [".java"],
    "unavailableFileTypes": [],
    "lspStatus": "available"
  }
}
```

## LSP 错误分类（扫描阶段）

> 以下为扫描过程中（非探活阶段）agent 遇到 LSP 错误时的处理策略：

| 错误信息 | 含义 | Agent 处理策略 |
|---------|------|---------|
| `"No LSP server configured for file type: .xx"` | 文件类型未注册 | 该文件回退 Grep + Read |
| `"LSP server failed to start"` | 服务器启动失败 | 重试 1 次，仍失败则回退 |
| `"LSP server timed out"` | 服务器响应超时 | sleep 5 后重试，仍失败则回退 |
| `"LSP request failed"` | 请求级错误 | 换操作重试，仍失败则回退 |
| 返回空结果（无错误） | 服务器正常 | **不是错误**，继续使用 LSP |

**关键**：Agent 在扫描过程中遇到单次 LSP 错误时应**逐文件回退**（仅对该文件使用 Grep+Read），而非将 `lspStatus` 全局降级。

### 后续检查

- 将 `lspStatus` 和 `lspProbe` 写入所有 agent 提示词
- 记录到 `summary.json` > `executionMetrics.lspStatus`
- 当 `lspStatus: "partial"` 时，agent 提示词中注明：`"LSP 部分可用。可用文件类型：{availableFileTypes}。不可用类型使用 Grep + Read 追踪。"`

## LSP 降级规则

### 完全不可用（lspStatus: "unavailable"）

- 所有 agent 回退到 `Grep + Read` 手动追踪
- 所有发现必须设置 `traceMethod: "Grep+Read"`
- 未验证比例增加，整体置信度降低
- Agent 提示词包含：`"LSP 不可用。使用 Grep + Read 进行追踪。相应设置 traceMethod。"`

### 部分可用（lspStatus: "partial"）

- 对 `availableFileTypes` 中的文件类型正常使用 LSP
- 对 `unavailableFileTypes` 中的文件类型回退到 `Grep + Read`
- 发现的 `traceMethod` 按实际使用的方法设置（`"LSP"` 或 `"Grep+Read"`）
- Agent 提示词包含：`"LSP 部分可用。可用类型：{list}。对 {unavailableList} 使用 Grep + Read。"`
