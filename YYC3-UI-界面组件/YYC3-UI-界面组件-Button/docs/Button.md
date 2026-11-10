

# 1.1 Button（按钮组件）

## 核心提示词

```
设计一个高度可定制的Button组件，支持YYC³双主题系统（赛博朋克/液态玻璃）。

核心功能需求：
1. 多种变体（variant）：
   - primary：主要按钮，用于核心操作
   - secondary：次要按钮，用于辅助操作
   - outline：轮廓按钮，用于非强调操作
   - ghost：幽灵按钮，用于低优先级操作
   - danger：危险按钮，用于删除、警告等操作

2. 多种尺寸（size）：
   - small：小尺寸，用于紧凑布局
   - medium：中等尺寸，默认尺寸
   - large：大尺寸，用于重要操作

3. 状态管理：
   - loading：加载状态，显示Spinner
   - disabled：禁用状态，不可点击
   - active：激活状态，用于切换按钮

4. 主题适配：
   - 赛博朋克主题：霓虹发光效果、渐变边框、深色背景
   - 液态玻璃主题：毛玻璃效果、柔和阴影、半透明背景

5. 交互效果：
   - hover：悬停时发光增强、背景变化
   - active：点击时缩小效果、颜色加深
   - focus：焦点时显示轮廓、键盘导航支持

6. 图标支持：
   - leftIcon：左侧图标
   - rightIcon：右侧图标
   - iconOnly：仅图标模式

7. 可访问性：
   - 支持键盘导航（Tab、Enter、Space）
   - ARIA属性完整
   - 焦点管理

技术要求：
- React 18+ 函数组件
- TypeScript 类型定义完整
- 支持 forwardRef
- 支持 className 合并
- 支持 style 属性覆盖
- 纯原生设计；无外部、第三方依赖（仅依赖 React）

设计规范：
- 圆角：4px-8px
- 内边距：small(4px 12px), medium(8px 16px), large(12px 20px)
- 字体大小：small(14px), medium(16px), large(18px)
- 过渡动画：200ms ease-in-out
```

## 使用示例

```tsx
import { Button } from '@yyc3/claw-ui';

// 基础使用
<Button variant="primary" size="medium">
  主要按钮
</Button>

// 加载状态
<Button variant="primary" loading>
  提交中...
</Button>

// 图标按钮
<Button variant="outline" leftIcon={<Icon name="plus" />}>
  新增
</Button>

// 危险操作
<Button variant="danger" onClick={handleDelete}>
  删除
</Button>
```

---

## 1.2 Input（输入框组件）

### 核心提示词

```
设计一个功能完善的Input组件，支持多种输入场景和YYC³双主题系统。

核心功能需求：
1. 基础属性：
   - type：text, password, email, number, search, textarea
   - placeholder：占位文本
   - value：受控值
   - defaultValue：非受控默认值
   - maxLength：最大长度
   - disabled：禁用状态
   - readOnly：只读状态

2. 增强功能：
   - prefix：前缀内容（图标、文本）
   - suffix：后缀内容（图标、文本、清除按钮）
   - allowClear：显示清除按钮
   - showCount：显示字数统计
   - passwordToggle：密码可见性切换

3. 验证状态：
   - error：错误状态，显示错误信息
   - warning：警告状态，显示警告信息
   - success：成功状态，显示成功图标

4. 尺寸支持：
   - small：小尺寸
   - medium：中等尺寸
   - large：大尺寸

5. 主题适配：
   - 赛博朋克主题：霓虹边框、深色背景、发光效果
   - 液态玻璃主题：毛玻璃背景、柔和边框、半透明效果

6. 交互效果：
   - focus：焦点时边框发光、显示轮廓
   - hover：悬停时边框变化
   - disabled：禁用时背景变暗、文字变灰

7. 事件处理：
   - onChange：值变化回调
   - onFocus：获得焦点回调
   - onBlur：失去焦点回调
   - onPressEnter：回车键回调

技术要求：
- React 18+ 函数组件
- TypeScript 类型定义完整
- 支持 forwardRef
- 支持 className 合并
- 支持 style 属性覆盖
- 纯原生设计；无外部、第三方依赖（仅依赖 React）

设计规范：
- 圆角：4px
- 内边距：small(4px 8px), medium(8px 12px), large(12px 16px)
- 字体大小：small(14px), medium(16px), large(18px)
- 边框宽度：1px
- 过渡动画：200ms ease-in-out
```

### 使用示例

```tsx
import { Input } from '@yyc3/claw-ui';

// 基础输入框
<Input 
  placeholder="请输入内容" 
  onChange={(e) => console.log(e.target.value)}
/>

// 带前缀和后缀
<Input 
  prefix={<Icon name="search" />}
  suffix={<Icon name="close" />}
  placeholder="搜索..."
/>

// 密码输入框
<Input 
  type="password"
  passwordToggle
  placeholder="请输入密码"
/>

// 带验证状态
<Input 
  status="error"
  errorMessage="用户名不能为空"
  placeholder="请输入用户名"
/>

// 文本域
<Input 
  type="textarea"
  rows={4}
  maxLength={200}
  showCount
  placeholder="请输入描述"
/>
```

---

## 1.3 Card（卡片组件）

### 核心提示词

```
设计一个灵活的Card组件，用于内容展示和布局，支持YYC³双主题系统。

核心功能需求：
1. 结构组成：
   - Card.Header：卡片头部（标题、操作按钮）
   - Card.Body：卡片主体（内容区域）
   - Card.Footer：卡片底部（操作区域、备注）
   - Card.Image：卡片图片（可选）

2. 基础属性：
   - title：卡片标题
   - extra：右上角操作区域
   - bordered：是否显示边框
   - hoverable：是否显示悬停效果
   - loading：加载状态
   - shadow：阴影级别（none, small, medium, large）

3. 主题适配：
   - 赛博朋克主题：霓虹边框、深色背景、发光效果
   - 液态玻璃主题：毛玻璃背景、柔和阴影、半透明效果

4. 交互效果：
   - hover：悬停时阴影增强、轻微上浮
   - loading：显示骨架屏或加载动画

5. 布局支持：
   - grid：网格布局模式
   - responsive：响应式布局

技术要求：
- React 18+ 函数组件
- TypeScript 类型定义完整
- 支持 forwardRef
- 支持 className 合并
- 支持 style 属性覆盖
- 纯原生设计；无外部、第三方依赖（仅依赖 React）

设计规范：
- 圆角：8px
- 内边距：16px
- 边框宽度：1px
- 阴影：0 2px 8px rgba(0, 0, 0, 0.1)
- 过渡动画：300ms ease-in-out
```

### 使用示例

```tsx
import { Card } from '@yyc3/claw-ui';

// 基础卡片
<Card title="卡片标题" extra={<a href="#">更多</a>}>
  <p>卡片内容</p>
</Card>

// 无边框卡片
<Card bordered={false} hoverable>
  <p>无边框卡片内容</p>
</Card>

// 加载状态
<Card loading>
  <p>加载中的卡片</p>
</Card>

// 带图片的卡片
<Card>
  <Card.Image src="image.jpg" alt="图片描述" />
  <Card.Header title="图片卡片" />
  <Card.Body>
    <p>卡片描述内容</p>
  </Card.Body>
  <Card.Footer>
    <Button size="small">操作</Button>
  </Card.Footer>
</Card>
```

---

## 1.4 Modal（模态框组件）

### 核心提示词

```
设计一个功能完善的Modal组件，支持多种使用场景和YYC³双主题系统。

核心功能需求：
1. 基础属性：
   - visible：是否显示
   - title：标题
   - width：宽度（string | number）
   - centered：是否垂直居中
   - closable：是否显示关闭按钮
   - mask：是否显示遮罩
   - maskClosable：点击遮罩是否关闭
   - destroyOnClose：关闭时是否销毁子元素

2. 位置控制：
   - top：距离顶部距离
   - centered：垂直居中

3. 动画效果：
   - fade：淡入淡出
   - zoom：缩放
   - slide：滑动
   - 自定义动画

4. 主题适配：
   - 赛博朋克主题：霓虹边框、深色背景、发光效果
   - 液态玻璃主题：毛玻璃背景、柔和阴影、半透明效果

5. 交互功能：
   - ESC键关闭
   - 滚动锁定
   - 焦点陷阱（Focus Trap）
   - 键盘导航

6. 确认对话框：
   - confirm：确认对话框
   - info：信息对话框
   - success：成功对话框
   - error：错误对话框
   - warning：警告对话框

7. 生命周期：
   - afterOpen：打开后回调
   - afterClose：关闭后回调

技术要求：
- React 18+ 函数组件
- TypeScript 类型定义完整
- 支持 Portal 渲染
- 支持 forwardRef
- 支持 className 合并
- 纯原生设计；无外部、第三方依赖（仅依赖 React）

设计规范：
- 圆角：8px
- 内边距：24px
- 阴影：0 4px 12px rgba(0, 0, 0, 0.15)
- 遮罩透明度：0.45
- 过渡动画：300ms ease-in-out
```

### 使用示例

```tsx
import { Modal, Button } from '@yyc3/claw-ui';

// 基础模态框
const [visible, setVisible] = useState(false);

<Button onClick={() => setVisible(true)}>打开模态框</Button>

<Modal
  title="模态框标题"
  visible={visible}
  onOk={() => setVisible(false)}
  onCancel={() => setVisible(false)}
>
  <p>模态框内容</p>
</Modal>

// 确认对话框
Modal.confirm({
  title: '确认删除',
  content: '删除后数据将无法恢复，确定要删除吗？',
  okText: '确认',
  cancelText: '取消',
  onOk: () => {
    console.log('确认删除');
  },
  onCancel: () => {
    console.log('取消删除');
  }
});

// 信息对话框
Modal.info({
  title: '提示信息',
  content: '这是一条重要信息'
});
```

---

## 1.5 Badge（徽章组件）

### 核心提示词

```
设计一个灵活的Badge组件，用于状态标识和数字提示，支持YYC³双主题系统。

核心功能需求：
1. 基础属性：
   - count：显示数字
   - dot：显示小红点
   - text：自定义文本
   - color：自定义颜色
   - overflowCount：最大显示数字（默认99）

2. 状态类型：
   - success：成功状态（绿色）
   - warning：警告状态（橙色）
   - error：错误状态（红色）
   - info：信息状态（蓝色）
   - default：默认状态（灰色）

3. 位置控制：
   - offset：偏移量 [x, y]
   - placement：位置（topRight, topLeft, bottomRight, bottomLeft）

4. 主题适配：
   - 赛博朋克主题：霓虹发光效果
   - 液态玻璃主题：柔和阴影

5. 独立使用：
   - 不包裹子元素时独立显示

技术要求：
- React 18+ 函数组件
- TypeScript 类型定义完整
- 支持 forwardRef
- 支持 className 合并
- 纯原生设计；无外部、第三方依赖（仅依赖 React）

设计规范：
- 圆角：10px（圆形）
- 字体大小：12px
- 内边距：0 6px
- 最小宽度：18px
- 高度：18px
```

### 使用示例

```tsx
import { Badge } from '@yyc3/claw-ui';

// 数字徽章
<Badge count={5}>
  <Icon name="bell" />
</Badge>

// 小红点
<Badge dot>
  <Icon name="notification" />
</Badge>

// 状态徽章
<Badge status="success" text="成功" />
<Badge status="error" text="错误" />

// 独立使用
<Badge count={99} />

// 超出最大值
<Badge count={100} overflowCount={99}>
  <Icon name="mail" />
</Badge>
```

---

## 1.6 Avatar（头像组件）

### 核心提示词

```
设计一个灵活的Avatar组件，用于用户头像展示，支持YYC³双主题系统。

核心功能需求：
1. 基础属性：
   - src：图片地址
   - alt：替代文本
   - icon：图标
   - text：文字头像
   - size：尺寸（number | 'small' | 'medium' | 'large')
   - shape：形状（circle | square）

2. 加载失败处理：
   - 显示默认图标
   - 显示文字头像
   - 自定义fallback

3. 状态指示器：
   - status：在线状态（online | offline | busy | away）
   - statusPosition：状态位置（bottomRight | topLeft）

4. 主题适配：
   - 赛博朋克主题：霓虹边框、发光效果
   - 液态玻璃主题：柔和阴影

5. 头像组：
   - Avatar.Group：头像组组件
   - maxCount：最多显示数量
   - excessItemsStyle：超出部分样式

技术要求：
- React 18+ 函数组件
- TypeScript 类型定义完整
- 支持 forwardRef
- 支持 className 合并
- 纯原生设计；无外部、第三方依赖（仅依赖 React）

设计规范：
- 圆角：50%（圆形）、4px（方形）
- 尺寸：small(24px), medium(32px), large(40px)
- 字体大小：small(14px), medium(16px), large(18px)
```

### 使用示例

```tsx
import { Avatar } from '@yyc3/claw-ui';

// 图片头像
<Avatar src="user.jpg" alt="用户名" />

// 图标头像
<Avatar icon={<Icon name="user" />} />

// 文字头像
<Avatar text="YYC" />

// 带状态的头像
<Avatar src="user.jpg" status="online" />

// 头像组
<Avatar.Group maxCount={3}>
  <Avatar src="user1.jpg" />
  <Avatar src="user2.jpg" />
  <Avatar src="user3.jpg" />
  <Avatar src="user4.jpg" />
  <Avatar src="user5.jpg" />
</Avatar.Group>
```

---
