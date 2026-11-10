/**
 * Rule-based content security scanner for submitted skills.
 * No external APIs — entirely pattern-based.
 */

export interface ScanFlag {
  rule: string
  severity: 'critical' | 'warning'
  detail: string
  match?: string
}

export interface ScanResult {
  passed: boolean
  riskLevel: 'safe' | 'low' | 'medium' | 'high'
  flags: ScanFlag[]
}

interface AnalyzedSkillMeta {
  name: string
  description: string
  installCommand?: string
}

// --- Pattern definitions ---

const DANGEROUS_SHELL_PATTERNS: Array<{ pattern: RegExp; rule: string; detail: string }> = [
  { pattern: /rm\s+-rf\s+[\/~]/, rule: 'destructive-rm', detail: 'Destructive rm -rf targeting root or home' },
  { pattern: /rm\s+-rf\s+\$/, rule: 'destructive-rm-var', detail: 'Destructive rm -rf with variable expansion' },
  { pattern: /(curl|wget)\s+[^\n]*\|\s*(sh|bash|zsh)/, rule: 'remote-code-exec', detail: 'Downloads and executes remote code' },
  { pattern: /chmod\s+777/, rule: 'insecure-permissions', detail: 'Sets world-writable permissions (777)' },
  { pattern: /chmod\s+\+s/, rule: 'setuid-bit', detail: 'Sets SUID bit for privilege escalation' },
  { pattern: /\bsudo\s/, rule: 'sudo-usage', detail: 'Uses sudo for privilege escalation' },
  { pattern: /\bsu\s+-/, rule: 'su-usage', detail: 'Switches to another user account' },
  { pattern: /\bmkfs\b/, rule: 'mkfs', detail: 'Formats filesystem — destructive system command' },
  { pattern: /\bdd\s+if=/, rule: 'dd-command', detail: 'Uses dd — can overwrite disk data' },
]

const SUSPICIOUS_NETWORK_PATTERNS: Array<{ pattern: RegExp; rule: string; detail: string }> = [
  { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b(?!.*localhost|.*127\.0\.0\.1|.*0\.0\.0\.0)/, rule: 'hardcoded-ip', detail: 'Contains hardcoded IP address (non-localhost)' },
  { pattern: /[A-Za-z0-9+/]{100,}={0,2}/, rule: 'long-base64', detail: 'Contains long base64 string (possible obfuscation)' },
  { pattern: /\bnc\s+-[el]/, rule: 'netcat-listener', detail: 'Netcat listener — possible reverse shell' },
  { pattern: /\bnetcat\s/, rule: 'netcat', detail: 'Uses netcat — possible reverse shell' },
  { pattern: /stratum:\/\//, rule: 'crypto-mining', detail: 'Crypto mining pool URL detected' },
  { pattern: /\bxmrig\b/i, rule: 'crypto-miner', detail: 'Crypto miner reference detected' },
]

const PROMPT_INJECTION_PATTERNS: Array<{ pattern: RegExp; rule: string; detail: string }> = [
  { pattern: /ignore\s+(all\s+)?previous\s+instructions/i, rule: 'prompt-injection-ignore', detail: 'Attempts to override previous instructions' },
  { pattern: /you\s+are\s+now\s+/i, rule: 'prompt-injection-identity', detail: 'Attempts to reassign AI identity' },
  { pattern: /forget\s+(all\s+)?your\s/i, rule: 'prompt-injection-forget', detail: 'Attempts to make AI forget instructions' },
  { pattern: /disregard\s+(all\s+)?prior/i, rule: 'prompt-injection-disregard', detail: 'Attempts to disregard prior context' },
  { pattern: /do\s+not\s+reveal\s+this/i, rule: 'prompt-injection-hide', detail: 'Attempts to hide actions from user' },
]

const DATA_EXFIL_PATTERNS: Array<{ pattern: RegExp; rule: string; detail: string }> = [
  { pattern: /~\/\.ssh\//, rule: 'ssh-key-access', detail: 'Accesses SSH keys directory' },
  { pattern: /~\/\.aws\//, rule: 'aws-creds-access', detail: 'Accesses AWS credentials directory' },
  { pattern: /~\/\.gnupg\//, rule: 'gpg-key-access', detail: 'Accesses GPG keys directory' },
  { pattern: /\.(env|credentials|secret)/, rule: 'credentials-file', detail: 'References credentials/secrets file' },
  { pattern: /curl\s+.*-X\s*POST\s+.*\$HOME/i, rule: 'post-home-files', detail: 'POSTs home directory files to external URL' },
  { pattern: /\bprintenv\b|\benv\s*\|/, rule: 'env-dump', detail: 'Dumps environment variables' },
]

const SUSPICIOUS_URL_PATTERNS: Array<{ pattern: RegExp; rule: string; detail: string }> = [
  { pattern: /\bbit\.ly\b/i, rule: 'url-shortener-bitly', detail: 'Uses bit.ly URL shortener' },
  { pattern: /\btinyurl\.com\b/i, rule: 'url-shortener-tinyurl', detail: 'Uses tinyurl.com URL shortener' },
  { pattern: /\bt\.co\b/i, rule: 'url-shortener-tco', detail: 'Uses t.co URL shortener' },
  { pattern: /http:\/\/(?!localhost|127\.0\.0\.1).*\binstall\b/i, rule: 'insecure-install', detail: 'Non-HTTPS install URL' },
]

/**
 * Scan skill content for security issues.
 * Returns a ScanResult with flags categorized by severity.
 */
export function scanSkillContent(content: string, metadata: AnalyzedSkillMeta): ScanResult {
  const flags: ScanFlag[] = []

  // Also scan metadata fields
  const allText = [
    content,
    metadata.name,
    metadata.description,
    metadata.installCommand || '',
  ].join('\n')

  // Critical patterns
  for (const { pattern, rule, detail } of DANGEROUS_SHELL_PATTERNS) {
    const match = allText.match(pattern)
    if (match) {
      flags.push({ rule, severity: 'critical', detail, match: match[0] })
    }
  }

  for (const { pattern, rule, detail } of DATA_EXFIL_PATTERNS) {
    const match = allText.match(pattern)
    if (match) {
      flags.push({ rule, severity: 'critical', detail, match: match[0] })
    }
  }

  // Warning patterns
  for (const { pattern, rule, detail } of SUSPICIOUS_NETWORK_PATTERNS) {
    const match = allText.match(pattern)
    if (match) {
      flags.push({ rule, severity: 'warning', detail, match: match[0] })
    }
  }

  for (const { pattern, rule, detail } of PROMPT_INJECTION_PATTERNS) {
    const match = allText.match(pattern)
    if (match) {
      flags.push({ rule, severity: 'warning', detail, match: match[0] })
    }
  }

  for (const { pattern, rule, detail } of SUSPICIOUS_URL_PATTERNS) {
    const match = allText.match(pattern)
    if (match) {
      flags.push({ rule, severity: 'warning', detail, match: match[0] })
    }
  }

  // Determine risk level and pass/fail
  const hasCritical = flags.some(f => f.severity === 'critical')
  const hasWarning = flags.some(f => f.severity === 'warning')

  let riskLevel: ScanResult['riskLevel'] = 'safe'
  if (hasCritical) riskLevel = 'high'
  else if (hasWarning) riskLevel = 'medium'
  else if (flags.length > 0) riskLevel = 'low'

  return {
    passed: !hasCritical,
    riskLevel,
    flags,
  }
}

/**
 * Determine submission status based on scan result.
 */
export function getSubmissionStatus(scanResult: ScanResult): 'approved' | 'flagged' | 'rejected' {
  if (scanResult.flags.some(f => f.severity === 'critical')) return 'rejected'
  if (scanResult.flags.some(f => f.severity === 'warning')) return 'flagged'
  return 'approved'
}
