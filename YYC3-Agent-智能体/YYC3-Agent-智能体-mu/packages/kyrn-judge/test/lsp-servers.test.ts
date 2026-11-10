import { describe, expect, it } from "vitest";
import {
	BUILT_IN_SERVERS,
	detectServers,
	findOnPath,
	findRoot,
	languageIdFor,
	mergeServers,
	serversFor,
	spawnPlan,
} from "../src/lsp/servers.ts";

const files = (...paths: string[]) => {
	const set = new Set(paths);
	return (path: string) => set.has(path);
};

describe("finding a server on PATH", () => {
	it("walks PATH in order on POSIX", () => {
		const isExecutable = files("/opt/tools/gopls", "/usr/bin/gopls", "/usr/bin/clangd");
		const options = { env: { PATH: "/usr/local/bin:/opt/tools:/usr/bin" }, platform: "darwin", isExecutable };
		expect(findOnPath("gopls", options)).toBe("/opt/tools/gopls");
		expect(findOnPath("clangd", options)).toBe("/usr/bin/clangd");
		expect(findOnPath("rust-analyzer", options)).toBeUndefined();
		expect(findOnPath("gopls", { ...options, env: {} })).toBeUndefined();
	});

	it("tries the PATHEXT endings on Windows, where npm installs a .cmd shim", () => {
		// Windows file names compare without case: PATHEXT says .CMD, the file is .cmd.
		const onDisk = ["c:\\users\\me\\appdata\\roaming\\npm\\typescript-language-server.cmd", "c:\\go\\bin\\gopls.exe"];
		const isExecutable = (path: string) => onDisk.includes(path.toLowerCase());
		const env = {
			Path: "C:\\Windows;C:\\Users\\me\\AppData\\Roaming\\npm;C:\\Go\\bin",
			PATHEXT: ".COM;.EXE;.BAT;.CMD",
		};
		const options = { env, platform: "win32", isExecutable };
		expect(findOnPath("typescript-language-server", options)).toBe(
			"C:\\Users\\me\\AppData\\Roaming\\npm\\typescript-language-server.CMD",
		);
		expect(findOnPath("gopls", options)).toBe("C:\\Go\\bin\\gopls.EXE");
		// Without PATHEXT in the environment the usual endings still apply.
		expect(findOnPath("gopls", { ...options, env: { PATH: env.Path } })).toBe("C:\\Go\\bin\\gopls.EXE");
	});

	it("inside WSL prefers a Linux binary and takes only a real .exe from the Windows folders", () => {
		const env = { WSL_DISTRO_NAME: "Ubuntu", PATH: "/mnt/c/Users/me/AppData/Roaming/npm:/usr/bin:/mnt/c/LLVM/bin" };
		const isExecutable = files(
			// The shell shim npm writes for Git Bash: it would run Windows' node.
			"/mnt/c/Users/me/AppData/Roaming/npm/typescript-language-server",
			"/usr/bin/gopls",
			"/mnt/c/LLVM/bin/clangd.exe",
		);
		const options = { env, platform: "linux", isExecutable };
		expect(findOnPath("typescript-language-server", options)).toBeUndefined();
		expect(findOnPath("gopls", options)).toBe("/usr/bin/gopls");
		expect(findOnPath("clangd", options)).toBe("/mnt/c/LLVM/bin/clangd.exe");
	});

	it("takes a command with a directory as a path", () => {
		const options = { env: { PATH: "/usr/bin" }, platform: "linux", isExecutable: files("/opt/zls/zls") };
		expect(findOnPath("/opt/zls/zls", options)).toBe("/opt/zls/zls");
		expect(findOnPath("/opt/zls/missing", options)).toBeUndefined();
	});
});

describe("the server table", () => {
	const installed =
		(...commands: string[]) =>
		(command: string) =>
			commands.includes(command) ? `/bin/${command}` : undefined;

	it("uses the first installed server of each group and lists the others as alternatives", () => {
		const detected = detectServers(BUILT_IN_SERVERS, installed("vtsls", "pyright-langserver", "pylsp", "gopls"));
		expect(detected.filter((server) => server.chosen).map((server) => server.spec.id)).toEqual([
			"vtsls",
			"pyright-langserver",
			"gopls",
		]);
		expect(serversFor("/p/src/app.tsx", detected).map((server) => server.executable)).toEqual(["/bin/vtsls"]);
		expect(serversFor("/p/tool.PY", detected).map((server) => server.spec.id)).toEqual(["pyright-langserver"]);
		expect(serversFor("/p/main.rs", detected)).toEqual([]);
		expect(serversFor("/p/README.md", detected)).toEqual([]);
	});

	it("lets the user add, override and remove servers, and prefers what the user set up", () => {
		const { servers, problems } = mergeServers([
			{
				origin: "user",
				servers: {
					zls: { command: "zls", extensions: ["zig"], rootMarkers: ["build.zig"] },
					pylsp: { command: "/opt/venv/bin/pylsp", args: ["-v"] },
					gopls: false,
					broken: { args: ["--stdio"] },
					worse: "yes",
				},
			},
		]);
		expect(problems).toHaveLength(2);
		expect(servers.find((spec) => spec.id === "gopls")).toBeUndefined();
		expect(servers.find((spec) => spec.id === "zls")).toMatchObject({
			extensions: [".zig"],
			origin: "user",
			args: [],
		});
		expect(servers.find((spec) => spec.id === "pylsp")).toMatchObject({
			command: "/opt/venv/bin/pylsp",
			args: ["-v"],
			extensions: [".py", ".pyi"],
			group: "python",
			origin: "user",
		});
		// pyright comes first in the built-in order, but the user configured pylsp.
		const detected = detectServers(servers, (command) => (command.includes("py") ? command : undefined));
		expect(serversFor("/p/a.py", detected).map((server) => server.spec.id)).toEqual(["pylsp"]);
	});

	it("marks whatever a project file touches as coming from the project", () => {
		const { servers } = mergeServers([
			{ origin: "user", servers: { clangd: { args: ["--background-index"] } } },
			{
				origin: "project",
				servers: { clangd: { command: "./tools/evil" }, extra: { command: "x", extensions: [".x"] } },
			},
		]);
		expect(servers.find((spec) => spec.id === "clangd")).toMatchObject({
			command: "./tools/evil",
			args: ["--background-index"],
			origin: "project",
		});
		expect(servers.find((spec) => spec.id === "extra")?.origin).toBe("project");
		expect(servers.find((spec) => spec.id === "rust-analyzer")?.origin).toBe("built-in");
	});

	it("names the language of a file", () => {
		expect(languageIdFor("/p/a.tsx")).toBe("typescriptreact");
		expect(languageIdFor("C:\\p\\b.PY")).toBe("python");
		expect(languageIdFor("/p/c.zig")).toBe("zig");
		expect(languageIdFor("/p/Makefile")).toBe("plaintext");
	});
});

describe("workspace root", () => {
	it("is the nearest marker above the file, and never above the session's directory", () => {
		const exists = files("/work/package.json", "/work/app/packages/ui/tsconfig.json", "/work/app/go.mod");
		const markers = ["tsconfig.json", "package.json"];
		expect(findRoot("/work/app/packages/ui/src/x.ts", markers, "/work/app", exists, "linux")).toBe(
			"/work/app/packages/ui",
		);
		// /work/package.json is above the session's directory: not ours to pick.
		expect(findRoot("/work/app/scripts/y.ts", markers, "/work/app", exists, "linux")).toBe("/work/app");
		expect(findRoot("/work/app/cmd/main.go", ["go.mod"], "/work/app", exists, "linux")).toBe("/work/app");
	});

	it("searches up to the file system root for a file outside the session's directory", () => {
		const exists = files("/other/lib/Cargo.toml");
		expect(findRoot("/other/lib/src/deep/m.rs", ["Cargo.toml"], "/work/app", exists, "linux")).toBe("/other/lib");
		expect(findRoot("/tmp/scratch/m.rs", ["Cargo.toml"], "/work/app", exists, "linux")).toBe("/tmp/scratch");
	});

	it("works with Windows paths", () => {
		const exists = files("C:\\work\\app\\web\\package.json");
		expect(findRoot("C:\\work\\app\\web\\src\\x.ts", ["package.json"], "C:\\work\\app", exists, "win32")).toBe(
			"C:\\work\\app\\web",
		);
		expect(findRoot("C:\\work\\app\\api\\x.ts", ["package.json"], "C:\\work\\app", exists, "win32")).toBe(
			"C:\\work\\app",
		);
	});
});

describe("starting a server without a shell", () => {
	it("runs a binary directly on every platform", () => {
		expect(spawnPlan("/usr/bin/clangd", ["--log=error"], "linux")).toEqual({
			command: "/usr/bin/clangd",
			args: ["--log=error"],
		});
		expect(spawnPlan("C:\\Go\\bin\\gopls.exe", [], "win32")).toEqual({ command: "C:\\Go\\bin\\gopls.exe", args: [] });
	});

	it("hands a Windows .cmd shim to cmd.exe as one quoted line", () => {
		const plan = spawnPlan(
			"C:\\Users\\my name\\npm\\typescript-language-server.cmd",
			["--stdio", "--log level=4"],
			"win32",
			{ COMSPEC: "C:\\Windows\\System32\\cmd.exe" },
		);
		expect(plan).toEqual({
			command: "C:\\Windows\\System32\\cmd.exe",
			args: [
				"/d",
				"/s",
				"/c",
				'""C:\\Users\\my name\\npm\\typescript-language-server.cmd" --stdio "--log level=4""',
			],
			windowsVerbatimArguments: true,
		});
		expect(spawnPlan("C:\\x\\s.CMD", [], "win32").command).toBe("cmd.exe");
		// The same file name is nothing special elsewhere.
		expect(spawnPlan("/opt/s.cmd", [], "linux").command).toBe("/opt/s.cmd");
	});
});
