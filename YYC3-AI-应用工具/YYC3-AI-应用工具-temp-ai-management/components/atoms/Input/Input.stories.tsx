"use client"

import type { Meta, StoryObj } from "@storybook/react"
import { Mail, Lock, Search, Eye, EyeOff } from "lucide-react"
import { Input } from "./Input"
import { useState } from "react"

const meta = {
  title: "Atoms/Input",
  component: Input,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "error", "success"],
    },
    inputSize: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    disabled: {
      control: "boolean",
    },
    required: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    placeholder: "Enter text...",
  },
}

export const WithLabel: Story = {
  args: {
    label: "Email Address",
    placeholder: "you@example.com",
  },
}

export const WithError: Story = {
  args: {
    label: "Email Address",
    placeholder: "you@example.com",
    error: "Please enter a valid email address",
    variant: "error",
  },
}

export const WithHelperText: Story = {
  args: {
    label: "Username",
    placeholder: "johndoe",
    helperText: "Choose a unique username",
  },
}

export const Required: Story = {
  args: {
    label: "Password",
    type: "password",
    required: true,
    placeholder: "Enter your password",
  },
}

export const WithLeftIcon: Story = {
  args: {
    label: "Email",
    placeholder: "you@example.com",
    leftIcon: <Mail className="h-4 w-4" />,
  },
}

export const WithRightIcon: Story = {
  args: {
    label: "Search",
    placeholder: "Search...",
    rightIcon: <Search className="h-4 w-4" />,
  },
}

export const PasswordWithToggle: Story = {
  render: () => {
    const [showPassword, setShowPassword] = useState(false)

    return (
      <Input
        label="Password"
        type={showPassword ? "text" : "password"}
        placeholder="Enter your password"
        leftIcon={<Lock className="h-4 w-4" />}
        rightIcon={
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="hover:text-gray-700">
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
      />
    )
  },
}

export const Small: Story = {
  args: {
    inputSize: "sm",
    placeholder: "Small input",
  },
}

export const Medium: Story = {
  args: {
    inputSize: "md",
    placeholder: "Medium input",
  },
}

export const Large: Story = {
  args: {
    inputSize: "lg",
    placeholder: "Large input",
  },
}

export const Disabled: Story = {
  args: {
    label: "Disabled Input",
    placeholder: "Cannot edit",
    disabled: true,
  },
}

export const Success: Story = {
  args: {
    label: "Email",
    value: "john@example.com",
    variant: "success",
    helperText: "Email verified successfully",
  },
}

export const AllStates: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <Input label="Default" placeholder="Default state" />
      <Input label="With Value" defaultValue="Sample text" />
      <Input label="Error" error="This field is required" variant="error" />
      <Input label="Success" value="Valid input" variant="success" />
      <Input label="Disabled" disabled placeholder="Disabled" />
    </div>
  ),
  parameters: {
    layout: "padded",
  },
}
