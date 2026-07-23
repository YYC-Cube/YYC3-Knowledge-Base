# Mermaid 状态图模板

> 模板版本�?.0.0
> 更新日期�?026-03-23
> 图表类型：stateDiagram-v2
> 引用位置：`templates.md` §�?

---

## 一、标准注入头

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '[book.color]',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '[book.color]',
    'lineColor': '[book.color]88',
    'secondaryColor': '[book.lightBg]',
    'tertiaryColor': '[book.accentBg]',
    'fontFamily': 'Source Han Sans SC, Microsoft YaHei, SimHei, sans-serif'
  }
}}%%
```

---

## 二、基础模板

### 2.1 简单状态转�?

```mermaid
%%{init: { 'theme': 'base', 'themeVariables': { 'primaryColor': '[book.color]', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '[book.color]', 'lineColor': '[book.color]88', 'fontFamily': 'Source Han Sans SC, Microsoft YaHei, SimHei, sans-serif' } }}%%
stateDiagram-v2
  [*] --> 初始状�?
  初始状�?--> 进行�? 事件A
  进行�?--> 完成: 事件B
  完成 --> [*]
```

### 2.2 多状态分�?

```mermaid
%%{init: { 'theme': 'base', 'themeVariables': { 'primaryColor': '[book.color]', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '[book.color]', 'lineColor': '[book.color]88', 'fontFamily': 'Source Han Sans SC, Microsoft YaHei, SimHei, sans-serif' } }}%%
stateDiagram-v2
  [*] --> 待处�?

  state 待处�?{
    [*] --> 审核�?
    审核�?--> 审核通过: 批准
    审核�?--> 审核拒绝: 拒绝
  }

  审核通过 --> 已发�? 上线
  审核拒绝 --> 待处�? 重新提交
  已发�?--> [*]
```

### 2.3 状态与动作

```mermaid
%%{init: { 'theme': 'base', 'themeVariables': { 'primaryColor': '[book.color]', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '[book.color]', 'lineColor': '[book.color]88', 'fontFamily': 'Source Han Sans SC, Microsoft YaHei, SimHei, sans-serif' } }}%%
stateDiagram-v2
  [*] --> 空闲

  state 空闲 {
    [*] --> idle_entry: 进入
    idle_entry --> idle: 完成
    idle --> idle_exit: 退�?
    idle_exit --> [*]: 离开
  }

  空闲 --> 活动�? 激�?
  活动�?--> 空闲: 结束
```

---

## 三、使用指�?

### 3.1 状态命名约�?

| 约束 | 规则 |
|------|------|
| **最大字�?* | 状态名 �?5 个汉�?|
| 动宾结构 | 使用"动词+名词"：`审核中`、`已完成` |
| 简洁�?| 避免过长描述 |

### 3.2 转换标注

```mermaid
%%{init: { 'theme': 'base', 'themeVariables': { 'primaryColor': '[book.color]', 'lineColor': '[book.color]88' } }}%%
stateDiagram-v2
  [*] --> A
  A --> B: 事件/条件
```

### 3.3 图注约定

```markdown
```mermaid
stateDiagram-v2
  [*] --> 待处�?
  待处�?--> 已完�? 完成
  已完�?--> [*]
```
<!-- FIG: 5-1：任务状态流�?-->
```

### 3.4 选择原则

| 适用 | 不适用 |
|------|--------|
| 状态变�?生命周期 | 步骤流程（用flowchart�?|
| 阶段转换场景 | 并行活动（用flowchart�?|
| 对象状态管�?| 角色交互（用sequenceDiagram�?|

---

## 四、模板速查

```mermaid
%%{init: { 'theme': 'base', 'themeVariables': { 'primaryColor': '[book.color]', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '[book.color]', 'lineColor': '[book.color]88', 'fontFamily': 'Source Han Sans SC, Microsoft YaHei, SimHei, sans-serif' } }}%%
stateDiagram-v2
  [*] --> 状态A
  状态A --> 状态B: 事件
  状态B --> 状态C: 事件
  状态C --> [*]
```
