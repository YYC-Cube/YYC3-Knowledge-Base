"use client"

import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { Plus } from "lucide-react"
import { Button } from "./Button"

describe("Button", () => {
  it("renders children correctly", () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole("button")).toHaveTextContent("Click me")
  })

  it("applies variant classes", () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>)
    expect(screen.getByRole("button")).toHaveClass("bg-blue-600")

    rerender(<Button variant="danger">Danger</Button>)
    expect(screen.getByRole("button")).toHaveClass("bg-red-600")
  })

  it("applies size classes", () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    expect(screen.getByRole("button")).toHaveClass("h-8")

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole("button")).toHaveClass("h-12")
  })

  it("renders with left icon", () => {
    render(<Button leftIcon={<Plus data-testid="plus-icon" />}>Add</Button>)
    expect(screen.getByTestId("plus-icon")).toBeInTheDocument()
  })

  it("renders with right icon", () => {
    render(<Button rightIcon={<Plus data-testid="plus-icon" />}>Next</Button>)
    expect(screen.getByTestId("plus-icon")).toBeInTheDocument()
  })

  it("shows loading spinner when loading", () => {
    render(<Button loading>Loading</Button>)
    expect(screen.getByRole("button")).toContainHTML("animate-spin")
  })

  it("is disabled when loading", () => {
    render(<Button loading>Loading</Button>)
    expect(screen.getByRole("button")).toBeDisabled()
  })

  it("is disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole("button")).toBeDisabled()
  })

  it("calls onClick handler", () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    fireEvent.click(screen.getByRole("button"))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("does not call onClick when disabled", () => {
    const handleClick = vi.fn()
    render(
      <Button disabled onClick={handleClick}>
        Click me
      </Button>,
    )

    fireEvent.click(screen.getByRole("button"))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it("applies fullWidth class", () => {
    render(<Button fullWidth>Full Width</Button>)
    expect(screen.getByRole("button")).toHaveClass("w-full")
  })

  it("forwards ref correctly", () => {
    const ref = vi.fn()
    render(<Button ref={ref}>Button</Button>)
    expect(ref).toHaveBeenCalled()
  })

  it("applies custom className", () => {
    render(<Button className="custom-class">Button</Button>)
    expect(screen.getByRole("button")).toHaveClass("custom-class")
  })

  it("supports all HTML button attributes", () => {
    render(
      <Button type="submit" name="submit-btn" value="submit">
        Submit
      </Button>,
    )
    const button = screen.getByRole("button")
    expect(button).toHaveAttribute("type", "submit")
    expect(button).toHaveAttribute("name", "submit-btn")
    expect(button).toHaveAttribute("value", "submit")
  })
})
