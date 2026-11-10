#!/usr/bin/env node
/**
 * 一键初始化本书项目记忆（若扩展脚本随包存在则串联调用）。
 * 用法（在技能包根目录）：
 *   node scripts/init-project-memory.mjs --book <本书根目录> [--skill <技能根，默认当前包根>]
 *   [--with-workbuddy-hint]  可选：生成 .fbs/workbuddy-memory-digest.json（见 workbuddy-user-memory-strategy.md）
 *   [--workbuddy-hint-workspace-only]  与上一项同用：不读取 %USERPROFILE%/.workbuddy 下用户档案文件
 *   [--with-environment-snapshot]  可选：生成 .fbs/workbuddy-environment.json（见 search-policy environmentSnapshot）
 *   [--no-redact]  与 digest/快照 --write 同用时保留明文路径（调试；默认随 CLI 脱敏）
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SKILL = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const o = {
    book: null,
    skill: DEFAULT_SKILL,
    withWorkbuddyHint: false,
    workbuddyHintWorkspaceOnly: false,
    withEnvironmentSnapshot: false,
    noRedact: false,
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--book") o.book = argv[++i];
    else if (argv[i] === "--skill") o.skill = path.resolve(argv[++i]);
    else if (argv[i] === "--with-workbuddy-hint") o.withWorkbuddyHint = true;
    else if (argv[i] === "--workbuddy-hint-workspace-only") o.workbuddyHintWorkspaceOnly = true;
    else if (argv[i] === "--with-environment-snapshot") o.withEnvironmentSnapshot = true;
    else if (argv[i] === "--no-redact") o.noRedact = true;
  }
  return o;
}

function runIfExists(skillRoot, scriptRel, argvExtra) {
  const scriptPath = path.join(skillRoot, scriptRel);
  if (!fs.existsSync(scriptPath)) {
    console.warn(`init-project-memory: 跳过（未找到 ${scriptRel}）`);
    return 0;
  }
  const r = spawnSync(process.execPath, [scriptPath, ...argvExtra], {
    cwd: skillRoot,
    encoding: "utf8",
    stdio: "inherit",
  });
  return r.status ?? 1;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.book) {
    console.error(
        "用法: node scripts/init-project-memory.mjs --book <本书根> [--skill <技能包根>] [--with-workbuddy-hint] [--workbuddy-hint-workspace-only] [--with-environment-snapshot] [--no-redact]\n" +
        "说明: 若存在 scripts/apply-book-memory-template.mjs 与 scripts/generate-book-context-index.mjs 将依次调用；可选 digest / 环境快照见 references/05-ops/workbuddy-user-memory-strategy.md 与 search-policy environmentSnapshot；--write 类输出默认脱敏路径，除非 --no-redact。"
    );
    process.exit(2);
  }
  const book = path.resolve(args.book);
  const skillRoot = args.skill;

  let code = 0;
  code = runIfExists(skillRoot, "scripts/apply-book-memory-template.mjs", ["--book", book, "--skill", skillRoot]);
  if (code !== 0) process.exit(code);
  code = runIfExists(skillRoot, "scripts/generate-book-context-index.mjs", ["--book", book, "--skill", skillRoot]);
  if (code !== 0) process.exit(code);

  if (args.withWorkbuddyHint) {
    const digestScript = path.join(skillRoot, "scripts/workbuddy-memory-digest.mjs");
    if (!fs.existsSync(digestScript)) {
      console.warn("init-project-memory: 跳过 WorkBuddy 摘要（未找到 scripts/workbuddy-memory-digest.mjs）");
    } else {
      const extra = [
        digestScript,
        "--skill-root",
        skillRoot,
        "--book-root",
        book,
        "--write",
      ];
      if (args.workbuddyHintWorkspaceOnly) extra.push("--no-user-profile");
      if (args.noRedact) extra.push("--no-redact");
      const r = spawnSync(process.execPath, extra, { cwd: skillRoot, encoding: "utf8", stdio: "inherit" });
      if ((r.status ?? 1) !== 0) process.exit(r.status ?? 1);
    }
  }

  if (args.withEnvironmentSnapshot) {
    const snapScript = path.join(skillRoot, "scripts/workbuddy-environment-snapshot.mjs");
    if (!fs.existsSync(snapScript)) {
      console.warn("init-project-memory: 跳过环境快照（未找到 scripts/workbuddy-environment-snapshot.mjs）");
    } else {
      const snapExtra = [snapScript, "--skill-root", skillRoot, "--book-root", book, "--write"];
      if (args.workbuddyHintWorkspaceOnly) snapExtra.push("--no-user-probes");
      if (args.noRedact) snapExtra.push("--no-redact");
      const r2 = spawnSync(process.execPath, snapExtra, { cwd: skillRoot, encoding: "utf8", stdio: "inherit" });
      if ((r2.status ?? 1) !== 0) process.exit(r2.status ?? 1);
    }
  }

  console.log("init-project-memory: 完成（输出见上方；未随包的子步骤会显示「跳过」）");
}

main();
