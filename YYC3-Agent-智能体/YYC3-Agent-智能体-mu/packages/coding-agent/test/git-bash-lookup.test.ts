import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getShellConfig, gitBashCandidates } from "../src/utils/shell.ts";

describe("where Git Bash is looked for on Windows", () => {
	it("tries the machine-wide installs, the per-user install, then the bin folder beside each git on PATH", () => {
		const env = {
			ProgramFiles: "C:\\Program Files",
			"ProgramFiles(x86)": "C:\\Program Files (x86)",
			LOCALAPPDATA: "C:\\Users\\张三\\AppData\\Local",
			// Windows spells it Path; an entry can be quoted, and the per-user Git is found a second time here.
			Path: 'C:\\Windows\\system32;"D:\\Tools\\Git\\cmd";C:\\Users\\张三\\AppData\\Local\\Programs\\Git\\cmd;;',
		};
		const gits = new Set([
			"D:\\Tools\\Git\\cmd\\git.exe",
			"C:\\Users\\张三\\AppData\\Local\\Programs\\Git\\cmd\\git.exe",
		]);
		expect(gitBashCandidates(env, (path) => gits.has(path))).toEqual([
			"C:\\Program Files\\Git\\bin\\bash.exe",
			"C:\\Program Files (x86)\\Git\\bin\\bash.exe",
			"C:\\Users\\张三\\AppData\\Local\\Programs\\Git\\bin\\bash.exe",
			"D:\\Tools\\Git\\bin\\bash.exe",
		]);
	});

	it("names nothing it has no folder for", () => {
		expect(gitBashCandidates({}, () => false)).toEqual([]);
		expect(gitBashCandidates({ PATH: "C:\\Windows" }, () => false)).toEqual([]);
	});

	it("finds a per-user install, and says what it searched when there is none", () => {
		// Windows paths on a POSIX test machine: a file named with backslashes in the current folder stands for one.
		if (process.platform === "win32") return;
		const dir = mkdtempSync(join(tmpdir(), "git-bash-"));
		const originalCwd = process.cwd();
		const platform = Object.getOwnPropertyDescriptor(process, "platform");
		const saved = Object.fromEntries(
			["ProgramFiles", "ProgramFiles(x86)", "LOCALAPPDATA", "PATH"].map((key) => [key, process.env[key]]),
		);
		try {
			process.chdir(dir);
			Object.defineProperty(process, "platform", { configurable: true, value: "win32" });
			delete process.env.ProgramFiles;
			delete process.env["ProgramFiles(x86)"];
			process.env.LOCALAPPDATA = "Local";
			process.env.PATH = "nowhere";

			// The first line is what the desktop app recognises (its adapter shows a line with the download link instead).
			expect(() => getShellConfig()).toThrow(/^No bash shell found\. Options:\n/);
			expect(() => getShellConfig()).toThrow("Searched Git Bash in:\n  Local\\Programs\\Git\\bin\\bash.exe");

			writeFileSync("Local\\Programs\\Git\\bin\\bash.exe", "");
			expect(getShellConfig()).toEqual({ shell: "Local\\Programs\\Git\\bin\\bash.exe", args: ["-c"] });
		} finally {
			process.chdir(originalCwd);
			if (platform) Object.defineProperty(process, "platform", platform);
			for (const [key, value] of Object.entries(saved)) {
				if (value === undefined) delete process.env[key];
				else process.env[key] = value;
			}
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
