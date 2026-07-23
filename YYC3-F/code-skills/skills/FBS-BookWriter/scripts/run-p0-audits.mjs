#!/usr/bin/env node
/**
 * 串跑 P0 审计：temporal + terms + pending。
 */
import path from "path";
import { spawnSync } from "child_process";

function parseArgs(argv) {
  const o = { skillRoot: process.cwd(), bookRoot: null, strict: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--skill-root") o.skillRoot = argv[++i];
    else if (a === "--book-root") o.bookRoot = argv[++i];
    else if (a === "--strict") o.strict = true;
  }
  return o;
}

function run(script, args) {
  const r = spawnSync(process.execPath, [script, ...args], { stdio: "inherit" });
  return typeof r.status === "number" ? r.status : 2;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.bookRoot) {
    console.error("用法: node scripts/run-p0-audits.mjs --skill-root <技能根> --book-root <本书根> [--strict]");
    process.exit(2);
  }

  const root = path.resolve(args.skillRoot || process.cwd());
  const bookRoot = path.resolve(args.bookRoot);
  const scripts = path.join(root, "scripts");

  const enforce = args.strict ? ["--enforce"] : [];

  const c1 = run(path.join(scripts, "audit-temporal-accuracy.mjs"), ["--book-root", bookRoot, "--scan-book-s3", ...enforce]);
  if (c1 !== 0 && args.strict) process.exit(c1);

  const c2 = run(path.join(scripts, "audit-term-consistency.mjs"), ["--book-root", bookRoot, "--scan-book-s3", ...enforce]);
  if (c2 !== 0 && args.strict) process.exit(c2);

  const c3 = run(path.join(scripts, "audit-pending-verification.mjs"), ["--book-root", bookRoot, ...enforce]);
  if (c3 !== 0 && args.strict) process.exit(c3);

  console.log("run-p0-audits: ✅ 完成");
  process.exit(0);
}

main();
