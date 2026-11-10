import type { Meta, StoryObj } from "@storybook/react"
import { Check, AlertCircle } from "lucide-react"
import { Badge } from "./Badge"

const meta = {
  title: "Atoms/Badge",
  component: Badge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: "Badge",
  },
}

export const Primary: Story = {
  args: {
    variant: "primary",
    children: "Primary",
  },
}

export const Success: Story = {
  args: {
    variant: "success",
    children: "Success",
  },
}

export const Warning: Story = {
  args: {
    variant: "warning",
    children: "Warning",
  },
}

export const Danger: Story = {
  args: {
    variant: "danger",
    children: "Danger",
  },
}

export const Info: Story = {
  args: {
    variant: "info",
    children: "Info",
  },
}

export const WithLeftIcon: Story = {
  args: {
    variant: "success",
    leftIcon: <Check className="h-3 w-3" />,
    children: "Verified",
  },
}

export const WithRightIcon: Story = {
  args: {
    variant: "warning",
    rightIcon: <AlertCircle className="h-3 w-3" />,
    children: "Pending",
  },
}

export const Removable: Story = {
  args: {
    variant: "primary",
    removable: true,
    children: "Removable",
    onRemove: () => alert("Remove clicked"),
  },
}

export const Small: Story = {
  args: {
    size: "sm",
    children: "Small",
  },
}

export const Large: Story = {
  args: {
    size: "lg",
    children: "Large",
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="primary">Primary</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="danger">Danger</Badge>
      <Badge variant="info">Info</Badge>
      <Badge variant="purple">Purple</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
}

export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="success" leftIcon={<Check className="h-3 w-3" />}>
        Active
      </Badge>
      <Badge variant="warning" leftIcon={<AlertCircle className="h-3 w-3" />}>
        Pending
      </Badge>
      <Badge variant="danger">Inactive</Badge>
      <Badge variant="info">Draft</Badge>
    </div>
  ),
}

export const Tags: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="primary" removable>
        React
      </Badge>
      <Badge variant="primary" removable>
        TypeScript
      </Badge>
      <Badge variant="primary" removable>
        Next.js
      </Badge>
      <Badge variant="primary" removable>
        Tailwind
      </Badge>
    </div>
  ),
}
