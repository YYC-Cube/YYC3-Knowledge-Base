/**
 * pi runs commands through `bash` on macOS and Linux and through `powershell`
 * on Windows; both take a `command`. Every feature that looks at a command
 * (the risk guard, the constraint gate, the completion check, the checkpoint)
 * has to treat the two alike, or Windows users run without it.
 */
export const SHELL_TOOLS: ReadonlySet<string> = new Set(["bash", "powershell"]);

export function isShellTool(toolName: string): boolean {
	return SHELL_TOOLS.has(toolName);
}
