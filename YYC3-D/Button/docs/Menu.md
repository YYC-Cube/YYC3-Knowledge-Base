导航组件提示词

### 1.1 Menu（菜单组件）

#### 核心提示词

```
设计一个功能完善的Menu组件，支持导航菜单和YYC³双主题系统。

核心功能需求：
1. 基础属性：
   - items：菜单项列表
   - mode：模式（horizontal | vertical | inline）
   - selectedKeys：选中项
   - defaultSelectedKeys：默认选中项
   - openKeys：展开项（子菜单）
   - defaultOpenKeys：默认展开项

2. 菜单项：
   - Menu.Item：菜单项
   - Menu.SubMenu：子菜单
   - Menu.ItemGroup：菜单项分组
   - Menu.Divider：分割线

3. 主题适配：
   - 赛博朋克主题：霓虹边框、深色背景、发光效果
   - 液态玻璃主题：毛玻璃背景、柔和阴影、半透明效果

4. 交互效果：
   - 展开/收起动画
   - 选中高亮
   - 悬停效果

5. 图标支持：
   - itemIcon：菜单项图标
   - expandIcon：展开图标

技术要求：
- React 18+ 函数组件
- TypeScript 类型定义完整
- 支持 forwardRef
- 支持 className 合并
- 纯原生设计；无外部、第三方依赖（仅依赖 React）

设计规范：
- 高度：40px
- 内边距：0 16px
- 字体大小：14px
```

#### 使用示例

```tsx
import { Menu } from '@yyc3/claw-ui';

const items = [
  {
    key: '1',
    label: '首页',
    icon: <Icon name="home" />
  },
  {
    key: '2',
    label: '关于',
    icon: <Icon name="info" />
  },
  {
    key: '3',
    label: '子菜单',
    icon: <Icon name="menu" />,
    children: [
      { key: '3-1', label: '子菜单项1' },
      { key: '3-2', label: '子菜单项2' }
    ]
  }
];

<Menu 
  mode="horizontal" 
  items={items}
  defaultSelectedKeys={['1']}
/>
```

---

### 1.2 Tabs（标签页组件）

#### 核心提示词

```
设计一个功能完善的Tabs组件，支持标签页切换和YYC³双主题系统。

核心功能需求：
1. 基础属性：
   - items：标签页列表
   - activeKey：当前激活的标签
   - defaultActiveKey：默认激活的标签
   - type：类型（line | card | editable-card）
   - size：尺寸（small | default | large）

2. 标签页项：
   - TabPane：标签页面板（已废弃，使用items）
   - key：唯一标识
   - label：标签名
   - icon：图标
   - disabled：禁用
   - closable：可关闭

3. 主题适配：
   - 赛博朋克主题：霓虹边框、发光效果
   - 液态玻璃主题：柔和阴影

4. 交互功能：
   - 标签切换
   - 新增标签（editable类型）
   - 删除标签（editable类型）
   - 拖拽排序

5. 额外功能：
   - tabBarExtraContent：标签栏额外内容
   - tabBarGutter：标签间距
   - tabPosition：标签位置（top | left | right | bottom）

技术要求：
- React 18+ 函数组件
- TypeScript 类型定义完整
- 支持 forwardRef
- 支持 className 合并
- 纯原生设计；无外部、第三方依赖（仅依赖 React）

设计规范：
- 高度：40px
- 内边距：0 16px
- 字体大小：14px
```

#### 使用示例

```tsx
import { Tabs } from '@yyc3/claw-ui';

const items = [
  {
    key: '1',
    label: '标签1',
    children: <div>内容1</div>
  },
  {
    key: '2',
    label: '标签2',
    children: <div>内容2</div>
  }
];

<Tabs items={items} defaultActiveKey="1" />

// 可编辑标签
<Tabs 
  type="editable-card"
  items={items}
  onEdit={(targetKey, action) => {
    if (action === 'add') {
      // 新增标签
    } else {
      // 删除标签
    }
  }}
/>
```

---

### 1.3 Breadcrumb（面包屑组件）

#### 核心提示词

```
设计一个Breadcrumb组件，用于面包屑导航，支持YYC³双主题系统。

核心功能需求：
1. 基础属性：
   - items：面包屑项列表
   - separator：分隔符（默认'/'）

2. 面包屑项：
   - Breadcrumb.Item：面包屑项
   - href：链接地址
   - overlay：下拉菜单

3. 主题适配：
   - 赛博朋克主题：霓虹发光效果
   - 液态玻璃主题：柔和阴影

4. 自动生成：
   - 根据路由自动生成面包屑

技术要求：
- React 18+ 函数组件
- TypeScript 类型定义完整
- 支持 forwardRef
- 支持 className 合并
- 纯原生设计；无外部、第三方依赖（仅依赖 React）

设计规范：
- 高度：32px
- 字体大小：14px
- 分隔符间距：8px
```

#### 使用示例

```tsx
import { Breadcrumb } from '@yyc3/claw-ui';

const items = [
  {
    title: '首页',
    href: '/'
  },
  {
    title: '列表',
    href: '/list'
  },
  {
    title: '详情'
  }
];

<Breadcrumb items={items} />
```

---

### 5.4 Pagination（分页组件）

#### 核心提示词

```
设计一个Pagination组件，用于分页导航，支持YYC³双主题系统。

核心功能需求：
1. 基础属性：
   - current：当前页码
   - defaultCurrent：默认当前页码
   - total：数据总数
   - pageSize：每页条数
   - defaultPageSize：默认每页条数
   - pageSizeOptions：每页条数选项

2. 样式类型：
   - default：默认样式
   - simple：简洁样式
   - mini：迷你样式

3. 主题适配：
   - 赛博朋克主题：霓虹发光效果
   - 液态玻璃主题：柔和阴影

4. 功能选项：
   - showSizeChanger：显示每页条数选择器
   - showQuickJumper：显示快速跳转
   - showTotal：显示总数
   - showLessItems：显示更少页码

技术要求：
- React 18+ 函数组件
- TypeScript 类型定义完整
- 支持 forwardRef
- 支持 className 合并
- 纯原生设计；无外部、第三方依赖（仅依赖 React）

设计规范：
- 高度：32px
- 字体大小：14px
- 按钮间距：4px
```

#### 使用示例

```tsx
import { Pagination } from '@yyc3/claw-ui';

<Pagination 
  current={current}
  total={100}
  pageSize={10}
  onChange={(page, pageSize) => {
    console.log('页码:', page, '每页条数:', pageSize);
  }}
  showSizeChanger
  showQuickJumper
  showTotal={(total) => `共 ${total} 条`}
/>
```

---

### 1.5 Dropdown（下拉菜单组件）

#### 核心提示词

```
设计一个Dropdown组件，用于下拉菜单，支持YYC³双主题系统。

核心功能需求：
1. 基础属性：
   - menu：菜单配置
   - trigger：触发方式（hover | click | contextMenu）
   - placement：位置（bottomLeft | bottomCenter | bottomRight等）
   - visible：是否显示
   - defaultVisible：默认是否显示

2. 菜单配置：
   - items：菜单项列表
   - onClick：点击回调

3. 主题适配：
   - 赛博朋克主题：霓虹边框、深色背景、发光效果
   - 液态玻璃主题：毛玻璃背景、柔和阴影、半透明效果

4. 交互效果：
   - 显示/隐藏动画
   - 箭头指示

5. 按钮下拉：
   - Dropdown.Button：带按钮的下拉菜单

技术要求：
- React 18+ 函数组件
- TypeScript 类型定义完整
- 支持 forwardRef
- 支持 className 合并
- 纯原生设计；无外部、第三方依赖（仅依赖 React）

设计规范：
- 圆角：4px
- 内边距：4px 0
- 菜单项高度：32px
```

#### 使用示例

```tsx
import { Dropdown } from '@yyc3/claw-ui';

const menu = {
  items: [
    {
      key: '1',
      label: '选项1'
    },
    {
      key: '2',
      label: '选项2'
    },
    {
      type: 'divider'
    },
    {
      key: '3',
      label: '选项3',
      danger: true
    }
  ],
  onClick: ({ key }) => {
    console.log('点击了:', key);
  }
};

<Dropdown menu={menu}>
  <Button>下拉菜单</Button>
</Dropdown>

// 带按钮的下拉菜单
<Dropdown.Button menu={menu}>
  操作
</Dropdown.Button>
```

---