反馈组件提示词

### 1.1 Toast（轻提示组件）

#### 核心提示词

```
设计一个全局Toast组件，用于轻量级消息提示，支持YYC³双主题系统。

核心功能需求：
1. 消息类型：
   - success：成功消息
   - error：错误消息
   - warning：警告消息
   - info：信息消息
   - loading：加载消息

2. 基础属性：
   - message：消息内容
   - description：详细描述
   - duration：显示时长（默认3秒）
   - position：位置（top | topLeft | topRight | bottom | bottomLeft | bottomRight）

3. 交互功能：
   - 可关闭
   - 悬停时暂停计时
   - 点击回调

4. 主题适配：
   - 赛博朋克主题：霓虹发光效果
   - 液态玻璃主题：毛玻璃背景、柔和阴影

5. 全局方法：
   - Toast.success()
   - Toast.error()
   - Toast.warning()
   - Toast.info()
   - Toast.loading()

技术要求：
- React 18+ 函数组件
- TypeScript 类型定义完整
- 支持全局调用
- 纯原生设计；无外部、第三方依赖（仅依赖 React）

设计规范：
- 圆角：4px
- 内边距：12px 16px
- 阴影：0 4px 12px rgba(0, 0, 0, 0.15)
```

#### 使用示例

```tsx
import { Toast } from '@yyc3/claw-ui';

// 成功提示
Toast.success('操作成功');

// 错误提示
Toast.error('操作失败，请重试');

// 警告提示
Toast.warning('请注意风险');

// 信息提示
Toast.info('这是一条信息');

// 加载提示
const hide = Toast.loading('加载中...');
setTimeout(() => hide(), 2000);

// 带描述的提示
Toast.success({
  message: '操作成功',
  description: '您的数据已成功保存'
});
```

---

### 1.2 Alert（警告框组件）

#### 核心提示词

```
设计一个Alert组件，用于页面内警告提示，支持YYC³双主题系统。

核心功能需求：
1. 警告类型：
   - success：成功
   - info：信息
   - warning：警告
   - error：错误

2. 基础属性：
   - message：标题
   - description：详细描述
   - closable：是否可关闭
   - showIcon：是否显示图标
   - banner：是否作为顶部公告

3. 操作按钮：
   - action：操作按钮区域

4. 主题适配：
   - 赛博朋克主题：霓虹边框、发光效果
   - 液态玻璃主题：柔和阴影

5. 交互效果：
   - 关闭动画
   - 图标动画

技术要求：
- React 18+ 函数组件
- TypeScript 类型定义完整
- 支持 forwardRef
- 支持 className 合并
- 纯原生设计；无外部、第三方依赖（仅依赖 React）

设计规范：
- 圆角：4px
- 内边距：8px 16px
- 边框宽度：1px
```

#### 使用示例

```tsx
import { Alert } from '@yyc3/claw-ui';

// 成功警告
<Alert 
  type="success" 
  message="成功提示" 
  description="这是一条成功提示信息"
  showIcon
/>

// 可关闭的警告
<Alert 
  type="warning" 
  message="警告提示" 
  closable
  afterClose={() => console.log('关闭了')}
/>

// 带操作的警告
<Alert 
  type="error" 
  message="错误提示" 
  action={
    <Button size="small" type="primary">
      重试
    </Button>
  }
/>

// 顶部公告
<Alert 
  banner 
  message="系统公告：系统将于今晚22:00进行维护" 
/>
```

---

### 1.3 Progress（进度条组件）

#### 核心提示词

```
设计一个Progress组件，用于进度展示，支持YYC³双主题系统。

核心功能需求：
1. 进度类型：
   - line：线性进度条
   - circle：环形进度条
   - dashboard：仪表盘进度条

2. 基础属性：
   - percent：百分比（0-100）
   - status：状态（success | exception | active | normal）
   - showInfo：是否显示进度信息
   - strokeWidth：线条宽度
   - width：宽度（circle类型）

3. 主题适配：
   - 赛博朋克主题：霓虹发光效果
   - 液态玻璃主题：柔和阴影

4. 交互效果：
   - 进度动画
   - 状态变化动画

5. 步骤进度：
   - steps：步骤数
   - 当前步骤高亮

技术要求：
- React 18+ 函数组件
- TypeScript 类型定义完整
- 支持 forwardRef
- 支持 className 合并
- 纯原生设计；无外部、第三方依赖（仅依赖 React）

设计规范：
- 线性高度：8px
- 环形宽度：120px
- 线条宽度：6px
```

#### 使用示例

```tsx
import { Progress } from '@yyc3/claw-ui';

// 线性进度条
<Progress percent={30} />

// 环形进度条
<Progress type="circle" percent={75} />

// 仪表盘进度条
<Progress type="dashboard" percent={75} />

// 步骤进度条
<Progress percent={60} steps={5} />

// 成功状态
<Progress percent={100} status="success" />

// 异常状态
<Progress percent={70} status="exception" />
```

---

### 1.4 Loading（加载组件）

#### 核心提示词

```
设计一个Loading组件，用于加载状态展示，支持YYC³双主题系统。

核心功能需求：
1. 加载类型：
   - spinner：旋转加载
   - dots：点状加载
   - bar：条状加载
   - skeleton：骨架屏

2. 基础属性：
   - spinning：是否加载中
   - size：尺寸（small | default | large）
   - tip：加载提示文字
   - delay：延迟显示时间

3. 包裹容器：
   - 包裹内容区域
   - 遮罩层

4. 主题适配：
   - 赛博朋克主题：霓虹发光效果
   - 液态玻璃主题：柔和阴影

5. 骨架屏：
   - Skeleton：骨架屏组件
   - Skeleton.Image：图片骨架
   - Skeleton.Input：输入框骨架
   - Skeleton.Button：按钮骨架

技术要求：
- React 18+ 函数组件
- TypeScript 类型定义完整
- 支持 forwardRef
- 支持 className 合并
- 纯原生设计；无外部、第三方依赖（仅依赖 React）

设计规范：
- 尺寸：small(16px), default(24px), large(32px)
- 动画时长：1s
```

#### 使用示例

```tsx
import { Loading, Skeleton } from '@yyc3/claw-ui';

// 基础加载
<Loading />

// 带提示的加载
<Loading tip="加载中..." />

// 包裹容器
<Loading spinning={loading}>
  <div>内容区域</div>
</Loading>

// 骨架屏
<Skeleton active />

// 图片骨架
<Skeleton.Image active />

// 输入框骨架
<Skeleton.Input active />

// 按钮骨架
<Skeleton.Button active />
```

---

### 1.5 Tooltip（提示组件）

#### 核心提示词

```
设计一个Tooltip组件，用于悬浮提示，支持YYC³双主题系统。

核心功能需求：
1. 基础属性：
   - title：提示内容
   - placement：位置（top | left | right | bottom | topLeft | topRight等）
   - trigger：触发方式（hover | click | focus）
   - visible：是否显示
   - defaultVisible：默认是否显示

2. 主题适配：
   - 赛博朋克主题：霓虹边框、深色背景、发光效果
   - 液态玻璃主题：毛玻璃背景、柔和阴影、半透明效果

3. 交互效果：
   - 显示/隐藏动画
   - 箭头指示

4. 延迟显示：
   - mouseEnterDelay：鼠标移入延迟
   - mouseLeaveDelay：鼠标移出延迟

技术要求：
- React 18+ 函数组件
- TypeScript 类型定义完整
- 支持 forwardRef
- 支持 className 合并
- 纯原生设计；无外部、第三方依赖（仅依赖 React）

设计规范：
- 圆角：4px
- 内边距：6px 8px
- 字体大小：12px
- 最大宽度：250px
```

#### 使用示例

```tsx
import { Tooltip } from '@yyc3/claw-ui';

// 基础提示
<Tooltip title="提示内容">
  <Button>悬停显示提示</Button>
</Tooltip>

// 不同位置
<Tooltip title="顶部提示" placement="top">
  <Button>顶部</Button>
</Tooltip>

<Tooltip title="左侧提示" placement="left">
  <Button>左侧</Button>
</Tooltip>

// 点击触发
<Tooltip title="点击提示" trigger="click">
  <Button>点击显示提示</Button>
</Tooltip>
```

---
