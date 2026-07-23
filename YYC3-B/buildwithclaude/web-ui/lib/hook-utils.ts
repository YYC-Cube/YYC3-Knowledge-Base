import JSZip from 'jszip'
import type { Hook } from './hooks-types'

/**
 * Claude Code hook configuration types
 */
interface HookConfig {
  hooks: {
    [event: string]: EventMatcher[]
  }
}

interface EventMatcher {
  matcher?: string
  hooks: HookAction[]
}

interface HookAction {
  type: 'command' | 'prompt'
  command?: string
  prompt?: string
}

/**
 * Extract the script code block from hook markdown content.
 * Looks for ### Script section followed by a fenced code block.
 *
 * @param content - The full markdown content from the hook file
 * @returns The extracted script content, or null if not found
 */
export function extractScriptFromContent(content: string): string | null {
  // Look for ### Script header followed by code block
  const scriptSectionRegex = /###\s*Script\s*\n+```(?:\w+)?\n([\s\S]*?)```/i
  const match = content.match(scriptSectionRegex)

  if (match && match[1]) {
    return match[1].trim()
  }

  // Fallback: try to find first code block with language specifier
  const fallbackRegex = /```(\w+)\n([\s\S]*?)```/
  const fallbackMatch = content.match(fallbackRegex)

  if (fallbackMatch && fallbackMatch[2]) {
    return fallbackMatch[2].trim()
  }

  return null
}

/**
 * Determine if a script is "simple" (3 or fewer lines of actual code)
 * Simple scripts can be inlined in the JSON command field.
 *
 * @param script - The script content
 * @returns true if script is simple (<=3 non-empty, non-comment lines)
 */
export function isSimpleScript(script: string): boolean {
  const lines = script
    .split('\n')
    .filter(line => {
      const trimmed = line.trim()
      // Exclude empty lines, shebang, and comments
      return trimmed.length > 0 &&
             !trimmed.startsWith('#') &&
             !trimmed.startsWith('//')
    })

  return lines.length <= 3
}

/**
 * Get the script file extension based on language
 */
function getScriptExtension(language?: string): string {
  switch (language?.toLowerCase()) {
    case 'python':
    case 'py':
      return 'py'
    case 'javascript':
    case 'js':
      return 'js'
    case 'typescript':
    case 'ts':
      return 'ts'
    case 'bash':
    case 'sh':
    case 'shell':
    default:
      return 'sh'
  }
}

/**
 * Generate JSON configuration for a hook.
 *
 * For simple scripts (<=3 lines), the command is inlined.
 * For complex scripts, a script file path is referenced.
 *
 * @param hook - The hook data
 * @param options - Generation options
 * @returns The JSON config object and optional script content
 */
export function generateHookConfig(
  hook: Hook,
  options: {
    scriptPath?: string  // Override script path (for ZIP bundle)
    forZip?: boolean     // Whether generating for ZIP bundle
  } = {}
): { config: HookConfig; scriptContent: string | null; isSimple: boolean } {

  const script = hook.script || extractScriptFromContent(hook.content)
  const simple = script ? isSimpleScript(script) : true
  const ext = getScriptExtension(hook.language)

  let hookAction: HookAction

  if (hook.language === 'bash' || hook.language === 'sh' || !hook.language) {
    // Command-type hook
    if (script && !simple) {
      // Complex script - reference external file
      const scriptPath = options.scriptPath || `.claude/hooks/${hook.slug}.${ext}`
      hookAction = {
        type: 'command',
        command: scriptPath
      }
    } else if (script && simple) {
      // Simple script - inline it
      // Join lines with && for shell command, filtering out comments and shebang
      const inlineCommand = script
        .split('\n')
        .filter(l => {
          const trimmed = l.trim()
          return trimmed.length > 0 && !trimmed.startsWith('#')
        })
        .join(' && ')
      hookAction = {
        type: 'command',
        command: inlineCommand
      }
    } else {
      // No script found - provide placeholder
      hookAction = {
        type: 'command',
        command: `# TODO: Add command for ${hook.slug}`
      }
    }
  } else {
    // Non-bash language - still use command type but reference script file
    if (script && !simple) {
      const scriptPath = options.scriptPath || `.claude/hooks/${hook.slug}.${ext}`
      const interpreter = hook.language === 'python' || hook.language === 'py' ? 'python3' : 'node'
      hookAction = {
        type: 'command',
        command: `${interpreter} ${scriptPath}`
      }
    } else if (script && simple) {
      hookAction = {
        type: 'command',
        command: script
      }
    } else {
      hookAction = {
        type: 'command',
        command: `# TODO: Add command for ${hook.slug}`
      }
    }
  }

  // Build the event matcher - omit matcher if it's '*' (wildcard)
  const eventMatcher: EventMatcher = {
    hooks: [hookAction]
  }

  if (hook.matcher && hook.matcher !== '*') {
    eventMatcher.matcher = hook.matcher
  }

  const config: HookConfig = {
    hooks: {
      [hook.event]: [eventMatcher]
    }
  }

  return {
    config,
    scriptContent: script && !simple ? script : null,
    isSimple: simple
  }
}

/**
 * Generate JSON string for clipboard/download
 */
export function generateHookConfigString(hook: Hook): string {
  const { config } = generateHookConfig(hook)
  return JSON.stringify(config, null, 2)
}

/**
 * Generate installation instructions README
 */
function generateInstallationReadme(hook: Hook, isSimple: boolean): string {
  const ext = getScriptExtension(hook.language)

  if (isSimple) {
    return `# ${hook.name}

${hook.description}

## Installation

1. Open your \`.claude/settings.json\` file (create it if it doesn't exist)
2. Merge the contents of \`${hook.slug}-hook.json\` into the \`hooks\` section

## Example

If your settings.json currently has:
\`\`\`json
{
  "permissions": { ... }
}
\`\`\`

Add the hooks section:
\`\`\`json
{
  "permissions": { ... },
  "hooks": {
    "${hook.event}": [...]
  }
}
\`\`\`

If you already have hooks for ${hook.event}, merge the array contents.

## Configuration

- **Event**: \`${hook.event}\`
- **Matcher**: \`${hook.matcher}\`
- **Category**: ${hook.category}
`
  } else {
    return `# ${hook.name}

${hook.description}

## Installation

1. Copy the \`hooks/\` folder to your project's \`.claude/\` directory:
   \`\`\`bash
   cp -r hooks/ .claude/hooks/
   \`\`\`

2. Make the script executable:
   \`\`\`bash
   chmod +x .claude/hooks/${hook.slug}.${ext}
   \`\`\`

3. Merge the contents of \`${hook.slug}-hook.json\` into your \`.claude/settings.json\`

## Files

- \`${hook.slug}-hook.json\` - Hook configuration to add to settings.json
- \`hooks/${hook.slug}.${ext}\` - The hook script

## Configuration

- **Event**: \`${hook.event}\`
- **Matcher**: \`${hook.matcher}\`
- **Category**: ${hook.category}
- **Language**: ${hook.language || 'bash'}
`
  }
}

/**
 * Generate a ZIP bundle containing:
 * - {slug}-hook.json: The hook configuration
 * - hooks/{slug}.{ext}: The script file (for complex hooks)
 * - README.md: Installation instructions
 *
 * @param hook - The hook data
 * @returns Blob containing the ZIP file
 */
export async function generateHookZipBundle(hook: Hook): Promise<Blob> {
  const zip = new JSZip()

  const script = hook.script || extractScriptFromContent(hook.content)
  const isSimple = script ? isSimpleScript(script) : true
  const ext = getScriptExtension(hook.language)

  // Generate config with appropriate script path
  const scriptFileName = `${hook.slug}.${ext}`
  const { config, scriptContent } = generateHookConfig(hook, {
    scriptPath: isSimple ? undefined : `.claude/hooks/${scriptFileName}`,
    forZip: true
  })

  // Add settings JSON
  const configJson = JSON.stringify(config, null, 2)
  zip.file(`${hook.slug}-hook.json`, configJson)

  // Add script file for complex hooks
  if (!isSimple && scriptContent) {
    const hooksFolder = zip.folder('hooks')
    hooksFolder?.file(scriptFileName, scriptContent)
  }

  // Add README with installation instructions
  const readme = generateInstallationReadme(hook, isSimple)
  zip.file('README.md', readme)

  return zip.generateAsync({ type: 'blob' })
}
