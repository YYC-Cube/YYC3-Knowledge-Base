#!/usr/bin/env node
/**
 * 审计待核实清单：存在未勾选项时输出告警；--enforce 下阻断。
 */
import fs from "fs";
import path from "path";

function parseArgs(argv) {
  const o = { bookRoot: null, enforce: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--book-root") o.bookRoot = argv[++i];
    else if (a === "--enforce") o.enforce = true;
  }
  return o;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.bookRoot) {
    console.error("用法: node scripts/audit-pending-verification.mjs --book-root <本书根> [--enforce]");
    process.exit(2);
  }

  const root = path.resolve(args.bookRoot);
  const cands = [
    path.join(root, ".fbs", "writing-notes", "pending-verification.md"),
    path.join(root, ".fbs", "writing-notes", ".pending-verification.md"),
  ];
  const p = cands.find((x) => fs.existsSync(x));
  if (!p) {
    console.log("audit-pending-verification: 清单不存在，视为通过");
    process.exit(0);
  }

  const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
  const todo = lines.filter((l) => /^\s*-\s*\[\s\]/.test(l));
  if (!todo.length) {
    console.log("audit-pending-verification: ✅ 无待核实项");
    process.exit(0);
  }

  console.log(`audit-pending-verification: ⚠ 仍有 ${todo.length} 项待核实`);
  todo.slice(0, 20).forEach((l) => console.log(`  - ${l.trim()}`));
  process.exit(args.enforce ? 1 : 0);
}

main();
