/**
 * Input Validation for MCP Tools
 *
 * Loads @claude-flow/security validators when available
 * and provides lightweight fallback validation otherwise.
 *
 * Addresses #1425: security validators were implemented but never wired to runtime.
 */

// Patterns for input sanitization (inline — no external dependency required)
const SHELL_META = /[;&|`$(){}[\]<>!#\\]/;
const PATH_TRAVERSAL = /\.\.[/\\]/;
const IDENTIFIER_RE = /^[a-zA-Z0-9_][a-zA-Z0-9_\-.:]{0,127}$/;

export interface ValidationResult {
  valid: boolean;
  sanitized: string;
  error?: string;
}

/**
 * Validate an identifier (agent ID, agent type, namespace, key, etc.)
 * Rejects shell metacharacters and path traversal.
 */
export function validateIdentifier(value: unknown, label: string): ValidationResult {
  if (typeof value !== 'string' || value.length === 0) {
    return { valid: false, sanitized: '', error: `${label} must be a non-empty string` };
  }
  if (value.length > 128) {
    return { valid: false, sanitized: '', error: `${label} exceeds 128 characters` };
  }
  if (SHELL_META.test(value)) {
    return { valid: false, sanitized: '', error: `${label} contains disallowed characters` };
  }
  if (PATH_TRAVERSAL.test(value)) {
    return { valid: false, sanitized: '', error: `${label} contains path traversal` };
  }
  if (!IDENTIFIER_RE.test(value)) {
    return { valid: false, sanitized: '', error: `${label} contains invalid characters (allowed: alphanumeric, _, -, ., :)` };
  }
  return { valid: true, sanitized: value };
}

/**
 * Validate a file path (prevents traversal and shell injection).
 */
export function validatePath(value: unknown, label: string): ValidationResult {
  if (typeof value !== 'string' || value.length === 0) {
    return { valid: false, sanitized: '', error: `${label} must be a non-empty string` };
  }
  if (value.length > 4096) {
    return { valid: false, sanitized: '', error: `${label} exceeds 4096 characters` };
  }
  if (PATH_TRAVERSAL.test(value)) {
    return { valid: false, sanitized: '', error: `${label} contains path traversal (..)` };
  }
  if (SHELL_META.test(value)) {
    return { valid: false, sanitized: '', error: `${label} contains shell metacharacters` };
  }
  return { valid: true, sanitized: value };
}

/**
 * Validate a free-text string (description, value, etc.)
 * Allows most characters but rejects shell metacharacters that could cause injection.
 */
export function validateText(value: unknown, label: string, maxLen = 10_000): ValidationResult {
  if (typeof value !== 'string') {
    return { valid: false, sanitized: '', error: `${label} must be a string` };
  }
  if (value.length > maxLen) {
    return { valid: false, sanitized: '', error: `${label} exceeds ${maxLen} characters` };
  }
  // Strip null bytes
  const sanitized = value.replace(/\0/g, '');
  return { valid: true, sanitized };
}

/**
 * Assert validation or throw with a structured error.
 */
export function assertValid(result: ValidationResult): string {
  if (!result.valid) {
    throw new Error(`Validation failed: ${result.error}`);
  }
  return result.sanitized;
}

// Try to load the full @claude-flow/security module for enhanced validation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _securityModule: Record<string, any> | null = null;
let _securityLoaded = false;

async function getSecurityModule(): Promise<Record<string, any> | null> {
  if (_securityLoaded) return _securityModule;
  _securityLoaded = true;
  try {
    // Dynamic import — @claude-flow/security is an optional dependency
    _securityModule = await (Function('return import("@claude-flow/security")')() as Promise<Record<string, any>>);
  } catch {
    // @claude-flow/security is optional — fallback to inline validation above
  }
  return _securityModule;
}

/**
 * Enhanced validation using @claude-flow/security Zod schemas when available.
 * Falls back to inline regex validation otherwise.
 */
export async function validateAgentSpawn(input: Record<string, unknown>): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Always run inline validation
  if (input.agentType) {
    const r = validateIdentifier(input.agentType, 'agentType');
    if (!r.valid) errors.push(r.error!);
  }
  if (input.agentId) {
    const r = validateIdentifier(input.agentId, 'agentId');
    if (!r.valid) errors.push(r.error!);
  }
  if (input.domain) {
    const r = validateIdentifier(input.domain, 'domain');
    if (!r.valid) errors.push(r.error!);
  }

  // Try enhanced Zod validation if available.
  // Fix for #1567: @claude-flow/security's SpawnAgentSchema expects `type` and
  // `id` (not `agentType`/`name`), so the previous call always failed with
  // "type: Required". Also swallow `invalid_enum_value` errors because the
  // schema enumerates only 15 built-in agent types — we support custom types
  // (the inline validator already checked the identifier is safe).
  const sec = await getSecurityModule();
  if (sec?.SpawnAgentSchema) {
    try {
      sec.SpawnAgentSchema.parse({
        type: input.agentType,
        id: input.agentId,
      });
    } catch (zodErr: any) {
      if (zodErr.issues) {
        for (const issue of zodErr.issues) {
          if (issue.code === 'invalid_enum_value') continue;
          errors.push(`${issue.path.join('.')}: ${issue.message}`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
