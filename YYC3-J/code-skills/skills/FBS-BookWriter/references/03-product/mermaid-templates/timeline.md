# Mermaid 时间线模�?

> 模板版本�?.0.0
> 更新日期�?026-03-23
> 图表类型：timeline
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

### 2.1 简单时间线

```mermaid
%%{init: { 'theme': 'base', 'themeVariables': { 'primaryColor': '[book.color]', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '[book.color]', 'lineColor': '[book.color]88', 'fontFamily': 'Source Han Sans SC, Microsoft YaHei, SimHei, sans-serif' } }}%%
timeline
  title 时间标题
    阶段一: 任务A
    阶段�? 任务B
    阶段�? 任务C
```

### 2.2 详细时间�?

```mermaid
%%{init: { 'theme': 'base', 'themeVariables': { 'primaryColor': '[book.color]', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '[book.color]', 'lineColor': '[book.color]88', 'fontFamily': 'Source Han Sans SC, Microsoft YaHei, SimHei, sans-serif' } }}%%
timeline
  title 项目阶段

    阶段一：规�?
      需求调�?
      方案设计
      评审通过

    阶段二：执行
      开发启�?
      迭代开�?
      测试验证

    阶段三：收尾
      上线部署
      用户培训
      项目验收
```

---

## 三、使用指�?

### 3.1 标签约束

| 约束 | 规则 |
|------|------|
| **最大字�?* | 单标�?�?5 个汉�?|
| 阶段划分 | 按时间或里程碑切�?|
| 任务描述 | 简洁的动宾结构 |

### 3.2 时间格式

```
阶段名：任务描述
  子任�?
  子任�?
```

### 3.3 图注约定

```markdown
```mermaid
timeline
  title 项目周期
    准备阶段: 调研
    开发阶�? 编码
    上线阶段: 部署
```
<!-- FIG: 7-1：项目实施时间线 -->
```

### 3.4 选择原则

| 适用 | 不适用 |
|------|--------|
| 阶段时间�?| 实时数据（用table�?|
| 项目实施过程 | 静态结构（用stateDiagram�?|
| 历史发展脉络 | 任务排期（用gantt�?|

---

## 四、模板速查

```mermaid
%%{init: { 'theme': 'base', 'themeVariables': { 'primaryColor': '[book.color]', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '[book.color]', 'lineColor': '[book.color]88', 'fontFamily': 'Source Han Sans SC, Microsoft YaHei, SimHei, sans-serif' } }}%%
timeline
  title 阶段概览
    阶段一: 任务A
    阶段�? 任务B
    阶段�? 任务C
```
