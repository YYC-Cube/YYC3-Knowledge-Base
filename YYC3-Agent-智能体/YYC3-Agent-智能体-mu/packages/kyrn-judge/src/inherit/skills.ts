import { readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { parseFrontmatter } from "@earendil-works/pi-coding-agent";
import { canonical, projectChain, readText } from "./files.ts";
import type {
	InheritedSkill,
	InheritProblem,
	InheritRoots,
	InheritScope,
	InheritSwitches,
	InheritTool,
} from "./types.ts";

/**
 * Skills the user already installed for Claude Code and Codex. Both keep one
 * folder per skill with a SKILL.md inside (`~/.claude/skills/<name>/`,
 * `~/.codex/skills/<name>/`, `<project>/.claude/skills/<name>/`), very often as
 * symlinks into one shared place, so the same skill shows up several times.
 *
 * Each skill is handed to pi as its own folder, once: a skill pi already has,
 * by file or by name, is left out, because pi reports a name clash as a
 * warning on every start.
 */
interface SkillFile {
	readonly name: string;
	readonly dir: string;
	readonly file: string;
}

type SkillFrontmatter = { name?: unknown; description?: unknown };

function readSkill(dir: string, problems: InheritProblem[]): SkillFile | undefined {
	const file = join(dir, "SKILL.md");
	const text = readText(file, problems, 512 * 1024);
	if (text === undefined) return undefined;
	let frontmatter: SkillFrontmatter;
	try {
		frontmatter = parseFrontmatter<SkillFrontmatter>(text).frontmatter;
	} catch {
		problems.push({ source: file, message: "skipped: its frontmatter is not valid YAML" });
		return undefined;
	}
	// pi drops a skill without a description, so it is not counted here either.
	if (typeof frontmatter.description !== "string" || !frontmatter.description.trim()) return undefined;
	const name =
		typeof frontmatter.name === "string" && frontmatter.name.trim() ? frontmatter.name.trim() : basename(dir);
	return { name, dir, file };
}

/** Skill folders below `root`. A folder with a SKILL.md is a skill and is not searched further. */
function skillsBelow(root: string, problems: InheritProblem[], depth = 3): SkillFile[] {
	let names: string[];
	try {
		names = readdirSync(root).sort();
	} catch {
		return [];
	}
	const skills: SkillFile[] = [];
	for (const name of names) {
		// Codex keeps its own bundled skills in `.system`; those belong to Codex.
		if (name.startsWith(".") || name === "node_modules") continue;
		const dir = join(root, name);
		try {
			// statSync follows the symlinks these folders usually are; a dangling one throws and is skipped.
			if (!statSync(dir).isDirectory()) continue;
		} catch {
			continue;
		}
		const skill = readSkill(dir, problems);
		if (skill) skills.push(skill);
		else if (depth > 0) skills.push(...skillsBelow(dir, problems, depth - 1));
	}
	return skills;
}

export function discoverSkills(
	roots: InheritRoots,
	switches: InheritSwitches,
	problems: InheritProblem[],
	/** Folders pi loads skills from by itself. What is found there is never offered a second time. */
	piSkillDirs: readonly string[] = [],
): InheritedSkill[] {
	if (!switches.skills) return [];
	const sources: { dir: string; tool: InheritTool; scope: InheritScope }[] = [];
	if (switches.claude && roots.projectTrusted) {
		for (const dir of projectChain(roots.projectDir, roots.home)) {
			sources.push({ dir: join(dir, ".claude", "skills"), tool: "claude", scope: "project" });
		}
	}
	if (switches.claude) sources.push({ dir: join(roots.home, ".claude", "skills"), tool: "claude", scope: "user" });
	if (switches.codex) sources.push({ dir: join(roots.home, ".codex", "skills"), tool: "codex", scope: "user" });

	const names = new Set<string>();
	const files = new Set<string>();
	const quiet: InheritProblem[] = [];
	for (const dir of piSkillDirs) {
		for (const skill of skillsBelow(dir, quiet)) {
			names.add(skill.name);
			files.add(canonical(skill.file));
		}
	}

	const skills: InheritedSkill[] = [];
	for (const source of sources) {
		for (const skill of skillsBelow(source.dir, problems)) {
			const file = canonical(skill.file);
			if (names.has(skill.name) || files.has(file)) continue;
			names.add(skill.name);
			files.add(file);
			skills.push({ name: skill.name, dir: skill.dir, tool: source.tool, scope: source.scope });
		}
	}
	return skills;
}
