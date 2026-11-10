#!/usr/bin/env node
/**
 * 时间标签审计（轻量）：
 * - 扫描 [S3]*.md 中出现的 4 位年份
 * - 校验 search-ledger.jsonl 是否存在 yearSourceConfirmed=true 的对应年份证据
 */
import fs from "fs";
import path from "path";

function parseArgs(argv) {
  const o = { bookRoot: null, enforce: false, scanBookS3: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--book-root") o.bookRoot = argv[++i];
    else if (a === "--enforce") o.enforce = true;
    else if (a === "--scan-book-s3") o.scanBookS3 = true;
  }
  return o;
}

function listS3Files(bookRoot) {
  return fs.readdirSync(bookRoot)
    .filter((n) => /^\[S3.*\.md$/i.test(n))
    .map((n) => path.join(bookRoot, n));
}

function extractYears(text) {
  const out = new Set();
  const m = text.match(/\b(19\d{2}|20\d{2})\b/g) || [];
  m.forEach((y) => out.add(y));
  return [...out];
}

function readConfirmedYears(ledgerPath) {
  const s = new Set();
  if (!fs.existsSync(ledgerPath)) return s;
  for (const line of fs.readFileSync(ledgerPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try {
      const e = JSON.parse(t);
      if (e.kind !== "search" || e.ok === false) continue;
      if (e.yearSourceConfirmed !== true) continue;
      const q = String(e.query || "");
      const years = q.match(/\b(19\d{2}|20\d{2})\b/g) || [];
      years.forEach((y) => s.add(y));
    } catch {
      // ignore
    }
  }
  return s;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.bookRoot) {
    console.error("用法: node scripts/audit-temporal-accuracy.mjs --book-root <本书根> [--scan-book-s3] [--enforce]");
    process.exit(2);
  }

  const root = path.resolve(args.bookRoot);
  const files = args.scanBookS3 ? listS3Files(root) : [];
  if (!files.length) {
    console.log("audit-temporal-accuracy: 无 [S3]*.md，跳过");
    process.exit(0);
  }

  const confirmed = readConfirmedYears(path.join(root, ".fbs", "search-ledger.jsonl"));
  const issues = [];

  for (const fp of files) {
    const years = extractYears(fs.readFileSync(fp, "utf8"));
    for (const y of years) {
      if (!confirmed.has(y)) issues.push(`${path.basename(fp)} -> ${y}`);
    }
  }

  if (!issues.length) {
    console.log("audit-temporal-accuracy: ✅ 通过");
    process.exit(0);
  }

  console.log(`audit-temporal-accuracy: ⚠ 发现未确认年份 ${issues.length} 条`);
  issues.slice(0, 30).forEach((i) => console.log(`  - ${i}`));
  process.exit(args.enforce ? 1 : 0);
}

main();
