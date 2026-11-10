# YYC3 Skills - 能力包集合

> ***YanYuCloudCube***
> 言启象限 | 语枢未来
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> 万象归元于云枢 | 深栈智启新纪元
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

## 概述

YYC3 Skills是可复用的能力包，让Claude AI稳定地按同一套方法进行开发。

## 核心Skills

### 1. yyc3-stack-master - 技术栈专家

精通Next.js 15, React 19, TypeScript, Tailwind CSS的全栈开发规范。

**能力**:

- Next.js 15 App Router开发
- React 19组件设计
- TypeScript类型系统
- Tailwind CSS样式
- Bun运行时优化

**使用场景**:

- 初始化新项目
- 技术选型决策
- 代码规范检查

### 2. yyc3-five-highs - 五高五标五化设计规范

YYC3核心理念：五高、五标、五化的完整设计规范。

**能力**:

- 五高设计评审
- 五标规范化检查
- 五化架构评估
- 质量保证清单

**使用场景**:

- UI/UX设计评审
- 产品需求分析
- 用户体验优化

### 3. yyc3-ai-integration - AI能力集成专家

GLM-4.7模型集成、RAG检索增强生成、Prompt工程。

**能力**:

- GLM-4.7模型集成
- OpenAI API调用
- RAG系统实现
- Prompt优化
- 流式响应处理

**使用场景**:

- AI功能开发
- 智能浮窗系统开发
- AI Agent平台建设

### 4. yyc3-microservices - 微服务架构专家

Docker容器化、微服务拆分策略、API设计。

**能力**:

- 微服务架构设计
- Docker容器化
- API设计规范
- 服务间通信
- 分布式事务

**使用场景**:

- 后端系统架构
- 服务拆分决策
- API设计评审

### 5. yyc3-deployment-ops - 部署运维专家

阿里云ECS部署、NAS存储配置、CI/CD流程。

**能力**:

- 阿里云ECS部署
- NAS存储配置
- FRP内网穿透
- CI/CD流程
- 监控告警配置

**使用场景**:

- 项目部署
- 环境配置
- 性能监控

## 目录结构

```
skills/
├── README.md
├── yyc3-stack-master/
│   ├── skill.json
│   ├── instructions.md
│   ├── templates/
│   └── examples/
├── yyc3-five-highs/
│   ├── skill.json
│   ├── instructions.md
│   ├── templates/
│   └── examples/
├── yyc3-ai-integration/
│   ├── skill.json
│   ├── instructions.md
│   ├── templates/
│   └── examples/
├── yyc3-microservices/
│   ├── skill.json
│   ├── instructions.md
│   ├── templates/
│   └── examples/
└── yyc3-deployment-ops/
    ├── skill.json
    ├── instructions.md
    ├── templates/
    └── examples/
```

## 使用方法

### 在Claude Code中使用

当需要特定技能时，Claude会自动加载对应的Skill：

```
你: 创建一个Next.js 15的用户管理页面

Claude: [自动加载 yyc3-stack-master]
    我是YYC3技术栈专家，让我为你创建...
```

### 手动指定Skill

```
你: 使用 yyc3-five-highs 评审这个设计
```

## 扩展Skills

### 创建新Skill

1. 在skills/目录创建新文件夹
2. 创建skill.json定义元信息
3. 创建instructions.md说明使用方法
4. 可选：添加templates/和examples/

### Skill.json模板

```json
{
  "name": "your-skill-name",
  "displayName": "显示名称",
  "description": "技能描述",
  "version": "1.0.0",
  "author": "YYC3 AI Team",
  "tags": ["tag1", "tag2"],
  "capabilities": [
    "能力1",
    "能力2"
  ],
  "metadata": {
    "createdAt": "2026-01-29",
    "updatedAt": "2026-01-29",
    "category": "category",
    "priority": "high"
  }
}
```

## 维护指南

### 更新Skill

1. 修改instructions.md或skill.json
2. 更新version字段
3. 更新updatedAt字段
4. 提交变更

### 版本管理

- 主版本：破坏性变更
- 次版本：功能新增
- 修订版本：bug修复

## 最佳实践

1. **保持专注**: 每个Skill应该专注于一个领域
2. **文档完整**: instructions.md应该详细且可执行
3. **示例丰富**: 提供可运行的代码示例
4. **定期更新**: 根据项目发展持续改进

## 相关文档

- [AGENTIC-ECOSYSTEM-DESIGN.md](../AGENTIC-ECOSYSTEM-DESIGN.md)
- [YYC3-STANDARD-WORKFLOW.md](../workflow-templates/YYC3-STANDARD-WORKFLOW.md)
- [SUBAGENTS-CONFIG.md](../subagents/SUBAGENTS-CONFIG.md)

---

**创建时间**: 2026-01-29
**版本**: v1.0.0
**维护者**: YYC3 AI Team
