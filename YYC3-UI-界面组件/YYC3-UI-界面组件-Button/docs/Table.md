数据展示组件提示词

### 1.1 Table（表格组件）

#### 核心提示词

```
设计一个功能完善的Table组件，支持数据展示和YYC³双主题系统。

核心功能需求：
1. 基础属性：
   - columns：列配置
   - dataSource：数据源
   - rowKey：行键
   - loading：加载状态
   - pagination：分页配置

2. 列配置：
   - title：列标题
   - dataIndex：数据字段名
   - key：唯一标识
   - width：列宽度
   - align：对齐方式
   - fixed：固定列
   - sorter：排序
   - filters：筛选
   - render：自定义渲染

3. 选择功能：
   - rowSelection：行选择配置
   - selectedRowKeys：选中行
   - onChange：选择变化回调

4. 主题适配：
   - 赛博朋克主题：霓虹边框、深色背景、发光效果
   - 液态玻璃主题：毛玻璃背景、柔和阴影、半透明效果

5. 高级功能：
   - 可编辑表格
   - 树形表格
   - 虚拟滚动
   - 拖拽排序

技术要求：
- React 18+ 函数组件
- TypeScript 类型定义完整
- 支持 forwardRef
- 支持 className 合并
- 纯原生设计；无外部、第三方依赖（仅依赖 React）

设计规范：
- 表头高度：54px
- 行高：54px
- 内边距：16px
- 边框宽度：1px
```

#### 使用示例

```tsx
import { Table } from '@yyc3/claw-ui';

const columns = [
  {
    title: '姓名',
    dataIndex: 'name',
    key: 'name',
    sorter: (a, b) => a.name.localeCompare(b.name)
  },
  {
    title: '年龄',
    dataIndex: 'age',
    key: 'age',
    sorter: (a, b) => a.age - b.age
  },
  {
    title: '地址',
    dataIndex: 'address',
    key: 'address'
  }
];

const dataSource = [
  { key: '1', name: '张三', age: 32, address: '北京市朝阳区' },
  { key: '2', name: '李四', age: 28, address: '上海市浦东新区' }
];

<Table 
  columns={columns}
  dataSource={dataSource}
  pagination={{ pageSize: 10 }}
/>
```

---

### 1.2 List（列表组件）

#### 核心提示词

```
设计一个List组件，用于列表展示，支持YYC³双主题系统。

核心功能需求：
1. 基础属性：
   - dataSource：数据源
   - renderItem：自定义渲染项
   - loading：加载状态
   - pagination：分页配置
   - grid：网格布局

2. 列表项：
   - List.Item：列表项
   - List.Item.Meta：列表项元信息

3. 主题适配：
   - 赛博朋克主题：霓虹边框、深色背景、发光效果
   - 液态玻璃主题：毛玻璃背景、柔和阴影、半透明效果

4. 布局模式：
   - 列表布局
   - 网格布局

5. 无限加载：
   - loadMore：加载更多
   - hasMore：是否还有更多

技术要求：
- React 18+ 函数组件
- TypeScript 类型定义完整
- 支持 forwardRef
- 支持 className 合并
- 纯原生设计；无外部、第三方依赖（仅依赖 React）

设计规范：
- 行高：54px
- 内边距：12px 16px
- 边框宽度：1px
```

#### 使用示例

```tsx
import { List } from '@yyc3/claw-ui';

const data = [
  '项目1',
  '项目2',
  '项目3'
];

<List
  dataSource={data}
  renderItem={(item) => (
    <List.Item>
      {item}
    </List.Item>
  )}
/>
```

---

### 1.3 Tree（树组件）

#### 核心提示词

```
设计一个Tree组件，用于树形数据展示，支持YYC³双主题系统。

核心功能需求：
1. 基础属性：
   - treeData：树形数据
   - selectedKeys：选中节点
   - checkedKeys：勾选节点
   - expandedKeys：展开节点
   - checkable：是否显示复选框

2. 节点配置：
   - title：节点标题
   - key：节点键
   - children：子节点
   - disabled：禁用
   - selectable：是否可选择
   - checkable：是否可勾选

3. 主题适配：
   - 赛博朋克主题：霓虹发光效果
   - 液态玻璃主题：柔和阴影

4. 交互功能：
   - 展开/收起
   - 选择
   - 勾选
   - 拖拽

5. 搜索功能：
   - 搜索节点
   - 高亮匹配项

技术要求：
- React 18+ 函数组件
- TypeScript 类型定义完整
- 支持 forwardRef
- 支持 className 合并
- 纯原生设计；无外部、第三方依赖（仅依赖 React）

设计规范：
- 行高：32px
- 内边距：4px 8px
- 缩进：24px
```

#### 使用示例

```tsx
import { Tree } from '@yyc3/claw-ui';

const treeData = [
  {
    title: '节点1',
    key: '1',
    children: [
      {
        title: '子节点1-1',
        key: '1-1'
      },
      {
        title: '子节点1-2',
        key: '1-2'
      }
    ]
  },
  {
    title: '节点2',
    key: '2'
  }
];

<Tree 
  treeData={treeData}
  defaultExpandAll
  checkable
/>
```

---

### 1.4 VirtualList（虚拟列表组件）

#### 核心提示词

```
设计一个VirtualList组件，用于大数据渲染，支持YYC³双主题系统。

核心功能需求：
1. 基础属性：
   - data：数据源
   - itemHeight：项目高度
   - containerHeight：容器高度
   - renderItem：渲染函数

2. 性能优化：
   - 虚拟滚动
   - 动态高度支持
   - 缓冲区渲染

3. 主题适配：
   - 赛博朋克主题：霓虹发光效果
   - 液态玻璃主题：柔和阴影

4. 交互功能：
   - 滚动事件
   - 滚动到指定位置

技术要求：
- React 18+ 函数组件
- TypeScript 类型定义完整
- 支持 forwardRef
- 支持 className 合并
- 纯原生设计；无外部、第三方依赖（仅依赖 React）

设计规范：
- 容器高度：自适应
- 项目高度：可配置
```

#### 使用示例

```tsx
import { VirtualList } from '@yyc3/claw-ui';

const data = Array.from({ length: 10000 }, (_, index) => ({
  id: index,
  text: `项目 ${index}`
}));

<VirtualList
  data={data}
  itemHeight={50}
  containerHeight={600}
  renderItem={(item, index) => (
    <div style={{ height: 50 }}>
      {item.text}
    </div>
  )}
/>
```

---