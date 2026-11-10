import { basename, join, relative } from "node:path";
import { listFiles, projectChain, readText } from "./files.ts";
import { listOf, readFrontmatter } from "./frontmatter.ts";
import { matchesAnyGlob } from "./glob.ts";
import type {
	InheritedRule,
	InheritProblem,
	InheritRoots,
	InheritScope,
	InheritSwitches,
	InheritTool,
} from "./types.ts";

/**
 * Rules pi does not load by itself.
 *
 * pi reads the first of AGENTS.override.md, AGENTS.md and CLAUDE.md in its own
 * agent directory and in the session's directory and each of its parents.
 * What it never looks at, and what is read here:
 *
 *   user     ~/.claude/CLAUDE.md, ~/.claude/rules, ~/.codex/AGENTS.md
 *   project  .claude/CLAUDE.md, .claude/rules, .cursor/rules/*.mdc, .cursorrules
 *
 * Cursor itself keeps no user rules on disk (they live in its settings
 * database), so there is nothing of Cursor's to read in the home folder.
 */
interface RuleFile {
	readonly path: string;
	readonly tool: InheritTool;
	readonly scope: InheritScope;
	readonly baseDir: string;
	/** Frontmatter key holding the patterns: Cursor says `globs`, Claude Code says `paths`. */
	readonly globsKey?: "globs" | "paths";
	/** A file with no frontmatter switch at all is always on (CLAUDE.md, .cursorrules, a Claude rule without `paths`). */
	readonly alwaysByDefault: boolean;
}

function firstLine(text: string): string {
	const line = text
		.split("\n")
		.map((entry) => entry.replace(/^#+\s*/, "").trim())
		.find((entry) => entry.length > 0);
	return (line ?? "").slice(0, 160);
}

function readRule(file: RuleFile, problems: InheritProblem[]): InheritedRule | undefined {
	const text = readText(file.path, problems);
	if (text === undefined) return undefined;
	const { fields, body } = readFrontmatter(text);
	const content = body.trim();
	if (!content) return undefined;
	const globs = file.globsKey ? listOf(fields[file.globsKey]) : [];
	const always = fields.alwaysApply === true || (file.alwaysByDefault && globs.length === 0);
	const described = typeof fields.description === "string" ? fields.description.trim() : "";
	return {
		path: file.path,
		tool: file.tool,
		scope: file.scope,
		mode: always ? "always" : globs.length > 0 ? "glob" : "described",
		description: described || firstLine(content) || basename(file.path),
		globs: always ? [] : globs,
		baseDir: file.baseDir,
		content,
	};
}

export function discoverRules(
	roots: InheritRoots,
	switches: InheritSwitches,
	problems: InheritProblem[],
): InheritedRule[] {
	if (!switches.rules) return [];
	const files: RuleFile[] = [];
	const projectDirs = roots.projectTrusted ? projectChain(roots.projectDir, roots.home) : [];

	if (switches.claude) {
		const userDir = join(roots.home, ".claude");
		files.push({
			path: join(userDir, "CLAUDE.md"),
			tool: "claude",
			scope: "user",
			baseDir: roots.projectDir,
			alwaysByDefault: true,
		});
		for (const path of listFiles(join(userDir, "rules"), [".md"])) {
			files.push({
				path,
				tool: "claude",
				scope: "user",
				baseDir: roots.projectDir,
				globsKey: "paths",
				alwaysByDefault: true,
			});
		}
	}
	if (switches.codex) {
		const override = join(roots.home, ".codex", "AGENTS.override.md");
		const hasOverride = readText(override, []) !== undefined;
		files.push({
			path: hasOverride ? override : join(roots.home, ".codex", "AGENTS.md"),
			tool: "codex",
			scope: "user",
			baseDir: roots.projectDir,
			alwaysByDefault: true,
		});
	}

	// Outermost folder first, so a rule of the repository root comes before one of a package inside it.
	for (const dir of [...projectDirs].reverse()) {
		if (switches.claude) {
			files.push({
				path: join(dir, ".claude", "CLAUDE.md"),
				tool: "claude",
				scope: "project",
				baseDir: dir,
				alwaysByDefault: true,
			});
			for (const path of listFiles(join(dir, ".claude", "rules"), [".md"])) {
				files.push({
					path,
					tool: "claude",
					scope: "project",
					baseDir: dir,
					globsKey: "paths",
					alwaysByDefault: true,
				});
			}
		}
		if (switches.cursor) {
			files.push({
				path: join(dir, ".cursorrules"),
				tool: "cursor",
				scope: "project",
				baseDir: dir,
				alwaysByDefault: true,
			});
			// `listFiles` skips dot folders below the one it is given, not the one it is given.
			for (const path of listFiles(join(dir, ".cursor", "rules"), [".mdc", ".md"])) {
				files.push({
					path,
					tool: "cursor",
					scope: "project",
					baseDir: dir,
					globsKey: "globs",
					alwaysByDefault: false,
				});
			}
		}
	}

	const rules: InheritedRule[] = [];
	const seen = new Set<string>();
	for (const file of files) {
		if (seen.has(file.path)) continue;
		seen.add(file.path);
		const rule = readRule(file, problems);
		if (rule) rules.push(rule);
	}
	return rules;
}

/** How a rule is named to the model and to people: relative to its folder when it is inside it. */
export function ruleLabel(rule: InheritedRule): string {
	const inside = relative(rule.baseDir, rule.path);
	return inside && !inside.startsWith("..") ? inside.replace(/\\/g, "/") : rule.path;
}

/** The rules whose patterns match `filePath` (absolute). */
export function rulesForFile(rules: readonly InheritedRule[], filePath: string): InheritedRule[] {
	return rules.filter((rule) => {
		if (rule.mode !== "glob") return false;
		const inside = relative(rule.baseDir, filePath);
		if (!inside || inside.startsWith("..")) return false;
		return matchesAnyGlob(inside, rule.globs);
	});
}
