表单组件提示词

### 1.1 Form（表单组件）

#### 核心提示词

```
设计一个功能完善的Form组件，支持表单验证和YYC³双主题系统。

核心功能需求：
1. 基础属性：
   - initialValues：初始值
   - onFinish：提交回调
   - onFinishFailed：提交失败回调
   - onValuesChange：值变化回调
   - validateMessages：验证消息模板

2. 表单项：
   - Form.Item：表单项组件
   - name：字段名
   - label：标签
   - rules：验证规则
   - required：是否必填
   - help：帮助信息
   - validateStatus：验证状态

3. 验证规则：
   - required：必填
   - min：最小长度
   - max：最大长度
   - pattern：正则表达式
   - validator：自定义验证器

4. 布局模式：
   - horizontal：水平布局
   - vertical：垂直布局
   - inline：行内布局

5. 主题适配：
   - 赛博朋克主题：霓虹边框、深色背景、发光效果
   - 液态玻璃主题：毛玻璃背景、柔和阴影、半透明效果

6. 表单方法：
   - getFieldsValue：获取所有字段值
   - setFieldsValue：设置字段值
   - validateFields：验证字段
   - resetFields：重置字段

技术要求：
- React 18+ 函数组件
- TypeScript 类型定义完整
- 支持 forwardRef
- 支持 className 合并
- 纯原生设计；无外部、第三方依赖（仅依赖 React）

设计规范：
- 标签宽度：100px
- 内边距：16px
- 间距：16px
```

#### 使用示例

```tsx
import { Form, Input, Button } from '@yyc3/claw-ui';

const Demo = () => {
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    console.log('表单值:', values);
  };

  return (
    <Form
      form={form}
      onFinish={onFinish}
      layout="vertical"
    >
      <Form.Item
        name="username"
        label="用户名"
        rules={[{ required: true, message: '请输入用户名' }]}
      >
        <Input placeholder="请输入用户名" />
      </Form.Item>
      
      <Form.Item
        name="email"
        label="邮箱"
        rules={[
          { required: true, message: '请输入邮箱' },
          { type: 'email', message: '请输入有效的邮箱地址' }
        ]}
      >
        <Input placeholder="请输入邮箱" />
      </Form.Item>
      
      <Form.Item>
        <Button type="primary" htmlType="submit">
          提交
        </Button>
      </Form.Item>
    </Form>
  );
};
```

---

### 1.2 Select（选择器组件）

#### 核心提示词

```
设计一个功能完善的Select组件，支持单选、多选和YYC³双主题系统。

核心功能需求：
1. 基础属性：
   - value：当前值
   - defaultValue：默认值
   - options：选项列表
   - placeholder：占位文本
   - disabled：禁用状态
   - allowClear：允许清除
   - showSearch：支持搜索

2. 选择模式：
   - 单选模式
   - 多选模式（mode="multiple"）
   - 标签模式（mode="tags"）

3. 搜索功能：
   - 本地搜索
   - 远程搜索
   - 自定义搜索逻辑

4. 分组功能：
   - 选项分组
   - 分组标题

5. 主题适配：
   - 赛博朋克主题：霓虹边框、深色背景、发光效果
   - 液态玻璃主题：毛玻璃背景、柔和阴影、半透明效果

6. 交互效果：
   - 下拉动画
   - 选项高亮
   - 键盘导航

技术要求：
- React 18+ 函数组件
- TypeScript 类型定义完整
- 支持 forwardRef
- 支持 className 合并
- 纯原生设计；无外部、第三方依赖（仅依赖 React）

设计规范：
- 高度：32px
- 内边距：8px 12px
- 下拉圆角：4px
- 选项高度：32px
```

#### 使用示例

```tsx
import { Select } from '@yyc3/claw-ui';

// 单选
<Select
  placeholder="请选择"
  options={[
    { value: 'option1', label: '选项1' },
    { value: 'option2', label: '选项2' }
  ]}
/>

// 多选
<Select
  mode="multiple"
  placeholder="请选择多个"
  options={[
    { value: 'option1', label: '选项1' },
    { value: 'option2', label: '选项2' }
  ]}
/>

// 搜索
<Select
  showSearch
  placeholder="搜索并选择"
  filterOption={(input, option) =>
    option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0
  }
  options={options}
/>

// 分组
<Select
  placeholder="请选择"
  options={[
    {
      label: '分组1',
      options: [
        { value: '1-1', label: '选项1-1' },
        { value: '1-2', label: '选项1-2' }
      ]
    },
    {
      label: '分组2',
      options: [
        { value: '2-1', label: '选项2-1' },
        { value: '2-2', label: '选项2-2' }
      ]
    }
  ]}
/>
```

---

### 1.3 Checkbox（复选框组件）

#### 核心提示词

```
设计一个功能完善的Checkbox组件，支持复选和YYC³双主题系统。

核心功能需求：
1. 基础属性：
   - checked：是否选中
   - defaultChecked：默认是否选中
   - disabled：禁用状态
   - indeterminate：不确定状态

2. 复选框组：
   - Checkbox.Group：复选框组
   - options：选项列表
   - value：选中值列表
   - onChange：变化回调

3. 主题适配：
   - 赛博朋克主题：霓虹边框、发光效果
   - 液态玻璃主题：柔和阴影

4. 交互效果：
   - 选中动画
   - 禁用状态

技术要求：
- React 18+ 函数组件
- TypeScript 类型定义完整
- 支持 forwardRef
- 支持 className 合并
- 纯原生设计；无外部、第三方依赖（仅依赖 React）

设计规范：
- 尺寸：16px
- 圆角：2px
- 边框宽度：1px
```

#### 使用示例

```tsx
import { Checkbox } from '@yyc3/claw-ui';

// 基础复选框
<Checkbox>复选框</Checkbox>

// 复选框组
const options = [
  { label: '选项1', value: '1' },
  { label: '选项2', value: '2' },
  { label: '选项3', value: '3' }
];

<Checkbox.Group options={options} defaultValue={['1', '2']} />

// 不确定状态
<Checkbox indeterminate={indeterminate}>全选</Checkbox>
```

---

### 1.4 Radio（单选框组件）

#### 核心提示词

```
设计一个功能完善的Radio组件，支持单选和YYC³双主题系统。

核心功能需求：
1. 基础属性：
   - checked：是否选中
   - defaultChecked：默认是否选中
   - disabled：禁用状态
   - value：值

2. 单选框组：
   - Radio.Group：单选框组
   - options：选项列表
   - value：当前值
   - onChange：变化回调
   - buttonStyle：按钮样式（outline | solid）

3. 按钮样式：
   - Radio.Button：按钮样式单选框

4. 主题适配：
   - 赛博朋克主题：霓虹边框、发光效果
   - 液态玻璃主题：柔和阴影

5. 交互效果：
   - 选中动画
   - 禁用状态

技术要求：
- React 18+ 函数组件
- TypeScript 类型定义完整
- 支持 forwardRef
- 支持 className 合并
- 纯原生设计；无外部、第三方依赖（仅依赖 React）

设计规范：
- 尺寸：16px
- 圆角：50%
- 边框宽度：1px
```

#### 使用示例

```tsx
import { Radio } from '@yyc3/claw-ui';

// 基础单选框
<Radio>单选框</Radio>

// 单选框组
<Radio.Group defaultValue="1">
  <Radio value="1">选项1</Radio>
  <Radio value="2">选项2</Radio>
</Radio.Group>

// 按钮样式
<Radio.Group defaultValue="1" buttonStyle="solid">
  <Radio.Button value="1">选项1</Radio.Button>
  <Radio.Button value="2">选项2</Radio.Button>
</Radio.Group>
```

---

### 1.5 Switch（开关组件）

#### 核心提示词

```
设计一个功能完善的Switch组件，支持开关切换和YYC³双主题系统。

核心功能需求：
1. 基础属性：
   - checked：是否选中
   - defaultChecked：默认是否选中
   - disabled：禁用状态
   - loading：加载状态
   - size：尺寸（small | default）

2. 文本支持：
   - checkedChildren：选中时文本
   - unCheckedChildren：未选中时文本

3. 主题适配：
   - 赛博朋克主题：霓虹发光效果
   - 液态玻璃主题：柔和阴影

4. 交互效果：
   - 切换动画
   - 加载动画

技术要求：
- React 18+ 函数组件
- TypeScript 类型定义完整
- 支持 forwardRef
- 支持 className 合并
- 纯原生设计；无外部、第三方依赖（仅依赖 React）

设计规范：
- 宽度：44px（default）、28px（small）
- 高度：22px（default）、16px（small）
- 圆角：100px
```

#### 使用示例

```tsx
import { Switch } from '@yyc3/claw-ui';

// 基础开关
<Switch />

// 带文本的开关
<Switch 
  checkedChildren="开" 
  unCheckedChildren="关" 
/>

// 加载状态
<Switch loading />

// 小尺寸
<Switch size="small" />
```

---

### 1.6 DatePicker（日期选择器组件）

#### 核心提示词

```
设计一个功能完善的DatePicker组件，支持日期选择和YYC³双主题系统。

核心功能需求：
1. 基础属性：
   - value：当前值
   - defaultValue：默认值
   - placeholder：占位文本
   - disabled：禁用状态
   - format：日期格式

2. 选择模式：
   - date：日期选择
   - range：日期范围选择
   - time：时间选择
   - datetime：日期时间选择

3. 限制功能：
   - disabledDate：禁用日期
   - minDate：最小日期
   - maxDate：最大日期

4. 主题适配：
   - 赛博朋克主题：霓虹边框、深色背景、发光效果
   - 液态玻璃主题：毛玻璃背景、柔和阴影、半透明效果

5. 快捷选择：
   - 今天、昨天、本周、本月等快捷选项

技术要求：
- React 18+ 函数组件
- TypeScript 类型定义完整
- 支持 forwardRef
- 支持 className 合并
- 纯原生设计；无外部、第三方依赖（仅依赖 React）

设计规范：
- 高度：32px
- 内边距：8px 12px
- 日历圆角：8px
```

#### 使用示例

```tsx
import { DatePicker } from '@yyc3/claw-ui';

// 日期选择
<DatePicker placeholder="选择日期" />

// 日期范围选择
<DatePicker.RangePicker placeholder={['开始日期', '结束日期']} />

// 时间选择
<DatePicker.TimePicker placeholder="选择时间" />

// 日期时间选择
<DatePicker showTime placeholder="选择日期时间" />
```

---