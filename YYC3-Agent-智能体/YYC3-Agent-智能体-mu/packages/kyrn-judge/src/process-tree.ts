import { spawn } from "node:child_process";

/**
 * Ending a process and everything it started, the same way on every caller:
 * the background jobs, and the programs the packs run (git runs hooks, and a
 * hook starts what it likes).
 */
export type KillStep =
	| { readonly kind: "signal"; readonly pid: number; readonly signal: "SIGTERM" | "SIGKILL" }
	| { readonly kind: "exec"; readonly file: string; readonly args: readonly string[] };

/**
 * How to end a job and everything it started. POSIX: a signal to the process
 * group (the negative pid). Windows has no groups: `taskkill /T` walks the
 * tree, asking first and with `/F` forcing.
 */
export function killPlan(
	pid: number,
	force: boolean,
	platform: NodeJS.Platform,
	systemRoot: string = process.env.SystemRoot ?? "C:\\Windows",
): KillStep {
	if (platform !== "win32") return { kind: "signal", pid: -pid, signal: force ? "SIGKILL" : "SIGTERM" };
	// The trusted System32 binary, so that cleanup does not depend on PATH.
	const file = `${systemRoot}\\System32\\taskkill.exe`;
	return { kind: "exec", file, args: force ? ["/T", "/F", "/PID", String(pid)] : ["/T", "/PID", String(pid)] };
}

/** Never throws: a process that is already gone is the outcome that was asked for. */
export function runKillStep(step: KillStep): void {
	try {
		if (step.kind === "exec") {
			const child = spawn(step.file, [...step.args], { stdio: "ignore", detached: true, windowsHide: true });
			child.once("error", () => {});
			child.unref();
			return;
		}
		try {
			process.kill(step.pid, step.signal);
		} catch {
			// No group under that id (the shell was not a group leader): the process itself, then.
			if (step.pid < 0) process.kill(-step.pid, step.signal);
		}
	} catch {
		/* gone already */
	}
}

/** POSIX only: whether anything is left in the job's process group. */
export function groupAlive(pid: number, platform: NodeJS.Platform): boolean {
	if (platform === "win32") return false;
	try {
		process.kill(-pid, 0);
		return true;
	} catch (error) {
		return (error as NodeJS.ErrnoException).code === "EPERM";
	}
}
