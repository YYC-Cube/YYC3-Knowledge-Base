# @yanyu-cloud/ui

YanYu Cloud³ UI Component Library - A modern, accessible, and customizable React component library.

## Features

- 🎨 **Design Tokens** - Consistent design system
- ♿ **Accessible** - WCAG 2.1 compliant
- 🎯 **TypeScript** - Full type safety
- 📦 **Tree-shakeable** - Import only what you need
- 🎭 **Themeable** - Light/dark mode support
- 📱 **Responsive** - Mobile-first design
- 🧪 **Well-tested** - Comprehensive test coverage
- 📖 **Documented** - Storybook documentation

## Installation

\`\`\`bash
npm install @yanyu-cloud/ui

# or

yarn add @yanyu-cloud/ui

# or

pnpm add @yanyu-cloud/ui
\`\`\`

## Quick Start

\`\`\`tsx
import { Button, Input, Badge } from '@yanyu-cloud/ui'
import '@yanyu-cloud/ui/dist/index.css'

function App() {
return (
<>
<Button variant="primary">Click Me</Button>
<Input label="Email" placeholder="you@example.com" />
<Badge variant="success">Active</Badge>
</>
)
}
\`\`\`

## Components

### Button

\`\`\`tsx
import { Button } from '@yanyu-cloud/ui'
import { Plus } from 'lucide-react'

<Button variant="primary" size="md" leftIcon={<Plus />}>
Add New
</Button>
\`\`\`

**Props:**

- `variant`: `primary | secondary | outline | ghost | danger | success | warning`
- `size`: `sm | md | lg`
- `loading`: boolean
- `leftIcon` / `rightIcon`: ReactNode
- `fullWidth`: boolean

### Input

\`\`\`tsx
import { Input } from '@yanyu-cloud/ui'
import { Mail } from 'lucide-react'

<Input
label="Email"
placeholder="<you@example.com>"
leftIcon={<Mail />}
error="Invalid email"
/>
\`\`\`

**Props:**

- `variant`: `default | error | success`
- `inputSize`: `sm | md | lg`
- `label`: string
- `error`: string
- `helperText`: string
- `leftIcon` / `rightIcon`: ReactNode

### Badge

\`\`\`tsx
import { Badge } from '@yanyu-cloud/ui'

<Badge variant="success" removable onRemove={() => {}}>
Active
</Badge>
\`\`\`

**Props:**

- `variant`: `default | primary | success | warning | danger | info | purple | outline`
- `size`: `sm | md | lg`
- `removable`: boolean
- `onRemove`: () => void
- `leftIcon` / `rightIcon`: ReactNode

## Design Tokens

\`\`\`tsx
import { tokens } from '@yanyu-cloud/ui'

const primaryColor = tokens.colors.brand.primary
const spacing = tokens.spacing[4]
\`\`\`

## Theming

The library supports light and dark themes out of the box:

\`\`\`tsx
import { ThemeProvider } from 'next-themes'

<ThemeProvider attribute="class">
  <App />
</ThemeProvider>
\`\`\`

## Documentation

Visit our [Storybook documentation](https://storybook.yanyucloud.com) for interactive examples and API documentation.

## Development

\`\`\`bash

# Install dependencies

pnpm install

# Start Storybook

pnpm storybook

# Build library

pnpm build

# Run tests

pnpm test
\`\`\`

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md).

## License

MIT © YanYu Cloud Team
\`\`\`

### 14. 完整的测试配置
