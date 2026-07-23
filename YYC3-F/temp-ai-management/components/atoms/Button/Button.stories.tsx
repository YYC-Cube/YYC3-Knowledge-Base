import type { Meta, StoryObj } from "@storybook/react"
import { Plus, Download, ArrowRight, Trash2 } from "lucide-react"
import { Button } from "./Button"

const meta: Meta<typeof Button> = {
  title: "Atoms/Button",
  component: Button,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "按钮组件支持多种变体、尺寸和状态，适用于各种交互场景。",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "outline", "ghost", "danger", "success", "warning"],
      description: "按钮的视觉样式变体",
    },
    size: {
      control: "radio",
      options: ["sm", "md", "lg"],
      description: "按钮的尺寸大小",
    },
    loading: {
      control: "boolean",
      description: "是否显示加载状态",
    },
    disabled: {
      control: "boolean",
      description: "是否禁用按钮",
    },
    fullWidth: {
      control: "boolean",
      description: "是否占满父容器宽度",
    },
  },
}

export default meta
type Story = StoryObj<typeof Button>

/**
 * 默认主要按钮样式
 */
export const Primary: Story = {
  args: {
    children: "Primary Button",
    variant: "primary",
  },
}

/**
 * 次要按钮样式，用于非主要操作
 */
export const Secondary: Story = {
  args: {
    children: "Secondary Button",
    variant: "secondary",
  },
}

/**
 * 轮廓按钮，适合需要强调但不希望过于突出的场景
 */
export const Outline: Story = {
  args: {
    children: "Outline Button",
    variant: "outline",
  },
}

/**
 * 幽灵按钮，用于低优先级操作
 */
export const Ghost: Story = {
  args: {
    children: "Ghost Button",
    variant: "ghost",
  },
}

/**
 * 危险操作按钮，用于删除、取消等操作
 */
export const Danger: Story = {
  args: {
    children: "Delete",
    variant: "danger",
    leftIcon: <Trash2 className="h-4 w-4" />,
  },
}

/**
 * 成功状态按钮
 */
export const Success: Story = {
  args: {
    children: "Confirm",
    variant: "success",
  },
}

/**
 * 警告状态按钮
 */
export const Warning: Story = {
  args: {
    children: "Warning",
    variant: "warning",
  },
}

/**
 * 小尺寸按钮
 */
export const Small: Story = {
  args: {
    children: "Small Button",
    size: "sm",
  },
}

/**
 * 中等尺寸按钮（默认）
 */
export const Medium: Story = {
  args: {
    children: "Medium Button",
    size: "md",
  },
}

/**
 * 大尺寸按钮
 */
export const Large: Story = {
  args: {
    children: "Large Button",
    size: "lg",
  },
}

/**
 * 加载状态按钮
 */
export const Loading: Story = {
  args: {
    children: "Loading...",
    loading: true,
  },
}

/**
 * 禁用状态按钮
 */
export const Disabled: Story = {
  args: {
    children: "Disabled Button",
    disabled: true,
  },
}

/**
 * 🆕 加载状态 + 禁用组合
 */
export const LoadingDisabled: Story = {
  args: {
    children: "Processing...",
    loading: true,
    disabled: true,
    variant: "primary",
  },
}

/**
 * 带左侧图标的按钮
 */
export const WithLeftIcon: Story = {
  args: {
    children: "Add Item",
    leftIcon: <Plus className="h-4 w-4" />,
  },
}

/**
 * 带右侧图标的按钮
 */
export const WithRightIcon: Story = {
  args: {
    children: "Download",
    rightIcon: <Download className="h-4 w-4" />,
    variant: "secondary",
  },
}

/**
 * 同时带左右图标的按钮
 */
export const WithBothIcons: Story = {
  args: {
    children: "Continue",
    leftIcon: <Plus className="h-4 w-4" />,
    rightIcon: <ArrowRight className="h-4 w-4" />,
  },
}

/**
 * 全宽按钮，适合移动端或表单提交
 */
export const FullWidth: Story = {
  args: {
    children: "Submit Form",
    fullWidth: true,
  },
  decorators: [
    (Story) => (
      <div style={{ width: "400px" }}>
        <Story />
      </div>
    ),
  ],
}

/**
 * 仅图标按钮
 */
export const IconOnly: Story = {
  args: {
    children: <Download className="h-4 w-4" />,
    variant: "ghost",
    "aria-label": "Download",
  },
}

/**
 * 按钮组合示例
 */
export const ButtonGroup: Story = {
  render: () => (
    <div className="flex gap-2">
      <Button variant="outline">Cancel</Button>
      <Button variant="primary">Confirm</Button>
    </div>
  ),
}

/**
 * 所有变体展示
 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 flex-wrap">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="success">Success</Button>
        <Button variant="warning">Warning</Button>
      </div>
    </div>
  ),
}

/**
 * 所有尺寸展示
 */
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
}

/**
 * 🆕 所有状态组合展示
 */
export const AllStates: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Normal</h3>
        <Button>Normal</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Loading</h3>
        <Button loading>Loading</Button>
        <Button variant="secondary" loading>
          Loading
        </Button>
        <Button variant="outline" loading>
          Loading
        </Button>
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Disabled</h3>
        <Button disabled>Disabled</Button>
        <Button variant="secondary" disabled>
          Disabled
        </Button>
        <Button variant="outline" disabled>
          Disabled
        </Button>
      </div>
    </div>
  ),
}
