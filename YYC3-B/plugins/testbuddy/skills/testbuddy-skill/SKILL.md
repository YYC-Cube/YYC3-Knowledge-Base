---
name: testbuddy-skill
description: 文本测试用例生成技能包。任何有关于文本测试用例生成、文本测试用例框架生成、脑图用例生成、召回、需求分析等文本测试用例生成的相关问题，都可以使用此技能。
---

# Design Agent Skill 测试设计技能包

## 核心定位

本 skill 是一个**轻量级的意图识别和工作流调度器**，负责：
1. 识别用户意图
2. 加载必要的会话参数
3. 调用对应的工作流

**工作流负责**：
- 自己的执行清单规划
- 具体的执行逻辑
- 任务状态管理

## 执行流程

### 步骤 1：识别用户意图

根据用户请求的关键词，识别用户想要执行的操作：

| 用户意图 | 触发关键词 | 意图关键词 |
|---------|-----------|-----------|
| 生成测试框架 | `生成测试框架`、`生成框架`、`创建测试框架` | `框架生成` |
| 生成测试模块 | `生成测试模块`、`生成功能模块`、`识别测试模块` | `模块生成` |
| 生成测试场景 | `生成测试场景`、`生成场景`、`创建测试场景` | `场景生成` |
| 生成测试点 | `生成测试点`、`创建测试点`、`根据模块生成测试点` | `测试点生成` |
| 生成测试用例 | `生成测试用例`、`生成用例`、`根据测试点生成用例` | `用例生成` |

### 步骤 2：加载会话参数

使用 `tools/load_session.md` 工具读取上下文信息。

### 步骤 3：选择并调用工作流

1. **使用 select_workflow 工具**：
   - 调用 `tools/select_workflow.md` 工具
   - 传入步骤 1 识别的意图关键词（如"用例生成"、"框架生成"）

2. **调用工作流**：
   - 根据 `select_workflow` 返回的路径类型选择读取方式：
     - 如果路径以 `.codebuddy/rules/` 开头（自定义工作流）：使用 `read_rules` 读取
     - 如果路径以 `workflows/` 开头（默认工作流）：使用 `read_file` 读取
   - 交由工作流执行具体逻辑
   - 禁止不执行select_workflow流程直接读取文件/工作流


## 工作流能力矩阵（供参考）

| 生成目标 | 触发关键词 | 输入节点类型 | 输出节点类型 |
|---------|-----------|-------------|-------------|
| 测试框架 | `framework`/`框架` | STORY/BUG | FEATURE/SCENE/TEST_POINT |
| 测试模块 | `feature`/`模块` | STORY/BUG | FEATURE |
| 测试场景 | `scene`/`场景` | FEATURE/STORY/BUG | SCENE |
| 测试点 | `tpoint`/`testpoint`/`测试点` | FEATURE/SCENE/STORY/BUG | TEST_POINT |
| 测试用例 | `case`/`用例` | STORY/BUG/FEATURE/TEST_POINT/SCENE | CASE |

## 工具能力矩阵（供参考）

| 工具 | 功能 | 文档路径 |
|-----|------|----------|
| select_workflow | 智能选择工作流 | `tools/select_workflow.md` |
| select_rule | 智能选择规则 | `tools/select_rule.md` |
| load_session | 加载会话参数 | `tools/load_session.md` |
| add_nodes | 添加节点到脑图 | `tools/add_nodes.md` |
| update_nodes | 修改脑图节点 | `tools/update_nodes.md` |
| delete_nodes | 删除脑图节点 | `tools/delete_nodes.md` |
| search_nodes | 查询脑图节点 | `tools/search_nodes.md` |
| rag_search | 知识库检索 | `tools/rag_search.md` |

---
