import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * The project was called KYRN until 2026-09-21. What users set by hand keeps
 * working under its old spelling: `KYRN_*` variables, `kyrn.json`, `~/.kyrn`.
 *
 * Names already stored in sessions (`kyrn.decision`, `kyrn.verdict`, ...) were
 * not renamed at all: old sessions must still compact, restore and render.
 */
type Env = Readonly<Record<string, string | undefined>>;

/** `MU_<name>`, or the `KYRN_<name>` spelling when the new one is unset or empty. */
export function muEnv(name: string, env: Env = process.env): string | undefined {
	return env[`MU_${name}`] || env[`KYRN_${name}`] || undefined;
}

export const CONFIG_FILE = "mu.json";
export const LEGACY_CONFIG_FILE = "kyrn.json";

/**
 * `~/.mu`, or `~/.kyrn` on a machine whose home has not been moved yet. The
 * move is one manual step; until then nothing here creates `~/.mu` next to the
 * old home, which would split the browser profile and the sidecar state.
 */
export function muHome(home: string = homedir()): string {
	const current = join(home, ".mu");
	const legacy = join(home, ".kyrn");
	return existsSync(current) || !existsSync(legacy) ? current : legacy;
}
