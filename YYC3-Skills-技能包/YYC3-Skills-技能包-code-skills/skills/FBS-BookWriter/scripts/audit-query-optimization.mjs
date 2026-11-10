#!/usr/bin/env node
/**
 * 审计 search-ledger 中 queryOptimization 字段。
 * 规则：kind=search 且 ok!==false 时，必须有非空 queryOptimization。
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
    console.error("用法: node scripts/audit-query-optimization.mjs --book-root <本书根> [--enforce]");
    process.exit(2);
  }
  const p = path.join(path.resolve(args.bookRoot), ".fbs", "search-ledger.jsonl");
  if (!fs.existsSync(p)) {
    console.log("audit-query-optimization: ledger 不存在，跳过");
    process.exit(0);
  }

  const missing = [];
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try {
      const e = JSON.parse(t);
      if (e.kind !== "search" || e.ok === false) continue;
      if (!String(e.queryOptimization || "").trim()) {
        missing.push({ chapterId: e.chapterId || "-", query: e.query || "-" });
      }
    } catch {
      // ignore malformed line
    }
  }

  if (!missing.length) {
    console.log("audit-query-optimization: ✅ 通过");
    process.exit(0);
  }

  console.log(`audit-query-optimization: ⚠ 缺失 queryOptimization ${missing.length} 条`);
  missing.slice(0, 20).forEach((m) => console.log(`  - ${m.chapterId}: ${m.query}`));
  process.exit(args.enforce ? 1 : 0);
}

main();
