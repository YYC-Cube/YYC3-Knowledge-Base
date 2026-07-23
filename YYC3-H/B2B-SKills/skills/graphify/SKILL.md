---
name: graphify
description: "B2B销售智能知识图谱引擎。基于产品目录、客户对话和市场研究构建可查询图谱。由 graphify 驱动。"
---

# Graphify — 销售智能知识图谱

基于产品目录、客户对话和市场研究构建知识图谱，发现隐藏关联、交叉销售机会和竞争洞察。

基于 [graphify](https://github.com/safishamsi/graphify) — 针对 B2B SDR 场景适配。

## 触发条件

- 手动："构建产品知识图谱"
- 手动："映射客户关系"
- 手动："分析竞争格局"
- 定时（可选）：lead-discovery 更新后每周重建

## 前置条件

```bash
# 确认 graphify 已安装
python3 -c "import graphify" 2>/dev/null || pip install graphifyy -q --break-system-packages 2>&1 | tail -3
```

## 使用场景

### 1. 产品目录图谱

基于 `product-kb/` 构建图谱，理解产品关系、共享认证、重叠目标市场和交叉销售路径。

**使用时机：** 报价前、BANT 资质评估期间、客户询问相关产品时。

```bash
python3 -c "
import json
from graphify.extract import collect_files, extract
from graphify.build import build
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections
from pathlib import Path

# 从产品目录提取
files = collect_files(Path('product-kb'))
ast_result = extract(files)

# 构建并分析
G = build([ast_result])
communities, labels = cluster(G)
cohesion = score_all(G, communities)

gods = god_nodes(G, top_n=5)
surprises = surprising_connections(G, communities, top_n=5)

print('=== 核心产品（关键节点） ===')
for g in gods:
    print(f'  {g[\"label\"]} — {g[\"edges\"]} 个连接')

print('=== 意外关联 ===')
for s in surprises:
    print(f'  {s[\"source\"]} ↔ {s[\"target\"]} [{s[\"confidence\"]}]')
"
```

**图谱洞察驱动的销售动作：**
- 关键节点 = 锚点产品 → 在陌生开发中优先推荐
- 意外关联 = 非显而易见的交叉销售路径 → "购买 X 的客户通常也需要 Y"
- 社区 = 产品家族 → 捆绑定价机会

### 2. 客户智能图谱

基于对话历史和 CRM 数据构建图谱，映射客户关系、识别采购模式、寻找暖引荐路径。

**数据来源：**
- ChromaDB 对话历史（`chroma:recall`）
- CRM 记录（Google Sheets）
- Supermemory 研究笔记（`memory:search`）

**提取内容（语义提取，非 AST）：**
- 公司 → 员工（决策者、影响者）
- 公司 → 已购买或询价的产品
- 公司 → 公司（同行业、同区域、竞争对手）
- 人物 → 人物（引荐、共同联系人）
- 订单 → 产品、时间线、异议

**图谱洞察驱动的销售动作：**
- 按行为聚类客户 → 为每个聚类定制培育活动
- 寻找桥接节点（连接不同分段的客户） → 引荐候选人
- 检测孤立节点（无跟进的客户） → 停滞线索恢复

### 3. 市场研究图谱

基于 lead-discovery 研究、竞品情报和存储在 Supermemory 中的市场信号构建图谱。

**提取内容：**
- 竞品 → 产品、定价、市场
- 市场 → 趋势、法规、展会
- 客户 → 同时购买的其他竞品
- 区域 → 季节性需求模式

**图谱洞察驱动的销售动作：**
- 市场间意外关联 → 扩张机会
- 竞品聚类 → 差异化策略
- 市场关键节点 → lead-discovery 轮换优先区域

## 图谱查询（运行时）

构建图谱后，可查询特定销售智能：

```bash
# 广度优先搜索 — 获取某主题的广泛上下文
python3 -m graphify query "液压挖掘机认证" --budget 1500

# 深度优先搜索 — 追踪特定关系链
python3 -m graphify query "迪拜客户车队" --dfs --budget 1000
```

**适用时机：**
- 回答产品问题前 → 查询产品图谱获取规格和关系
- 准备报价前 → 在图谱中查找交叉销售机会
- 陌生开发前 → 从研究图谱了解目标客户的市场背景

## 图谱导出

```bash
python3 -c "
from graphify.export import to_json, to_html
from graphify.build import build_from_json
from pathlib import Path
import json

data = json.loads(Path('graphify-out/graph.json').read_text())
G = build_from_json(data)

# 交互式 HTML，用于所有者仪表盘
to_html(G, Path('graphify-out/graph.html'))

# JSON 格式，用于程序化访问
to_json(G, Path('graphify-out/graph.json'))
"
```

- **HTML**：交互式 vis.js 图谱 — 分享给所有者以查看管线全貌
- **JSON**：机器可读 — 用于报表或 CRM 数据增强
- **报告**：`graphify-out/GRAPH_REPORT.md` — 关键节点、社区、知识盲区

## 输出格式（向所有者报告）

```
产品知识图谱：
- X 个节点 · Y 条边 · Z 个社区
- 核心产品：[关键节点列表]
- 交叉销售机会：[意外关联]
- 知识盲区：[缺失规格的孤立产品]

建议：更新 product-kb 中的 [盲区产品] 以提升图谱覆盖率。
```

## 与其他技能的集成

| 技能 | Graphify 如何协助 |
|------|-------------------|
| **lead-discovery** | 搜索前查询市场图谱 → 更精准定位 |
| **quotation-generator** | 查询产品图谱 → 在报价中纳入相关产品 |
| **chroma-memory** | 提供对话数据 → 构建客户智能图谱 |
| **supermemory** | 提供研究笔记 → 构建市场研究图谱 |
| **sdr-humanizer** | 图谱上下文 → 更具相关性、个性化的对话 |

## 重建策略

- **产品图谱**：`product-kb/` 变更时重建（新产品、更新规格）
- **客户图谱**：每周从 ChromaDB + CRM 快照重建
- **市场图谱**：lead-discovery 运行后重建（每日10:00产出）

图谱存储在 `graphify-out/` — 跨会话持久化，随时可查询。
