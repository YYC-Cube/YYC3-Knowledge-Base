/**
 * Which language server serves a file, where it is on this machine, what its
 * workspace root is, and how to start it. Nothing here installs anything or
 * touches the file system directly: lookups are injected, and the platform is
 * a parameter, so Windows and WSL behaviour is tested on any machine.
 */
import { posix, win32 } from "node:path";

export type ServerOrigin = "built-in" | "user" | "project";

export interface ServerSpec {
	readonly id: string;
	readonly command: string;
	readonly args: readonly string[];
	/** Lower case, with the dot. */
	readonly extensions: readonly string[];
	/** The nearest directory holding one of these is the workspace root. */
	readonly rootMarkers: readonly string[];
	/** Servers of one group are alternatives for the same files: the first one found is used. */
	readonly group?: string;
	/**
	 * Where the command comes from. A `project` server is named by a file in the
	 * repository, so starting it runs what a cloned repository asked for: it
	 * needs the project to be trusted. The other two are the user's own choice.
	 */
	readonly origin: ServerOrigin;
	readonly env?: Readonly<Record<string, string>>;
	readonly initializationOptions?: unknown;
	readonly settings?: Readonly<Record<string, unknown>>;
}

const TS_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];
const TS_ROOTS = ["tsconfig.json", "jsconfig.json", "package.json"];
const PY_ROOTS = ["pyproject.toml", "setup.py", "setup.cfg", "requirements.txt", "pyrightconfig.json"];
const C_EXTENSIONS = [".c", ".h", ".cc", ".cpp", ".cxx", ".hh", ".hpp", ".hxx", ".m", ".mm"];

function builtIn(id: string, args: string[], extensions: string[], rootMarkers: string[], group: string): ServerSpec {
	return { id, command: id, args, extensions, rootMarkers, group, origin: "built-in" };
}

/** Well-known servers, in order of preference within a group. They are looked for on PATH and never installed. */
export const BUILT_IN_SERVERS: readonly ServerSpec[] = [
	builtIn("typescript-language-server", ["--stdio"], TS_EXTENSIONS, TS_ROOTS, "typescript"),
	builtIn("vtsls", ["--stdio"], TS_EXTENSIONS, TS_ROOTS, "typescript"),
	builtIn("basedpyright-langserver", ["--stdio"], [".py", ".pyi"], PY_ROOTS, "python"),
	builtIn("pyright-langserver", ["--stdio"], [".py", ".pyi"], PY_ROOTS, "python"),
	builtIn("pylsp", [], [".py", ".pyi"], PY_ROOTS, "python"),
	builtIn("ruff", ["server"], [".py", ".pyi"], PY_ROOTS, "python"),
	builtIn("gopls", [], [".go"], ["go.work", "go.mod"], "go"),
	builtIn("rust-analyzer", [], [".rs"], ["Cargo.toml"], "rust"),
	builtIn("clangd", [], C_EXTENSIONS, ["compile_commands.json", "compile_flags.txt", ".clangd"], "c"),
];

const LANGUAGE_IDS: Readonly<Record<string, string>> = {
	".ts": "typescript",
	".mts": "typescript",
	".cts": "typescript",
	".tsx": "typescriptreact",
	".js": "javascript",
	".mjs": "javascript",
	".cjs": "javascript",
	".jsx": "javascriptreact",
	".py": "python",
	".pyi": "python",
	".go": "go",
	".rs": "rust",
	".c": "c",
	".h": "c",
	".cc": "cpp",
	".cpp": "cpp",
	".cxx": "cpp",
	".hh": "cpp",
	".hpp": "cpp",
	".hxx": "cpp",
	".m": "objective-c",
	".mm": "objective-cpp",
};

export function extensionOf(path: string): string {
	const name = path.slice(Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")) + 1);
	const dot = name.lastIndexOf(".");
	return dot > 0 ? name.slice(dot).toLowerCase() : "";
}

/** The protocol's language identifier for a file; an unknown extension goes by its own name. */
export function languageIdFor(path: string): string {
	const extension = extensionOf(path);
	return LANGUAGE_IDS[extension] ?? (extension.slice(1) || "plaintext");
}

function strings(value: unknown): string[] | undefined {
	return Array.isArray(value) && value.every((item) => typeof item === "string") ? [...value] : undefined;
}

function record(value: unknown): Record<string, unknown> | undefined {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

/**
 * The server table: the built-in one, then the user's `features.lsp.servers`,
 * then the project's file. An entry with a known id overrides that server's
 * fields, a new id adds a server (it needs `command` and `extensions`), and
 * `false` removes one. Whatever a project entry touches becomes `project`.
 */
export function mergeServers(
	layers: readonly { readonly origin: ServerOrigin; readonly servers: unknown }[],
	builtInTable: readonly ServerSpec[] = BUILT_IN_SERVERS,
): { servers: ServerSpec[]; problems: string[] } {
	const table = new Map(builtInTable.map((spec) => [spec.id, spec]));
	const problems: string[] = [];
	for (const { origin, servers } of layers) {
		for (const [id, raw] of Object.entries(record(servers) ?? {})) {
			if (raw === false) {
				table.delete(id);
				continue;
			}
			const entry = record(raw);
			const known = table.get(id);
			const command = typeof entry?.command === "string" && entry.command.trim() ? entry.command : known?.command;
			const extensions = strings(entry?.extensions)?.map((extension) =>
				(extension.startsWith(".") ? extension : `.${extension}`).toLowerCase(),
			);
			if (!entry || !command || !(extensions ?? known?.extensions)?.length) {
				problems.push(`lsp server "${id}" (${origin}) needs a command and file extensions; it is ignored`);
				continue;
			}
			const env = record(entry.env);
			table.set(id, {
				id,
				command,
				args: strings(entry.args) ?? known?.args ?? [],
				extensions: extensions ?? known?.extensions ?? [],
				rootMarkers: strings(entry.rootMarkers) ?? known?.rootMarkers ?? [],
				group: typeof entry.group === "string" ? entry.group : known?.group,
				origin,
				env: env
					? Object.fromEntries(
							Object.entries(env).filter((pair): pair is [string, string] => typeof pair[1] === "string"),
						)
					: known?.env,
				initializationOptions: entry.initializationOptions ?? known?.initializationOptions,
				settings: record(entry.settings) ?? known?.settings,
			});
		}
	}
	return { servers: [...table.values()], problems };
}

type Env = Readonly<Record<string, string | undefined>>;

export interface PathLookupOptions {
	readonly env: Env;
	readonly platform: string;
	/** True when the path is a file this process may execute. */
	readonly isExecutable: (path: string) => boolean;
}

function envValue(env: Env, name: string): string | undefined {
	const key = Object.keys(env).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
	return key ? env[key] : undefined;
}

const WINDOWS_MOUNT = /^\/mnt\/[a-z]\//i;

/**
 * Finds a command the way the shell would. On Windows that means trying the
 * PATHEXT endings (npm installs `name.cmd`). Inside WSL the Windows folders
 * that are appended to PATH hold shims meant for Windows shells, so they are
 * only searched as a last resort, and only for a real `.exe`.
 */
export function findOnPath(command: string, options: PathLookupOptions): string | undefined {
	const { env, platform, isExecutable } = options;
	const paths = platform === "win32" ? win32 : posix;
	const endings =
		platform === "win32"
			? ["", ...(envValue(env, "PATHEXT") ?? ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean)]
			: [""];
	const candidates = (base: string, list: readonly string[]) =>
		list.map((ending) => base + ending).find((candidate) => isExecutable(candidate));
	// A command given with a directory is a path, not a name to search for.
	if (command.includes("/") || (platform === "win32" && command.includes("\\"))) return candidates(command, endings);

	const dirs = (envValue(env, "PATH") ?? "").split(platform === "win32" ? ";" : ":").filter(Boolean);
	const inWsl = platform === "linux" && Boolean(env.WSL_DISTRO_NAME);
	for (const dir of dirs) {
		if (inWsl && WINDOWS_MOUNT.test(`${dir}/`)) continue;
		const found = candidates(paths.join(dir, command), endings);
		if (found) return found;
	}
	if (!inWsl) return undefined;
	for (const dir of dirs) {
		if (!WINDOWS_MOUNT.test(`${dir}/`)) continue;
		const found = candidates(paths.join(dir, command), [".exe"]);
		if (found) return found;
	}
	return undefined;
}

export interface DetectedServer {
	readonly spec: ServerSpec;
	/** The executable on this machine, or undefined when it is not installed. */
	readonly executable: string | undefined;
	/** Installed, and either the first of its group or in no group: the one that gets used. */
	readonly chosen: boolean;
}

/** Looks every server up once. Within a group the first installed one is chosen, the rest are listed as alternatives. */
export function detectServers(
	specs: readonly ServerSpec[],
	lookup: (command: string) => string | undefined,
): DetectedServer[] {
	const taken = new Set<string>();
	// What the user or the project configured goes before the built-in order of preference.
	const ordered = [...specs].sort((a, b) => Number(a.origin === "built-in") - Number(b.origin === "built-in"));
	const detected = new Map<string, DetectedServer>();
	for (const spec of ordered) {
		const executable = lookup(spec.command);
		const chosen = executable !== undefined && !(spec.group && taken.has(spec.group));
		if (chosen && spec.group) taken.add(spec.group);
		detected.set(spec.id, { spec, executable, chosen });
	}
	return specs.map((spec) => detected.get(spec.id) as DetectedServer);
}

export function serversFor(path: string, detected: readonly DetectedServer[]): DetectedServer[] {
	const extension = extensionOf(path);
	return detected.filter((server) => server.chosen && server.spec.extensions.includes(extension));
}

/**
 * The workspace root for a file: the nearest directory, from the file upwards,
 * that holds one of the markers. The search stops at the session's directory
 * for a file inside it, which is also the answer when no marker is found.
 */
export function findRoot(
	file: string,
	markers: readonly string[],
	cwd: string,
	exists: (path: string) => boolean,
	platform: string = process.platform,
): string {
	const paths = platform === "win32" ? win32 : posix;
	const inside = (dir: string) => {
		const away = paths.relative(cwd, dir);
		return away === "" || (!away.startsWith("..") && !paths.isAbsolute(away));
	};
	const start = paths.dirname(file);
	const bounded = inside(start);
	for (let dir = start; ; dir = paths.dirname(dir)) {
		if (markers.some((marker) => exists(paths.join(dir, marker)))) return dir;
		if ((bounded && paths.relative(cwd, dir) === "") || paths.dirname(dir) === dir) break;
	}
	return bounded ? cwd : start;
}

export interface SpawnPlan {
	readonly command: string;
	readonly args: readonly string[];
	readonly windowsVerbatimArguments?: boolean;
}

function quoteForCmd(argument: string): string {
	return /^[\w\-.:\\/=@]+$/.test(argument) ? argument : `"${argument.replaceAll('"', '""')}"`;
}

/**
 * How to start the executable without a shell. Windows cannot run a `.cmd` or
 * `.bat` shim directly (Node refuses since its 2024 security fix), so those go
 * through `cmd.exe /d /s /c "<line>"` with the quoting done here.
 */
export function spawnPlan(executable: string, args: readonly string[], platform: string, env: Env = {}): SpawnPlan {
	if (platform !== "win32" || !/\.(cmd|bat)$/i.test(executable)) return { command: executable, args };
	const line = [executable, ...args].map(quoteForCmd).join(" ");
	return {
		command: envValue(env, "ComSpec") ?? "cmd.exe",
		args: ["/d", "/s", "/c", `"${line}"`],
		windowsVerbatimArguments: true,
	};
}
