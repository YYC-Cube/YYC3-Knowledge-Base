import type { Runner } from "../../../packs/exec.ts";
import type { KyrnRuntime } from "../../runtime.ts";

/**
 * One capability pack: a catalog entry whose tools do not exist until it is
 * opened. `start` registers them, and throws a readable install hint when the
 * program behind them is not on this machine, which leaves the pack closed.
 */
export interface Pack {
	/** The catalog id, `pack:<name>`. */
	readonly id: string;
	readonly title: string;
	/** One sentence for the judge: what kind of task needs this. */
	readonly description: string;
	readonly tools: readonly string[];
	/** Skill files the pack ships, contributed when resources are discovered, whether or not the pack is open. */
	readonly skills?: readonly string[];
	start(): Promise<void>;
}

/** What every pack is handed. The runner and the platform are parameters so tests can stand in for both. */
export interface PackShared {
	readonly runtime: KyrnRuntime;
	readonly run: Runner;
	readonly platform: NodeJS.Platform;
	/** Where commands run: the session's directory once there is a session. */
	cwd(): string;
	/** Opens a pack on the user's behalf, as `/review` and `/commit` do. Rejects with the install hint. */
	open(id: string): Promise<void>;
}

export function text(value: string) {
	return [{ type: "text" as const, text: value }];
}
