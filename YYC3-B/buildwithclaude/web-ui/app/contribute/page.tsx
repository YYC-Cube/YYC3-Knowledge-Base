'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  GitBranch,
  Terminal,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Copy,
  Users,
  Sparkles,
  AlertCircle,
  Code2,
  Zap,
  BookOpen,
  Heart,
  Webhook,
  Lightbulb,
  Puzzle
} from 'lucide-react'
import { useState } from 'react'

export default function ContributePage() {
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null)

  const handleCopy = (template: string, name: string) => {
    navigator.clipboard.writeText(template)
    setCopiedTemplate(name)
    setTimeout(() => setCopiedTemplate(null), 2000)
  }

  const agentTemplate = `---
name: agent-name
description: Clear description of when to invoke. Use PROACTIVELY for automatic delegation. (under 500 chars)
category: development-architecture
tools: Read, Write, Edit # Optional - omit for all tools
---

You are a [role/expertise description].

When invoked:
1. [First action to take]
2. [Second action to take]
3. [Begin main task]

Process:
- [Key step or check]
- [Another important step]
- [Validation or verification]

Provide:
- [Type of output or feedback]
- [Another deliverable]
- [Final recommendations]`

  const commandTemplate = `---
description: Brief explanation of what the command does (10-200 chars)
category: version-control-git
argument-hint: <optional-args> # Optional
allowed-tools: Read, Write, Edit # Optional
model: opus|sonnet|haiku # Optional
---

# Command implementation

Detailed instructions for how the command should work...`

  const hookTemplate = `---
name: hook-name
description: What this hook does
category: notifications
event: Stop
matcher: "*"
language: bash
version: 1.0.0
---

# hook-name

Description of the hook's purpose.

## Event Configuration

- **Event Type**: \`Stop\`
- **Tool Matcher**: \`*\`

## Environment Variables

- \`VARIABLE_NAME\` - Description

## Requirements

List any requirements...

### Script

\`\`\`bash
#!/bin/bash
# Hook receives JSON via stdin with tool_input, tool_name, tool_result fields
# Use jq to parse: jq -r '.tool_input.file_path'

tool_name=$(jq -r '.tool_name // empty')
echo "Hook triggered by: $tool_name"
\`\`\``

  const skillTemplate = `---
name: skill-name
category: document-processing
description: What this skill does and when to use it
---

# Skill Name

Description of the skill.

## When to Use This Skill

- Use case 1
- Use case 2

## What This Skill Does

1. Step 1
2. Step 2

## How to Use

### Basic Usage

\`\`\`
Example prompt...
\`\`\`

## Example

**User**: "Example request"

**Output**:
\`\`\`
Example output...
\`\`\`

## Tips

- Tip 1
- Tip 2`

  const pluginTemplate = `{
  "name": "plugin-name",
  "version": "1.0.0",
  "description": "Description of the plugin",
  "author": {
    "name": "Your Name",
    "url": "https://github.com/username"
  },
  "repository": "https://github.com/username/repo",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"]
}`

  const contributionTypes = [
    {
      icon: Sparkles,
      title: 'Agents',
      description: 'Specialized AI assistants for specific domains',
      count: '117',
      color: 'text-purple-400'
    },
    {
      icon: Terminal,
      title: 'Commands',
      description: 'Slash commands to automate workflows',
      count: '175',
      color: 'text-blue-400'
    },
    {
      icon: Webhook,
      title: 'Hooks',
      description: 'Event-driven automations',
      count: '28',
      color: 'text-green-400'
    },
    {
      icon: Lightbulb,
      title: 'Skills',
      description: 'Reusable capabilities from plugins',
      count: '26',
      color: 'text-yellow-400'
    },
    {
      icon: Puzzle,
      title: 'Plugins',
      description: 'Bundled plugin packages',
      count: '50',
      color: 'text-orange-400'
    }
  ]

  const agentCategories = [
    'development-architecture',
    'language-specialists',
    'infrastructure-operations',
    'quality-security',
    'data-ai',
    'specialized-domains',
    'crypto-trading',
    'blockchain-web3',
    'business-finance',
    'design-experience',
    'sales-marketing'
  ]

  const commandCategories = [
    'version-control-git',
    'code-analysis-testing',
    'ci-deployment',
    'documentation-changelogs',
    'context-loading-priming',
    'project-task-management',
    'api-development',
    'automation-workflow',
    'database-operations',
    'miscellaneous'
  ]

  const hookCategories = [
    'notifications',
    'git',
    'development',
    'formatting',
    'security',
    'automation',
    'performance',
    'testing'
  ]

  const hookEvents = [
    { event: 'PreToolUse', description: 'Before a tool is called' },
    { event: 'PostToolUse', description: 'After a tool completes' },
    { event: 'Stop', description: 'When Claude Code finishes' },
    { event: 'SessionStart', description: 'When a session begins' },
    { event: 'SessionEnd', description: 'When a session ends' }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/50">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl">
            <h1 className="text-display-3 font-bold mb-4">Contribute</h1>
            <p className="text-xl text-muted-foreground">
              Join our community and help make Claude Code more powerful for everyone
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Quick Start Section */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-8 border border-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <Heart className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Why Contribute?</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Every contribution makes Claude Code better for thousands of developers. Whether you&apos;re sharing
              your expertise through a specialized agent or creating a helpful command, you&apos;re helping
              the community work smarter and faster.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: Users, label: 'Help the Community', value: 'Share your expertise' },
                { icon: Zap, label: 'Instant Deployment', value: 'Auto-published on merge' },
                { icon: GitBranch, label: 'Open Source', value: 'MIT Licensed' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-background">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What Can You Contribute */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">What Can You Contribute?</h2>
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
            {contributionTypes.map((type) => (
              <Card key={type.title} className="p-4 border-border/50 hover:border-primary/20 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-background ${type.color}`}>
                    <type.icon className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                    {type.count}
                  </Badge>
                </div>
                <h3 className="font-semibold mb-1">{type.title}</h3>
                <p className="text-xs text-muted-foreground">{type.description}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Contribution Guides */}
        <section>
          <Tabs defaultValue="agents" className="w-full" id="contribute-tabs">
            <TabsList className="grid w-full grid-cols-5 mb-8">
              <TabsTrigger value="agents">Agents</TabsTrigger>
              <TabsTrigger value="commands">Commands</TabsTrigger>
              <TabsTrigger value="hooks">Hooks</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="plugins">Plugins</TabsTrigger>
            </TabsList>

            {/* Agents Tab */}
            <TabsContent value="agents">
              <div className="space-y-8">
                <Card className="p-6 border-border/50">
                  <h3 className="text-xl font-semibold mb-2">Agent Location</h3>
                  <code className="text-sm text-muted-foreground bg-background/50 px-2 py-1 rounded">
                    plugins/agents-&lt;category&gt;/agents/&lt;agent-name&gt;.md
                  </code>
                </Card>

                <Card className="p-6 border-border/50">
                  <h3 className="text-xl font-semibold mb-4">Agent Structure</h3>
                  <div className="bg-card rounded-lg border border-border/50 p-4 font-mono text-sm overflow-x-auto">
                    <pre className="text-muted-foreground">{agentTemplate}</pre>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4 gap-2"
                    onClick={() => handleCopy(agentTemplate, 'agent')}
                  >
                    <Copy className="h-3 w-3" />
                    {copiedTemplate === 'agent' ? 'Copied!' : 'Copy Template'}
                  </Button>
                </Card>

                <Card className="p-6 border-border/50">
                  <h3 className="text-xl font-semibold mb-4">Valid Categories</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {agentCategories.map((category) => (
                      <div key={category} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-400" />
                        <code className="text-sm text-muted-foreground">{category}</code>
                      </div>
                    ))}
                  </div>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="p-6 border-green-500/20 bg-green-500/5">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <h4 className="font-semibold">Good Example</h4>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="font-medium text-green-400">✓ Clear trigger conditions</p>
                        <p className="text-muted-foreground">
                          &quot;Validates REST API design and ensures API best practices.&quot;
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-green-400">✓ Focused purpose</p>
                        <p className="text-muted-foreground">Single responsibility: API design</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6 border-red-500/20 bg-red-500/5">
                    <div className="flex items-center gap-2 mb-4">
                      <XCircle className="h-5 w-5 text-red-500" />
                      <h4 className="font-semibold">Bad Example</h4>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="font-medium text-red-400">✗ Vague description</p>
                        <p className="text-muted-foreground">
                          &quot;Helps with coding tasks&quot;
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-red-400">✗ Multiple responsibilities</p>
                        <p className="text-muted-foreground">Tries to do everything</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Commands Tab */}
            <TabsContent value="commands">
              <div className="space-y-8">
                <Card className="p-6 border-border/50">
                  <h3 className="text-xl font-semibold mb-2">Command Location</h3>
                  <code className="text-sm text-muted-foreground bg-background/50 px-2 py-1 rounded">
                    plugins/commands-&lt;category&gt;/commands/&lt;command-name&gt;.md
                  </code>
                </Card>

                <Card className="p-6 border-border/50">
                  <h3 className="text-xl font-semibold mb-4">Command Structure</h3>
                  <div className="bg-card rounded-lg border border-border/50 p-4 font-mono text-sm overflow-x-auto">
                    <pre className="text-muted-foreground">{commandTemplate}</pre>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4 gap-2"
                    onClick={() => handleCopy(commandTemplate, 'command')}
                  >
                    <Copy className="h-3 w-3" />
                    {copiedTemplate === 'command' ? 'Copied!' : 'Copy Template'}
                  </Button>
                </Card>

                <Card className="p-6 border-border/50">
                  <h3 className="text-xl font-semibold mb-4">Valid Categories</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {commandCategories.map((category) => (
                      <div key={category} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                        <code className="text-sm text-muted-foreground">{category}</code>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* Hooks Tab */}
            <TabsContent value="hooks">
              <div className="space-y-8">
                <Card className="p-6 border-border/50">
                  <h3 className="text-xl font-semibold mb-2">Hook Location</h3>
                  <code className="text-sm text-muted-foreground bg-background/50 px-2 py-1 rounded">
                    plugins/hooks-&lt;category&gt;/hooks/&lt;hook-name&gt;.md
                  </code>
                </Card>

                <Card className="p-6 border-border/50">
                  <h3 className="text-xl font-semibold mb-4">Hook Structure</h3>
                  <div className="bg-card rounded-lg border border-border/50 p-4 font-mono text-sm overflow-x-auto">
                    <pre className="text-muted-foreground">{hookTemplate}</pre>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4 gap-2"
                    onClick={() => handleCopy(hookTemplate, 'hook')}
                  >
                    <Copy className="h-3 w-3" />
                    {copiedTemplate === 'hook' ? 'Copied!' : 'Copy Template'}
                  </Button>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="p-6 border-border/50">
                    <h3 className="text-xl font-semibold mb-4">Hook Events</h3>
                    <div className="space-y-3">
                      {hookEvents.map((item) => (
                        <div key={item.event} className="flex items-start gap-2">
                          <code className="text-sm text-green-400 font-mono">{item.event}</code>
                          <span className="text-sm text-muted-foreground">- {item.description}</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-6 border-border/50">
                    <h3 className="text-xl font-semibold mb-4">Valid Categories</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {hookCategories.map((category) => (
                        <div key={category} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-400" />
                          <code className="text-sm text-muted-foreground">{category}</code>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Skills Tab */}
            <TabsContent value="skills">
              <div className="space-y-8">
                <Card className="p-6 border-border/50">
                  <h3 className="text-xl font-semibold mb-2">Skill Location</h3>
                  <code className="text-sm text-muted-foreground bg-background/50 px-2 py-1 rounded">
                    plugins/all-skills/skills/&lt;skill-name&gt;/SKILL.md
                  </code>
                </Card>

                <Card className="p-6 border-border/50">
                  <h3 className="text-xl font-semibold mb-4">Skill Structure</h3>
                  <div className="bg-card rounded-lg border border-border/50 p-4 font-mono text-sm overflow-x-auto">
                    <pre className="text-muted-foreground">{skillTemplate}</pre>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4 gap-2"
                    onClick={() => handleCopy(skillTemplate, 'skill')}
                  >
                    <Copy className="h-3 w-3" />
                    {copiedTemplate === 'skill' ? 'Copied!' : 'Copy Template'}
                  </Button>
                </Card>

                <Card className="p-6 border-border/50">
                  <h3 className="text-xl font-semibold mb-4">Skill Guidelines</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Create a directory with the skill name</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Include clear &quot;When to Use&quot; section</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Provide example prompts and outputs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Add practical tips for best results</span>
                    </li>
                  </ul>
                </Card>
              </div>
            </TabsContent>

            {/* Plugins Tab */}
            <TabsContent value="plugins">
              <div className="space-y-8">
                <Card className="p-6 border-border/50">
                  <h3 className="text-xl font-semibold mb-2">Plugin Structure</h3>
                  <div className="bg-card rounded-lg border border-border/50 p-4 font-mono text-sm">
                    <pre className="text-muted-foreground">{`plugins/<plugin-name>/
├── .claude-plugin/
│   └── plugin.json
├── agents/           # Optional
│   └── *.md
├── commands/         # Optional
│   └── *.md
└── hooks/            # Optional
    └── *.md`}</pre>
                  </div>
                </Card>

                <Card className="p-6 border-border/50">
                  <h3 className="text-xl font-semibold mb-4">Plugin Manifest (plugin.json)</h3>
                  <div className="bg-card rounded-lg border border-border/50 p-4 font-mono text-sm overflow-x-auto">
                    <pre className="text-muted-foreground">{pluginTemplate}</pre>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4 gap-2"
                    onClick={() => handleCopy(pluginTemplate, 'plugin')}
                  >
                    <Copy className="h-3 w-3" />
                    {copiedTemplate === 'plugin' ? 'Copied!' : 'Copy Template'}
                  </Button>
                </Card>

                <Card className="p-6 border-border/50">
                  <h3 className="text-xl font-semibold mb-4">Plugin Guidelines</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Include a descriptive name and version</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Add relevant keywords for discoverability</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Link to your repository</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Specify license (MIT recommended)</span>
                    </li>
                  </ul>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </section>

        {/* Submission Process */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Submission Process</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: Code2, title: 'Create', desc: 'Write your component' },
              { icon: AlertCircle, title: 'Validate', desc: 'Run npm test' },
              { icon: GitBranch, title: 'Submit PR', desc: 'Open a pull request' },
              { icon: Zap, title: 'Auto Deploy', desc: 'Merged PRs go live' }
            ].map((step, i) => (
              <div key={i} className="text-center relative">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-1">{step.title}</h4>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
                {i < 3 && (
                  <div className="hidden md:block absolute top-6 -right-3 translate-x-full">
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Testing Section */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Testing Your Contribution</h2>
          <Card className="p-6 border-border/50">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Run Validation</h4>
                <code className="text-sm text-muted-foreground bg-background/50 px-3 py-2 rounded block">
                  npm test
                </code>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Install Locally</h4>
                <code className="text-sm text-muted-foreground bg-background/50 px-3 py-2 rounded block">
                  find plugins/agents-*/agents -name &quot;*.md&quot; -exec cp {'{}' } ~/.claude/agents/ \;
                </code>
              </div>
            </div>
          </Card>
        </section>

        {/* Call to Action */}
        <section className="mt-16">
          <Card className="p-8 border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5">
            <div className="text-center max-w-2xl mx-auto">
              <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-4">Ready to Contribute?</h2>
              <p className="text-muted-foreground mb-6">
                Check out our detailed contribution guide for step-by-step instructions,
                best practices, and tips for getting your contribution merged quickly.
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <a
                  href="https://github.com/davepoon/buildwithclaude/blob/main/CONTRIBUTING.md"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="btn-gradient gap-2">
                    Read Full Guide
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
                <a
                  href="https://github.com/davepoon/buildwithclaude"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" className="gap-2">
                    <GitBranch className="h-4 w-4" />
                    View on GitHub
                  </Button>
                </a>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </div>
  )
}
