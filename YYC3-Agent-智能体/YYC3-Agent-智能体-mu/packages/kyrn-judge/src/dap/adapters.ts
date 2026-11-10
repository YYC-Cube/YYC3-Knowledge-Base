import { extname, posix, win32 } from "node:path";
import type { Transport } from "./client.ts";

/**
 * Which debug adapter debugs what. Built in are the adapters that speak the
 * protocol themselves and are one install away: debugpy for Python, delve for
 * Go, lldb-dap for anything compiled (C, C++, Rust, Swift). The user can add
 * or replace any of them in mu.json (`features.packs.debugAdapters`), which is
 * how js-debug or codelldb come in.
 */
export interface AdapterSpec {
	readonly id: string;
	readonly title: string;
	readonly transport: Transport;
	/** A name looked up on PATH, or a path. */
	readonly command: string;
	/** `{port}` is replaced by the port a TCP adapter is to listen on. */
	readonly args: readonly string[];
	/** File endings of the programs it debugs, with the dot. Empty: a compiled program of any name. */
	readonly extensions: readonly string[];
	/** The rest of the `launch` arguments; program, args and cwd are added. */
	readonly launch: Readonly<Record<string, unknown>>;
	/** Arguments that exit 0 only when the adapter can run (debugpy is a Python module, not a program). */
	readonly probe?: readonly string[];
	/** Where it is installed when it is not on PATH: Apple ships lldb-dap with its tools, off PATH. */
	readonly fallbacks?: readonly string[];
	readonly install: string;
}

export function builtInAdapters(platform: NodeJS.Platform): AdapterSpec[] {
	const python = platform === "win32" ? "python" : "python3";
	return [
		{
			id: "debugpy",
			title: "Python (debugpy)",
			transport: "stdio",
			command: python,
			args: ["-m", "debugpy.adapter"],
			extensions: [".py"],
			launch: { type: "python", console: "internalConsole", justMyCode: true, redirectOutput: true },
			probe: ["-c", "import debugpy"],
			install: `${python} -m pip install debugpy`,
		},
		{
			id: "delve",
			title: "Go (delve)",
			transport: "tcp",
			command: "dlv",
			args: ["dap", "--listen", "127.0.0.1:{port}"],
			extensions: [".go"],
			launch: { type: "go", mode: "debug" },
			install: "go install github.com/go-delve/delve/cmd/dlv@latest",
		},
		{
			id: "lldb-dap",
			title: "Compiled programs (lldb-dap)",
			transport: "stdio",
			command: "lldb-dap",
			args: [],
			extensions: [],
			launch: { type: "lldb-dap" },
			fallbacks:
				platform === "darwin"
					? [
							"/Library/Developer/CommandLineTools/usr/bin/lldb-dap",
							"/Applications/Xcode.app/Contents/Developer/usr/bin/lldb-dap",
							"/opt/homebrew/opt/llvm/bin/lldb-dap",
							"/usr/local/opt/llvm/bin/lldb-dap",
						]
					: [],
			install:
				platform === "darwin"
					? "xcode-select --install (lldb-dap comes with the command line tools), or brew install llvm"
					: platform === "win32"
						? "winget install LLVM.LLVM"
						: "install LLVM 18 or newer from your package manager (it ships lldb-dap)",
		},
	];
}

/** What a user may write for an adapter in mu.json. Anything missing falls back to the built-in of that id. */
export interface AdapterOverride {
	readonly title?: string;
	readonly transport?: Transport;
	readonly command?: string;
	readonly args?: readonly string[];
	readonly extensions?: readonly string[];
	readonly launch?: Readonly<Record<string, unknown>>;
	readonly install?: string;
}

function strings(value: unknown): string[] | undefined {
	return Array.isArray(value) && value.every((item) => typeof item === "string") ? [...value] : undefined;
}

/** The built-ins with the user's changes, and the user's own adapters first, so their endings win. */
export function adaptersFor(platform: NodeJS.Platform, overrides: unknown): AdapterSpec[] {
	const builtIn = builtInAdapters(platform);
	if (typeof overrides !== "object" || overrides === null) return builtIn;
	const own: AdapterSpec[] = [];
	const changed = new Map<string, AdapterSpec>();
	for (const [id, raw] of Object.entries(overrides as Record<string, unknown>)) {
		if (typeof raw !== "object" || raw === null) continue;
		const value = raw as Record<string, unknown>;
		const base = builtIn.find((spec) => spec.id === id);
		const command = typeof value.command === "string" ? value.command : base?.command;
		if (!command) continue;
		const spec: AdapterSpec = {
			id,
			title: typeof value.title === "string" ? value.title : (base?.title ?? id),
			transport:
				value.transport === "tcp" || value.transport === "stdio" ? value.transport : (base?.transport ?? "stdio"),
			command,
			args: strings(value.args) ?? base?.args ?? [],
			extensions: strings(value.extensions) ?? base?.extensions ?? [],
			launch:
				typeof value.launch === "object" && value.launch !== null
					? (value.launch as Record<string, unknown>)
					: (base?.launch ?? {}),
			// A command the user chose is theirs to know how to run: no probe, no other places to look.
			probe: value.command === undefined ? base?.probe : undefined,
			fallbacks: value.command === undefined ? base?.fallbacks : undefined,
			install: typeof value.install === "string" ? value.install : (base?.install ?? `install ${command}`),
		};
		if (base) changed.set(id, spec);
		else own.push(spec);
	}
	return [...own, ...builtIn.map((spec) => changed.get(spec.id) ?? spec)];
}

/** The adapter for a program: the one asked for by id, else the first whose endings match, else the catch-all. */
export function pickAdapter(
	program: string,
	adapters: readonly AdapterSpec[],
	requested?: string,
): AdapterSpec | undefined {
	if (requested) return adapters.find((spec) => spec.id === requested);
	const ending = extname(program).toLowerCase();
	return (
		(ending ? adapters.find((spec) => spec.extensions.includes(ending)) : undefined) ??
		adapters.find((spec) => spec.extensions.length === 0)
	);
}

/**
 * The `launch` arguments: the adapter's own, then what the call adds (`module` for debugpy, `mode`
 * for delve), then the program, its arguments and its directory, which are always the call's.
 */
export function launchArguments(
	spec: AdapterSpec,
	request: {
		program?: string;
		args: readonly string[];
		cwd: string;
		extra?: Readonly<Record<string, unknown>>;
	},
): Record<string, unknown> {
	const { request: _request, name: _name, ...extra } = request.extra ?? {};
	return {
		stopOnEntry: false,
		...spec.launch,
		...extra,
		request: "launch",
		name: "mu",
		...(request.program ? { program: request.program } : {}),
		args: [...request.args],
		cwd: request.cwd,
	};
}

/**
 * The interpreter of the project's own virtual environment, when there is one: the program has to
 * run there to find its packages, and it is also the first place to look for the adapter.
 */
export function projectInterpreter(
	spec: AdapterSpec,
	cwd: string,
	platform: NodeJS.Platform,
	isExecutable: (path: string) => boolean,
): string | undefined {
	if (spec.id !== "debugpy") return undefined;
	const paths = platform === "win32" ? win32 : posix;
	const inside = platform === "win32" ? ["Scripts", "python.exe"] : ["bin", "python"];
	return [".venv", "venv"].map((dir) => paths.join(cwd, dir, ...inside)).find((path) => isExecutable(path));
}
