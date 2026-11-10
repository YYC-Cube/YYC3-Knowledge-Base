import type * as Fs from "node:fs";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DefaultPackageManager } from "../src/core/package-manager.ts";
import { SettingsManager } from "../src/core/settings-manager.ts";

/** Every folder the package manager lists, in order. */
const listed = vi.hoisted((): string[] => []);

vi.mock("node:fs", async (importOriginal) => {
	const actual = await importOriginal<typeof Fs>();
	const readdirSync = (...args: unknown[]): unknown => {
		listed.push(String(args[0]));
		return Reflect.apply(actual.readdirSync, actual, args);
	};
	return { ...actual, readdirSync: readdirSync as typeof actual.readdirSync };
});

// Use a junction on Windows, where a directory symlink needs a privilege.
const directoryLinkType = process.platform === "win32" ? "junction" : "dir";

/**
 * Resource walks follow symlinked folders. A link back up used to be walked again at every level, until the path
 * was too long for the file system (about 40 levels); with two such links in one folder the walk doubled at every
 * level, and startup never reached its first frame. Resolved resources are deduplicated afterwards, so what shows
 * whether a folder was walked once is how often it was listed.
 */
describe("resource walks and symlinked folders", () => {
	let tempDir: string;
	let agentDir: string;
	let previousHome: string | undefined;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "pm-link-loops-"));
		agentDir = join(tempDir, "agent");
		mkdirSync(agentDir, { recursive: true });
		previousHome = process.env.HOME;
		process.env.HOME = tempDir;
		listed.length = 0;
	});

	afterEach(() => {
		if (previousHome === undefined) delete process.env.HOME;
		else process.env.HOME = previousHome;
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("lists a skill folder once when a link inside it points back up", async () => {
		const agentsDir = join(tempDir, ".agents");
		const skillPath = join(agentsDir, "skills", "real", "SKILL.md");
		mkdirSync(join(agentsDir, "skills", "real"), { recursive: true });
		writeFileSync(skillPath, "---\nname: real\ndescription: real\n---\n");
		symlinkSync(agentsDir, join(agentsDir, "skills", "up"), directoryLinkType);
		const packageManager = new DefaultPackageManager({
			cwd: join(tempDir, "work"),
			agentDir,
			settingsManager: SettingsManager.inMemory(),
		});
		mkdirSync(join(tempDir, "work"), { recursive: true });

		const result = await packageManager.resolve();

		expect(result.skills.filter((resource) => resource.path === skillPath)).toHaveLength(1);
		const skillsFolderListings = listed.filter(
			(dir) => dir === join(agentsDir, "skills") || dir.endsWith(join("up", "skills")),
		);
		expect(skillsFolderListings).toEqual([join(agentsDir, "skills")]);
	});

	it("lists a prompt folder once when a link inside it points to itself", async () => {
		const promptsDir = join(tempDir, "shared-prompts");
		mkdirSync(promptsDir, { recursive: true });
		const promptPath = join(promptsDir, "review.md");
		writeFileSync(promptPath, "Review the change");
		symlinkSync(promptsDir, join(promptsDir, "again"), directoryLinkType);
		const settingsManager = SettingsManager.inMemory();
		settingsManager.setPromptTemplatePaths([promptsDir]);
		const packageManager = new DefaultPackageManager({ cwd: tempDir, agentDir, settingsManager });

		const result = await packageManager.resolve();

		expect(result.prompts.filter((resource) => resource.path === promptPath)).toHaveLength(1);
		expect(listed.filter((dir) => dir.startsWith(promptsDir))).toEqual([promptsDir]);
	});
});
