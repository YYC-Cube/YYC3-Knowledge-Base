**YYC³-AI-π³ Guidelines**

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

## 核心使命

1. **设计即代码**：将设计师的视觉设计直接转化为可运行的生产级代码
2. **实时预览**：在每次设计变更时立即提供实时预览反馈
3. **多联式布局**：支持自由拖拽、合并、拆分的多面板布局系统
4. **智能辅助**：通过 AI 提供属性建议、代码片段、错误诊断
5. **配置即部署**：生成的代码可直接部署到生产环境

## 能力矩阵

| 能力维度 | 核心能力 | 输出成果 |
|---------|---------|---------|
| **设计理解** | 解析 Figma 设计文件、理解布局意图 | Design JSON |
| **代码生成** | 生成 React/TypeScript 组件代码 | 生产级代码 |
| **实时预览** | 即时渲染设计变更、提供视觉反馈 | 实时预览界面 |
| **智能辅助** | 属性建议、错误诊断、文档生成 | AI 辅助功能 |
| **协同编辑** | 多用户实时协同、冲突解决 | 协同编辑体验 |

---

## 🏗️ 系统架构总览

### 架构分层

```
┌─────────────────────────────────────────────────────────────┐
│                     用户交互层                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 首页入口  │  │ 设计画布  │  │ AI交互区  │  │ 预览视图  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
├─────────────────────────────────────────────────────────────┤
│                     功能逻辑层                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 路由决策  │  │ 面板管理  │  │ 组件系统  │  │ 状态管理  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
├─────────────────────────────────────────────────────────────┤
│                     AI 智能层                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 意图识别  │  │ 代码生成  │  │ 错误诊断  │  │ 文档生成  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
├─────────────────────────────────────────────────────────────┤
│                     数据持久层                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Design   │  │ 代码仓库  │  │ 用户数据  │  │ 协同状态  │   │
│  │   JSON   │  │          │  │          │  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
├─────────────────────────────────────────────────────────────┤
│                     技术实现层                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ React    │  │ Monaco   │  │ WebSock  │  │ CRDT     │   │
│  │ + TS     │  │ Editor   │  │ et       │  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏠 首页架构设计

### 品牌标识系统

```
YYC³ Family AI
言传千行代码 | 语枢万物智能
```

### 核心交互组件

#### 智能编程 AI 聊天框

**功能特性矩阵：**

**1. 图标功能栏**

| 图标 | 中文名称 | 英文名称 | 功能 | 支持格式 | 交互方式 | 快捷键 |
|------|---------|---------|------|---------|---------|--------|
| ⊕ | 添加 | Add | 展开多功能菜单 | - | 点击展开 | Ctrl+Shift+A |
| 📤 | 图片上传 | Image Upload | 上传图片 | PNG, JPG, GIF, SVG | 拖拽/选择 | Ctrl+U |
| 📁 | 文件导入 | File Import | 导入文件 | 多文件支持 | 拖拽/选择 | Ctrl+O |
| 🔗 | GitHub 链接 | GitHub Link | GitHub 链接 | 仓库 URL | 粘贴/输入 | Ctrl+G |
| 🎨 | Figma 文件 | Figma File | Figma 文件 | .fig 文件 | 拖拽/选择 | Ctrl+F |
| 💻 | 代码片段 | Code Snippet | 代码片段 | 多语言代码 | 粘贴/输入 | Ctrl+I |
| 📋 | 剪贴板 | Clipboard | 剪贴板 | 任意内容 | Ctrl+V | Ctrl+V |

**2. 智能聊天交互区**

- **自然语言输入**：支持中英文混合输入、智能语义理解、上下文记忆保持
- **实时 AI 响应机制**：流式代码生成、实时语法检查、智能补全建议
- **多模态输入支持**：拖拽图片、快捷键操作、屏幕截图、文件拖放
- **富文本展示**：代码块语法高亮、Markdown 格式支持、交互式代码预览

#### 智能路由决策系统

**A. 多联式布局设计器**

- **触发条件**：分析用户首次交流信息的语义和意图
- **判断标准**：检测关键词、识别用户意图、判断是否启动"智能 AI 编程模式"
- **跳转动作**：自动导航至多联式布局设计器
- **参数传递**：携带用户需求上下文

**B. 智能 AI 交互工作台**

- **触发条件**：持续监控用户交流沟通内容
- **判断标准**：识别深度编程需求、检测需要 AI 辅助的场景、判断是否需要全屏交互模式
- **跳转动作**：自动切换至全屏智能 AI 交互模式
- **状态保持**：维持对话上下文和历史记录

### 项目快速访问系统

#### 最近项目卡片预览

- **布局位置**：聊天框下方横向滚动区域
- **展示形式**：卡片式预览布局、项目缩略图展示、项目元数据（名称、更新时间、状态）
- **交互方式**：点击卡片直接进入对应项目、右键菜单（打开、删除、重命名）、拖拽排序功能
- **功能价值**：快速访问历史项目、无缝继续开发工作、项目状态可视化

---

## 🎨 智能 AI 编程模式页面

### 页面布局策略

**布局类型**：多联式可拖拽合并布局系统
**设计理念**：模块化、可扩展、用户中心

### 页眉公共图标区

#### 顶部导航栏

**布局结构**：Logo + 项目标题区 + 公共图标区 + 个人信息

**公共图标功能**：

| 图标 | 中文名称 | 英文名称 | 功能 | 快捷键 | 悬停提示（中文） | 悬停提示（英文） |
|------|---------|---------|------|--------|----------------|----------------|
| 🏠 | 首页 | Home | 返回首页 | - | 首页 | Home |
| 📁 | 项目管理 | Projects | 项目列表、创建新项目、项目设置 | Ctrl+Shift+P | 项目管理 | Projects |
| 🔔 | 通知中心 | Notifications | 系统通知、更新提醒、消息中心 | Ctrl+Shift+N | 通知中心 | Notifications |
| ⚙️ | 设置 | Settings | 全局设置、偏好配置、主题切换 | Ctrl+, | 设置 | Settings |
| 🐙 | GitHub | GitHub | 代码仓库、版本控制、协作功能 | Ctrl+Shift+G | GitHub | GitHub |
| 📤 | 分享 | Share | 项目分享、协作邀请、导出功能 | Ctrl+Shift+S | 分享 | Share |
| 🚀 | 发布 | Deploy | 部署发布、版本管理、上线流程 | Ctrl+Shift+D | 发布 | Deploy |
| ⚡ | 快速操作 | Quick Actions | 快速操作菜单、常用功能 | Ctrl+Shift+Q | 快速操作 | Quick Actions |
| 🌐 | 语言切换 | Language | 中/英文语言切换 | Ctrl+Shift+L | 语言切换 | Language |
| 👤 | 用户 | User | 用户设置 | - | 用户 | User |

**图标交互规范**：

- **默认状态**：只显示图标，不显示文字
- **悬停状态**：显示中文名称（根据当前语言设置）
- **激活状态**：高亮显示，表示当前功能已激活
- **禁用状态**：灰度显示，表示功能不可用

#### 用户信息展示面板

| 图标 | 中文名称 | 英文名称 | 功能 | 悬停提示（中文） | 悬停提示（英文） |
|------|---------|---------|------|----------------|----------------|
| 👤 | 用户头像 | User Avatar | 显示用户头像，点击可切换用户 | 用户头像 | User Avatar |
| 📝 | 用户名称 | User Name | 显示当前用户名称 | 用户名称 | User Name |
| 🟢 | 在线状态 | Online Status | 实时在线状态指示（在线/忙碌/离线） | 在线状态 | Online Status |
| ⚙️ | 偏好设置 | Preferences | 快速访问用户偏好设置 | 偏好设置 | Preferences |

### 视图切换栏

**布局位置**：页眉下方，三栏布局上方

**视图切换图标**：

| 图标 | 中文名称 | 英文名称 | 功能 | 快捷键 | 悬停提示（中文） | 悬停提示（英文） |
|------|---------|---------|------|--------|----------------|----------------|
| ◀ | 返回 | Back | 返回上一级或主页 | Esc | 返回 | Back |
| 👁 | 预览 | Preview | 切换至项目实时预览视图（合并中栏和右栏） | Ctrl+1 | 预览 | Preview |
| ⌨️ | 代码 | Code | 切换至代码详情面板（显示右栏代码编辑） | Ctrl+2 | 代码 | Code |
| ⋮⋮ | 分隔线 | Separator | 视觉分隔符 | - | - | - |
| 🔍 | 搜索 | Search | 全局搜索功能（搜索文件、代码、组件） | Ctrl+Shift+F | 搜索 | Search |
| ⋯ | 更多 | More | 扩展菜单、快捷操作、工具列表 | Ctrl+Shift+M | 更多 | More |

**图标交互规范**：

- **默认状态**：只显示图标，不显示文字
- **悬停状态**：显示中文名称（根据当前语言设置）
- **激活状态**：高亮显示，表示当前功能已激活
- **禁用状态**：灰度显示，表示功能不可用

### 三栏式布局架构

#### 完整页面布局结构

```
┌───────────────────────────────────────────────────────────────────────┐
│  🏠 CloudPivot AI                            📁 🔔 ⚙️ � 📤 🚀 ⚡ 🌐 👤   │
├───────────────────────────────────────────────────────────────────────┤
│  🤖 🔧 ⚙️                 ◀ 👁 ⌨️  🔍 📁 📄         💻 📝 ⚡ �            │
├───────────────────────────────────────────────────────────────────────┤
│ │             │   │                      ││                    │      │
│ │   左栏       │   │        中栏          ││        右栏         │      │
│ │   (25%)     │   │        (45%)         ││        (30%)       │      │
│ │             │   │                      ││                    │      │
│ │ ┌─────────┐ │   │ ┌──────────────────┐ ││ ┌────────────────┐ │      │
│ │ │  AI对话│ │   │ │   文件资源管理器   │ ││ │    文件预览/编辑 │ │      │
│ │ │  面板    │ │   │ │     项目结构      │ ││ │     代码编辑器   │ │      │
│ │ │         │ │   │ │     文件列表      │ ││ │      语法高亮    │ │      │
│ │ │         │ │   │ │     搜索过滤      │ ││ │     智能提示     │ │      │ 
│ │ │         │ │   │ │                  │ ││ │     代码折叠    │ │      │
│ │ │         │ │   │ │                  │ ││ │                │ │      │
│ │ │         │ │   │ │                  │ ││ │                │ │      │
│ │ │         │ │   │ │                  │ ││ │                │ │      │
│ │ │         │ │   │ │                  │ ││ │                │ │      │
│ │ │         │ │   │ │                  │ ││ │                │ │      │
│ │ │         │ │   │ │                  │ ││ │                │ │      │
│ │ │         │ │   │ │                  │ ││ │                │ │      │
│ │ │─────────│ │   │ └──────────────────┘ ││ └────────────────┘ │      │
│ │ │✏️ 用户输入│ │   │ ┌────────────────────││──────────────────┐ │      │
│ │ │         │ │   │ │   集成终端 🖥️ 命令行📋││⚡ 命令执行/快速操作 │ │      │
│ │ │         │ │   │ │                    ││                  │ │      │
│ │ └─────────┘ │   │ └────────────────────││──────────────────┘ │      │
│ └─────────────┘   └──────────────────────┘└────────────────────┘      │
└───────────────────────────────────────────────────────────────────────┘
```

#### 图标对应说明

**顶部导航栏图标**：

- 🏠 首页 (Home) - 返回首页
- 📁 文件 (File) - 切换至文件管理
- 🔔 通知 (Notification) - 查看通知
- ⚙️ 设置 (Settings) - 打开设置
- 🐙 GitHub - GitHub 集成
- 📤 导出 (Export) - 导出文件
- 🚀 发布 (Deploy) - 发布部署
- ⚡ 快速操作 (Quick Action) - 快速操作
- 🌐 语言 (Language) - 切换语言
- 👤 用户 (User) - 用户设置

**导航图标**：

- ◀ 返回 (Back) - 返回上一级
- 👁 预览 (Preview) - 切换至预览视图
- ⌨️ 代码 (Code) - 切换至代码视图
- ⋯ 更多 (More) - 扩展菜单
- 🔍 搜索 (Search) - 全局搜索
- ⋮ 扩展菜单 - 更多选项

**AI 功能图标**：

- 🤖 AI模型 (AI Model) - AI模型选择

**终端图标**：

- 🖥️ 终端 (Terminal) - 打开终端
- 📋 标签页 (Tab) - 终端标签页

#### 布局说明

- **左栏 (25%)**：用户与智能AI交互区，包含用户信息、AI模型选择、AI交互主界面、用户聊天框
- **中栏 (45%)**：项目文件管理区，包含文件树、文件操作、代码编辑器
- **右栏 (30%)**：文件代码编辑区，包含语法高亮、代码折叠、集成终端

### 区域划分与功能定义

#### 左栏 - 用户与智能AI交互区

##### 智能编程AI交互主界面

- **AI模型选择器**：选择不同的AI模型（GPT-4、Claude、本地模型等）
- **功能扩展插件入口**：访问AI功能扩展和插件市场
- **设置和帮助按钮**：AI助手设置、使用帮助、快捷键说明

##### 用户聊天框

- **多模态输入支持**：文本、图片、文件拖拽输入
- **历史对话记录**：保存和查看历史对话
- **快捷回复建议**：AI智能推荐的快捷回复
- **上下文理解**：基于上下文的智能对话

#### 中栏 - 项目文件管理区

##### 文件树形结构

- **层级展示**：清晰的文件目录层级
- **拖拽移动**：支持文件拖拽移动
- **右键操作菜单**：文件操作快捷菜单
- **搜索过滤**：快速搜索和过滤文件
- **创建文件/文件夹**：快速创建新文件或文件夹
- **删除和重命名**：文件删除和重命名操作
- **复制和粘贴**：文件复制和粘贴功能
- **版本历史查看**：查看文件版本历史

##### 代码编辑器集成

- **Monaco Editor**：基于VS Code的编辑器
- **语法高亮**：支持多种编程语言
- **智能补全**：代码智能提示和补全
- **错误提示**：实时语法错误检测

#### 右栏 - 文件代码编辑区

##### 代码详情面板

- **语法高亮显示**：支持多种编程语言
- **代码折叠/展开**：提升代码可读性
- **代码格式化**：自动格式化和美化
- **错误提示**：实时语法错误检测和提示
- **类型信息**：TypeScript类型定义展示
- **文档注释**：自动提取和展示JSDoc

##### 集成终端命令交互区

- **多终端支持**：支持创建多个终端实例
- **终端标签页管理**：终端会话管理
- **终端会话持久化**：保存终端会话状态
- **命令执行功能**：支持多种Shell（bash、zsh、fish、powershell）
- **命令历史记录和搜索**：命令历史和搜索功能
- **快捷命令别名配置**：自定义命令别名
- **智能集成特性**：与文件管理器联动、智能路径提示和补全
- **开发工具集成**：Git命令可视化、npm/yarn/pnpm包管理器支持
- **交互增强**：支持拖拽文件到终端、终端输出可复制和搜索

### 视图切换机制

#### 切换控件设计

| 图标 | 中文名称 | 英文名称 | 功能 | 快捷键 | 悬停提示（中文） | 悬停提示（英文） |
|------|---------|---------|------|--------|----------------|----------------|
| ◀ | 返回 | Back | 返回上一级或主页 | Esc | 返回 | Back |
| 👁 | 预览 | Preview | 切换至项目实时预览视图（合并中栏和右栏） | Ctrl+1 | 预览 | Preview |
| ⌨️ | 代码 | Code | 切换至代码详情面板（显示右栏代码编辑） | Ctrl+2 | 代码 | Code |
| ⋮⋮ | 分隔线 | Separator | 视觉分隔符 | - | - | - |
| 🔍 | 搜索 | Search | 全局搜索功能（搜索文件、代码、组件） | Ctrl+Shift+F | 搜索 | Search |
| ⋯ | 更多 | More | 扩展菜单、快捷操作、工具列表 | Ctrl+Shift+M | 更多 | More |

#### 切换逻辑实现

- **自由切换**：用户可通过点击图标在多个视图间自由切换
- **状态保持**：保持当前编辑状态，实现无缝切换
- **快捷键支持**：支持快捷键操作（Esc、Ctrl+1/2/3、Ctrl+Shift+F）
- **状态持久化**：记住用户偏好，保持视图状态

### 布局特性

#### 响应式设计

- **自适应布局**：根据屏幕尺寸自动调整布局
- **智能折叠**：侧边栏根据屏幕尺寸智能折叠
- **移动端适配**：支持移动端访问和操作

#### 可定制性

- **面板拖拽**：支持面板拖拽调整位置
- **面板合并**：支持面板合并和拆分
- **自定义布局**：用户可自定义页面布局

#### 性能优化

- **懒加载**：按需加载组件和内容
- **虚拟滚动**：大列表使用虚拟滚动
- **缓存机制**：智能缓存提升性能

---

## 🎯 图标系统体系

### 图标库选择

**主图标库**: Lucide React v0.312.0

**选择理由**:
- 开源免费，MIT 许可
- 风格统一，质量高
- TypeScript 原生支持
- 持续维护更新
- 社区活跃，生态完善

### 图标分类体系

#### 1. 导航图标

| 图标 | 中文名称 | 英文名称 | 用途 | 快捷键 | 悬停提示（中文） | 悬停提示（英文） |
|------|---------|---------|------|--------|----------------|----------------|
| 🏠 | 首页 | Home | 返回首页 | - | 首页 | Home |
| ◀ | 返回 | Back | 返回上一级 | Esc | 返回 | Back |

#### 2. 功能图标

| 图标 | 中文名称 | 英文名称 | 用途 | 快捷键 | 悬停提示（中文） | 悬停提示（英文） |
|------|---------|---------|------|--------|----------------|----------------|
| 📁 | 文件 | File | 文件管理 | - | 文件 | File |
| 🔔 | 通知 | Notification | 通知中心 | Ctrl+Shift+N | 通知 | Notification |
| ⚙️ | 设置 | Settings | 系统设置 | Ctrl+, | 设置 | Settings |
| 🐙 | GitHub | GitHub | GitHub 集成 | Ctrl+Shift+G | GitHub | GitHub |
| 📤 | 导出 | Export | 导出文件 | Ctrl+Shift+S | 导出 | Export |
| 🚀 | 发布 | Deploy | 发布部署 | Ctrl+Shift+D | 发布 | Deploy |
| ⚡ | 快速操作 | Quick Action | 快速操作 | Ctrl+Shift+Q | 快速操作 | Quick Action |
| 🌐 | 语言 | Language | 语言切换 | Ctrl+Shift+L | 语言 | Language |
| 👤 | 用户 | User | 用户设置 | - | 用户 | User |

#### 3. 视图切换图标

| 图标 | 中文名称 | 英文名称 | 用途 | 快捷键 | 悬停提示（中文） | 悬停提示（英文） |
|------|---------|---------|------|--------|----------------|----------------|
| 👁 | 预览 | Preview | 预览视图 | Ctrl+1 | 预览 | Preview |
| ⌨️ | 代码 | Code | 代码视图 | Ctrl+2 | 代码 | Code |
| ⋮⋮ | 分隔线 | Separator | 视觉分隔 | - | - | - |
| 🔍 | 搜索 | Search | 全局搜索 | Ctrl+Shift+F | 搜索 | Search |
| ⋯ | 更多 | More | 扩展菜单 | Ctrl+Shift+M | 更多 | More |

#### 4. AI 功能图标

| 图标 | 中文名称 | 英文名称 | 用途 | 快捷键 | 悬停提示（中文） | 悬停提示（英文） |
|------|---------|---------|------|--------|----------------|----------------|
| 🤖 | AI 模型 | AI Model | AI 模型选择 | - | AI 模型 | AI Model |
| � | AI 对话 | AI Chat | AI 对话界面 | - | AI 对话 | AI Chat |
| 🔧 | AI 设置 | AI Settings | AI 参数设置 | - | AI 设置 | AI Settings |
| ⚙️ | AI 配置 | AI Config | AI 配置选项 | - | AI 配置 | AI Config |

#### 5. 终端图标

| 图标 | 中文名称 | 英文名称 | 用途 | 快捷键 | 悬停提示（中文） | 悬停提示（英文） |
|------|---------|---------|------|--------|----------------|----------------|
| �️ | 终端 | Terminal | 打开终端 | - | 终端 | Terminal |
| 📋 | 标签页 | Tab | 终端标签页 | - | 标签页 | Tab |

#### 6. 用户图标

| 图标 | 中文名称 | 英文名称 | 用途 | 快捷键 | 悬停提示（中文） | 悬停提示（英文） |
|------|---------|---------|------|--------|----------------|----------------|
| 👤 | 用户头像 | User Avatar | 用户头像 | - | 用户头像 | User Avatar |
| 📝 | 用户名称 | User Name | 用户名称 | - | 用户名称 | User Name |
| 🟢 | 在线状态 | Online Status | 在线状态 | - | 在线状态 | Online Status |
| ⚙️ | 偏好设置 | Preferences | 偏好设置 | - | 偏好设置 | Preferences |

#### 7. 功能操作图标

| 图标 | 中文名称 | 英文名称 | 用途 | 快捷键 | 悬停提示（中文） | 悬停提示（英文） |
|------|---------|---------|------|--------|----------------|----------------|
| ⊕ | 添加 | Add | 添加功能 | Ctrl+Shift+A | 添加 | Add |
| 📤 | 图片上传 | Image Upload | 图片上传 | Ctrl+U | 图片上传 | Image Upload |
| � | 文件导入 | File Import | 文件导入 | Ctrl+O | 文件导入 | File Import |
| � | GitHub 链接 | GitHub Link | GitHub 链接 | Ctrl+G | GitHub 链接 | GitHub Link |
| 🎨 | Figma 文件 | Figma File | Figma 文件 | Ctrl+F | Figma 文件 | Figma File |
| � | 代码片段 | Code Snippet | 代码片段 | Ctrl+I | 代码片段 | Code Snippet |
| � | 剪贴板 | Clipboard | 剪贴板 | Ctrl+V | 剪贴板 | Clipboard |

### 图标交互规范

#### 状态定义

##### 默认状态

- **显示**: 只显示图标
- **颜色**: 使用默认主题色
- **不显示文字**: 保持界面简洁

##### 悬停状态

- **显示**: 显示中文名称（根据当前语言设置）
- **颜色**: 使用悬停主题色（高亮）
- **提示**: 显示 Tooltip 提示

##### 激活状态

- **显示**: 高亮显示
- **颜色**: 使用激活主题色
- **指示**: 表示当前功能已激活

##### 禁用状态

- **显示**: 灰度显示
- **颜色**: 使用禁用色（opacity: 0.4）
- **交互**: 不响应点击事件

### 图标命名规范

#### 命名规则

```
{category}-{name}-{variant}-{size}
```

**参数说明**：
- `category`：图标分类（nav, func, user, ai, edit）
- `name`：图标名称（home, back, preview, code, search, more）
- `variant`：图标变体（filled, outlined, duotone）
- `size`：图标尺寸（16, 20, 24, 32, 48）

**示例**：
- `nav-home-filled-24`：导航类首页图标，实心，24px
- `func-code-outlined-20`：功能类代码图标，轮廓，20px

#### 图标文件组织

```
src/assets/icons/
├── nav/
│   ├── home-filled-24.svg
│   ├── back-outlined-20.svg
│   └── ...
├── func/
│   ├── folder-filled-24.svg
│   ├── notification-outlined-20.svg
│   └── ...
├── user/
│   ├── user-filled-24.svg
│   └── ...
├── ai/
│   ├── ai-filled-24.svg
│   └── ...
└── edit/
    ├── edit-filled-24.svg
    └── ...
```

### 图标使用指南

#### 导入方式

```typescript
import { 
  Home, 
  File, 
  Settings, 
  GitHub, 
  User 
} from 'lucide-react';
```

#### 使用示例

```typescript
// 基础使用
<Home size={24} />

// 带颜色
<Settings size={24} className="text-primary" />

// 带状态
<User 
  size={24} 
  className={isActive ? 'text-accent' : 'text-muted'} 
/>
```

#### 响应式尺寸

```typescript
// 不同尺寸
<Home size={16} />  // 小尺寸
<Home size={24} />  // 标准尺寸
<Home size={32} />  // 大尺寸
<Home size={48} />  // 超大尺寸
```

### 图标主题适配

#### 亮色主题

```css
.icon-light {
  color: #1a1a1a;
}
```

#### 暗色主题

```css
.icon-dark {
  color: #f5f5f5;
}
```

#### 自定义主题

```typescript
interface IconTheme {
  default: string;
  hover: string;
  active: string;
  disabled: string;
}

const customTheme: IconTheme = {
  default: '#6366f1',
  hover: '#8b5cf6',
  active: '#3b82f6',
  disabled: '#9ca3af',
};
```

### 图标性能优化

#### 按需加载

```typescript
import { lazy } from 'react';

const LazyIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.IconName })));
```

#### 图标预加载

```typescript
// 预加载常用图标
import { 
  Home, 
  File, 
  Settings, 
  GitHub 
} from 'lucide-react';
```

#### SVG 优化

- 使用 `stroke-width="2"` 保持线条一致
- 使用 `stroke-linecap="round"` 圆角处理
- 使用 `stroke-linejoin="round"` 连接圆角

---

## � 功能架构闭环

### 闭环设计理念

功能架构采用 **输入 → 处理 → 输出 → 反馈** 的闭环设计，确保每个功能模块都有完整的输入输出链路和反馈机制。

### 核心功能闭环

#### 1. 设计输入闭环

```
用户需求输入
    ↓
多模态输入处理
    ↓
意图识别与分析
    ↓
设计数据生成
    ↓
实时预览反馈
    ↓
用户确认/调整
    ↓
（循环）
```

#### 2. 代码生成闭环

```
设计数据读取
    ↓
模板选择与匹配
    ↓
数据填充与转换
    ↓
代码生成与格式化
    ↓
类型检查与验证
    ↓
文件写入与更新
    ↓
编译与运行
    ↓
错误反馈与修正
    ↓
（循环）
```

#### 3. 实时预览闭环

```
设计变更检测
    ↓
差异计算（Diff）
    ↓
增量更新（Patch）
    ↓
代码重新编译
    ↓
预览刷新
    ↓
用户交互反馈
    ↓
设计调整
    ↓
（循环）
```

#### 4. AI 辅助闭环

```
用户操作触发
    ↓
上下文收集
    ↓
AI 意图理解
    ↓
智能建议生成
    ↓
建议展示
    ↓
用户选择/拒绝
    ↓
建议应用/忽略
    ↓
效果反馈
    ↓
（循环）
```

#### 5. 协同编辑闭环

```
用户操作
    ↓
操作转换（OT）
    ↓
CRDT 更新
    ↓
状态同步
    ↓
冲突检测与解决
    ↓
多用户视图更新
    ↓
（循环）
```

---

## �🔗 逻辑核心链路

### 核心业务逻辑链路

#### 1. 项目创建链路

```
用户点击"新建项目"
    ↓
显示项目模板选择
    ↓
用户选择模板
    ↓
填写项目信息（名称、描述、技术栈）
    ↓
创建项目目录结构
    ↓
初始化配置文件（package.json, tsconfig.json）
    ↓
生成初始 Design JSON
    ↓
创建默认组件
    ↓
跳转到设计画布
    ↓
完成项目创建
```

#### 2. 面板操作链路

```
用户拖拽面板
    ↓
检测拖拽目标位置
    ↓
计算面板新位置
    ↓
更新 Design JSON
    ↓
触发实时预览更新
    ↓
保存到状态管理
    ↓
同步到协同状态
    ↓
完成面板移动
```

#### 3. 面板合并链路

```
用户拖拽面板到另一个面板边缘
    ↓
检测合并意图
    ↓
显示合并指示器
    ↓
用户释放鼠标
    ↓
执行面板合并逻辑
    ↓
更新 Design JSON
    ↓
触发实时预览更新
    ↓
保存到状态管理
    ↓
同步到协同状态
    ↓
完成面板合并
```

#### 4. 面板拆分链路

```
用户选择拆分选项（水平/垂直，2/3/4 区）
    ↓
执行面板拆分逻辑
    ↓
创建子面板
    ↓
更新 Design JSON
    ↓
触发实时预览更新
    ↓
保存到状态管理
    ↓
同步到协同状态
    ↓
完成面板拆分
```

#### 5. AI 辅助链路

```
用户触发 AI 辅助（点击按钮、快捷键）
    ↓
收集当前上下文（选中组件、编辑内容、设计状态）
    ↓
发送到 AI 服务
    ↓
AI 分析上下文
    ↓
生成建议
    ↓
展示建议给用户
    ↓
用户选择/拒绝建议
    ↓
应用建议到设计
    ↓
更新 Design JSON
    ↓
触发实时预览更新
    ↓
完成 AI 辅助
```

#### 6. 代码生成链路

```
用户点击"生成代码"
    ↓
读取 Design JSON
    ↓
选择代码生成模板
    ↓
填充模板数据
    ↓
生成代码
    ↓
代码格式化
    ↓
类型检查
    ↓
写入文件
    ↓
更新文件树
    ↓
完成代码生成
```

#### 7. 实时预览链路

```
设计状态变更
    ↓
检测变更
    ↓
计算差异（Diff）
    ↓
生成增量更新（Patch）
    ↓
发送到预览 iframe
    ↓
iframe 接收更新
    ↓
重新渲染预览
    ↓
完成实时预览更新
```

#### 8. 协同编辑链路

```
用户执行操作
    ↓
操作转换（OT）
    ↓
生成 CRDT 操作
    ↓
发送到协同服务器
    ↓
服务器广播操作
    ↓
其他用户接收操作
    ↓
应用操作到本地状态
    ↓
更新 UI
    ↓
完成协同编辑
```

### 状态管理链路

#### 状态更新流程

```
用户操作
    ↓
派发 Action
    ↓
Reducer 处理
    ↓
更新状态
    ↓
触发订阅者
    ↓
UI 重新渲染
    ↓
完成状态更新
```

#### 状态持久化流程

```
状态变更
    ↓
检测需要持久化的状态
    ↓
序列化状态
    ↓
保存到 LocalStorage
    ↓
完成状态持久化
```

---

## 🛠️ 技术实现规范

### 技术栈规范

#### 前端框架

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI 框架 |
| TypeScript | 5.x | 类型系统 |
| Vite | 5.x | 构建工具 |

#### 状态管理

| 技术 | 版本 | 用途 |
|------|------|------|
| Zustand | 4.x | 全局状态管理 |
| Immer | 10.x | 不可变状态更新 |
| React Query | 5.x | 服务端状态管理 |

#### 布局引擎

| 技术 | 版本 | 用途 |
|------|------|------|
| react-grid-layout | 1.x | 网格布局 |
| react-dnd | 16.x | 拖拽功能 |

#### 实时协同

| 技术 | 版本 | 用途 |
|------|------|------|
| yjs | 13.x | CRDT 数据结构 |
| y-websocket | 2.x | WebSocket 传输 |

#### 表单验证

| 技术 | 版本 | 用途 |
|------|------|------|
| react-hook-form | 7.x | 表单管理 |
| zod | 3.x | Schema 验证 |

#### AI 集成

| 技术 | 版本 | 用途 |
|------|------|------|
| OpenAI API | Latest | AI 服务 |

#### 代码编辑

| 技术 | 版本 | 用途 |
|------|------|------|
| monaco-editor | 0.45.x | 代码编辑器 |

#### 样式系统

| 技术 | 版本 | 用途 |
|------|------|------|
| Tailwind CSS | 3.x | 样式框架 |

#### 图标库

| 技术 | 版本 | 用途 |
|------|------|------|
| Lucide React | 0.312.0 | 图标库 |

### 代码规范

#### 命名规范

**文件命名**：
- 组件文件：PascalCase（如 `PanelManager.tsx`）
- 工具文件：camelCase（如 `utils.ts`）
- 类型文件：PascalCase（如 `types.ts`）

**变量命名**：
- 常量：UPPER_SNAKE_CASE（如 `MAX_PANELS`）
- 变量：camelCase（如 `panelCount`）
- 类型/接口：PascalCase（如 `PanelSpec`）

**函数命名**：
- 普通函数：camelCase（如 `calculateLayout`）
- 事件处理：handleXxx（如 `handleDrag`）
- 异步函数：async + camelCase（如 `fetchData`）

#### 代码组织

**组件结构**：
```typescript
// 1. 导入
import { useState, useEffect } from 'react';
import { usePanelStore } from '@/stores/panel';

// 2. 类型定义
interface PanelProps {
  id: string;
  title: string;
}

// 3. 组件定义
export function Panel({ id, title }: PanelProps) {
  // 4. Hooks
  const [isOpen, setIsOpen] = useState(false);
  const { updatePanel } = usePanelStore();

  // 5. 事件处理
  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  // 6. 渲染
  return (
    <div>
      <h2>{title}</h2>
      <button onClick={handleToggle}>
        {isOpen ? 'Close' : 'Open'}
      </button>
    </div>
  );
}
```

#### 性能优化

**React 优化**：
- 使用 `React.memo` 避免不必要的重渲染
- 使用 `useMemo` 缓存计算结果
- 使用 `useCallback` 缓存函数引用
- 使用 `React.lazy` 和 `Suspense` 实现代码分割

**渲染优化**：
- 使用虚拟滚动处理大列表
- 使用防抖和节流优化频繁操作
- 使用 Web Worker 处理计算密集型任务

---

## 📊 数据模型定义

### Design JSON 数据模型

#### 根节点结构

```typescript
interface DesignRoot {
  version: string;
  theme: 'light' | 'dark';
  tokens: string;
  panels: PanelSpec[];
  components: ComponentSpec[];
  styles: StyleSpec;
}
```

#### 面板规范

```typescript
interface PanelSpec {
  id: string;
  type: 'container' | 'content' | 'preview';
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
  };
  style: PanelStyle;
  children?: PanelSpec[];
  components?: ComponentSpec[];
}

interface PanelStyle {
  background?: string;
  border?: string;
  borderRadius?: number;
  padding?: number;
  margin?: number;
  shadow?: string;
}
```

#### 组件规范

```typescript
interface ComponentSpec {
  id: string;
  type: ComponentType;
  props: Record<string, any>;
  style: ComponentStyle;
  children?: ComponentSpec[];
}

type ComponentType =
  | 'Button'
  | 'Input'
  | 'Text'
  | 'Image'
  | 'Container'
  | 'List'
  | 'Card'
  | 'Modal'
  | 'Dropdown'
  | 'Checkbox'
  | 'Radio'
  | 'Switch'
  | 'Slider'
  | 'DatePicker'
  | 'TimePicker'
  | 'Upload'
  | 'Progress'
  | 'Spinner'
  | 'Badge'
  | 'Avatar'
  | 'Divider'
  | 'Tooltip'
  | 'Popover'
  | 'Tabs'
  | 'Accordion'
  | 'Breadcrumb'
  | 'Pagination'
  | 'Table'
  | 'Form'
  | 'Alert'
  | 'Message'
  | 'Notification'
  | 'Drawer'
  | 'Skeleton'
  | 'Empty'
  | 'Result'
  | 'Statistic'
  | 'Timeline'
  | 'Tree'
  | 'Transfer'
  | 'Calendar'
  | 'Carousel'
  | 'Collapse'
  | 'Comment'
  | 'Description'
  | 'Steps'
  | 'Tag'
  | 'Rate'
  | 'Space'
  | 'Layout'
  | 'Menu'
  | 'PageHeader'
  | 'BackTop'
  | 'Anchor'
  | 'Affix'
  | 'Parallax'
  | 'ScrollNumber'
  | 'Spin'
  | 'ConfigProvider';

interface ComponentStyle {
  width?: string | number;
  height?: string | number;
  padding?: string | number;
  margin?: string | number;
  background?: string;
  border?: string;
  borderRadius?: string | number;
  boxShadow?: string;
  opacity?: number;
  transform?: string;
  transition?: string;
  animation?: string;
  cursor?: string;
  display?: string;
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  gap?: string | number;
  flexWrap?: string;
  position?: string;
  top?: string | number;
  left?: string | number;
  right?: string | number;
  bottom?: string | number;
  zIndex?: number;
  overflow?: string;
  textOverflow?: string;
  whiteSpace?: string;
  wordBreak?: string;
  fontSize?: string | number;
  fontWeight?: string | number;
  lineHeight?: string | number;
  letterSpacing?: string | number;
  textAlign?: string;
  textDecoration?: string;
  textTransform?: string;
  color?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
  borderStyle?: string;
  borderWidth?: string | number;
  borderColor?: string;
  outline?: string;
  outlineOffset?: string | number;
  filter?: string;
  backdropFilter?: string;
  mixBlendMode?: string;
  isolation?: string;
  clipPath?: string;
  maskImage?: string;
  maskSize?: string;
  maskPosition?: string;
  maskRepeat?: string;
  maskClip?: string;
  maskOrigin?: string;
  maskComposite?: string;
  maskMode?: string;
}
```

#### 样式规范

```typescript
interface StyleSpec {
  tokens: DesignTokens;
  theme: ThemeSpec;
  components: ComponentStyleSpec;
}

interface DesignTokens {
  colors: ColorTokens;
  spacing: SpacingTokens;
  typography: TypographyTokens;
  borderRadius: BorderRadiusTokens;
  shadows: ShadowTokens;
  transitions: TransitionTokens;
}

interface ColorTokens {
  primary: ColorScale;
  secondary: ColorScale;
  success: ColorScale;
  warning: ColorScale;
  error: ColorScale;
  neutral: ColorScale;
}

interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

interface SpacingTokens {
  0: string;
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
  6: string;
  8: string;
  10: string;
  12: string;
  16: string;
  20: string;
  24: string;
}

interface TypographyTokens {
  fontFamily: {
    sans: string[];
    mono: string[];
  };
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
  };
  fontWeight: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

interface BorderRadiusTokens {
  none: string;
  sm: string;
  base: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  full: string;
}

interface ShadowTokens {
  xs: string;
  sm: string;
  base: string;
  md: string;
  lg: string;
  xl: string;
}

interface TransitionTokens {
  fast: string;
  normal: string;
  slow: string;
}

interface ThemeSpec {
  name: string;
  mode: 'light' | 'dark';
  colors: ThemeColors;
}

interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  accent: string;
  muted: string;
  border: string;
  input: string;
  ring: string;
}

interface ComponentStyleSpec {
  [componentName: string]: ComponentStyle;
}
```

---

## 💻 代码生成规范

### 代码生成模板

#### React 组件模板

```typescript
import React from 'react';

interface {{ComponentName}}Props {
  {{#each props}}
  {{name}}: {{type}};
  {{/each}}
}

export function {{ComponentName}}({ {{#each props}}{{name}}, {{/each}} }: {{ComponentName}}Props) {
  return (
    <div className="{{className}}">
      {{children}}
    </div>
  );
}
```

#### TypeScript 类型模板

```typescript
export interface {{InterfaceName}} {
  {{#each properties}}
  {{name}}: {{type}};
  {{/each}}
}
```

#### 样式模板

```css
.{{className}} {
  {{#each styles}}
  {{property}}: {{value}};
  {{/each}}
}
```

### 代码生成规则

#### 命名规则

- **组件名**：PascalCase（如 `Button`、`InputField`）
- **文件名**：kebab-case（如 `button.tsx`、`input-field.tsx`）
- **变量名**：camelCase（如 `buttonText`、`inputValue`）
- **常量名**：UPPER_SNAKE_CASE（如 `MAX_LENGTH`、`DEFAULT_VALUE`）
- **类型名**：PascalCase（如 `ButtonProps`、`InputValue`）

#### 代码格式规则

- **缩进**：2 空格
- **引号**：单引号（JSX 属性使用双引号）
- **分号**：不使用分号
- **尾随逗号**：多行对象/数组使用尾随逗号
- **最大行宽**：100 字符

#### 注释规则

- **文件头注释**：包含文件描述、作者、版本等信息
- **函数注释**：包含函数描述、参数说明、返回值说明
- **复杂逻辑注释**：解释复杂算法和业务逻辑

### 代码生成流程

#### 1. 读取 Design JSON

```typescript
function readDesignJson(filePath: string): DesignRoot {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}
```

#### 2. 选择代码生成模板

```typescript
function selectTemplate(componentType: ComponentType): string {
  const templatePath = `./templates/${componentType}.hbs`;
  return fs.readFileSync(templatePath, 'utf-8');
}
```

#### 3. 填充模板数据

```typescript
function fillTemplate(template: string, data: any): string {
  const compiled = Handlebars.compile(template);
  return compiled(data);
}
```

#### 4. 生成代码

```typescript
function generateCode(designJson: DesignRoot): GeneratedCode[] {
  const codes: GeneratedCode[] = [];

  for (const component of designJson.components) {
    const template = selectTemplate(component.type);
    const data = transformComponentData(component);
    const code = fillTemplate(template, data);
    codes.push({
      fileName: `${kebabCase(component.type)}.tsx`,
      content: code,
    });
  }

  return codes;
}
```

#### 5. 格式化代码

```typescript
async function formatCode(code: string): Promise<string> {
  return await prettier.format(code, {
    parser: 'typescript',
    singleQuote: true,
    semi: false,
    trailingComma: 'es5',
    printWidth: 100,
  });
}
```

#### 6. 类型检查

```typescript
async function typeCheck(code: string): Promise<void> {
  const result = await tsc.compileString(code, {
    strict: true,
    noEmit: true,
  });

  if (result.diagnostics.length > 0) {
    throw new Error('Type check failed');
  }
}
```

#### 7. 写入文件

```typescript
function writeFile(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, 'utf-8');
}
```

---

## 🖥️ 智能终端切换功能

### 功能需求

1. 支持两种布局模式：编辑模式和预览模式
2. 根据布局模式智能调整终端显示范围
3. 终端显示/隐藏状态在模式切换时保持不变

### 逻辑规则

#### 编辑模式

- 终端只在右栏显示
- 终端宽度：右栏宽度（30%）
- 终端位置：右栏底部
- 左边距：70%（左栏25% + 中栏45%）

#### 预览模式

- 终端跨越中栏+右栏显示
- 终端宽度：合并区域宽度（75%）
- 终端位置：合并区域底部
- 左边距：25%（左栏宽度）

### 核心函数

#### 终端宽度计算

```typescript
function calculateTerminalWidth(layoutMode: 'edit' | 'preview', windowWidth: number): number {
  if (layoutMode === 'edit') {
    return windowWidth * 0.3;
  } else {
    return windowWidth * 0.75;
  }
}
```

#### 终端位置计算

```typescript
function calculateTerminalLeft(layoutMode: 'edit' | 'preview', windowWidth: number): number {
  if (layoutMode === 'edit') {
    return windowWidth * 0.7;
  } else {
    return windowWidth * 0.25;
  }
}
```

#### 模式切换

```typescript
function switchLayoutMode(currentMode: 'edit' | 'preview'): 'edit' | 'preview' {
  return currentMode === 'edit' ? 'preview' : 'edit';
}
```

#### 终端切换

```typescript
function toggleTerminal(terminalVisible: boolean): boolean {
  return !terminalVisible;
}
```

#### 高度调整

```typescript
function adjustHeight(newHeight: number): number {
  return Math.max(100, Math.min(400, newHeight));
}
```

### 状态管理

- **layoutMode**: 当前布局模式（'edit' | 'preview'）
- **terminalVisible**: 终端是否可见（boolean）
- **terminalHeight**: 终端高度（number，范围100-400）

### 交互逻辑

1. 点击终端切换按钮：切换终端显示/隐藏
2. 模式切换：终端宽度自动调整，显示状态保持不变
3. 拖拽调整：终端高度在100-400px范围内调整
4. 窗口调整：终端宽度自动重新计算

### 布局结构

- **左栏**：固定25%（AI对话面板 + 用户输入）
- **中栏**：编辑模式45%，预览模式合并到右栏
- **右栏**：编辑模式30%，预览模式合并到中栏
- **终端**：根据模式自动调整宽度和位置

---

**文档版本**: v1.0.0
**最后更新**: 2026-03-13
**维护团队**: YanYuCloudCube Team

---

<div align="center">

> **「YanYuCloudCube」**
> **言启象限 | 语枢未来**
> **Words Initiate Quadrants, Language Serves as Core for Future**
> **万象归元于云枢 | 深栈智启新纪元**
> **All things converge in cloud pivot; Deep stacks ignite a new era of intelligence**

</div>
