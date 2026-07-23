#!/usr/bin/env node
/**
 * 术语一致性审计（轻量）：
 * - 从 .fbs/术语锁定记录.md 的「禁用变体」表提取变体
 * - 扫描 [S3]*.md 是否仍出现禁用变体
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

function parseForbiddenVariants(md) {
  const out = [];
  let inSection = false;
  for (const line of md.split(/\r?\n/)) {
    if (/^##\s*禁用变体/.test(line.trim())) {
      inSection = true;
      continue;
    }
    if (inSection && /^##\s+/.test(line.trim())) break;
    if (!inSection) continue;
    if (!/^\|/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map((s) => s.trim());
    if (!cells.length) continue;
    const v = cells[0];
    if (!v || v === "禁用变体" || /^-+$/.test(v)) continue;
    out.push(v);
  }
  return Array.from(new Set(out));
}

function listS3Files(bookRoot) {
  return fs.readdirSync(bookRoot)
    .filter((n) => /^\[S3.*\.md$/i.test(n))
    .map((n) => path.join(bookRoot, n));
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.bookRoot) {
    console.error("用法: node scripts/audit-term-consistency.mjs --book-root <本书根> [--scan-book-s3] [--enforce]");
    process.exit(2);
  }

  const root = path.resolve(args.bookRoot);
  const rec = path.join(root, ".fbs", "术语锁定记录.md");
  if (!fs.existsSync(rec)) {
    console.log("audit-term-consistency: 术语锁定记录不存在，跳过");
    process.exit(0);
  }
  const variants = parseForbiddenVariants(fs.readFileSync(rec, "utf8"));
  if (!variants.length) {
    console.log("audit-term-consistency: 禁用变体为空，跳过");
    process.exit(0);
  }

  const files = args.scanBookS3 ? listS3Files(root) : [];
  if (!files.length) {
    console.log("audit-term-consistency: 无 [S3]*.md，跳过");
    process.exit(0);
  }

  const hits = [];
  for (const fp of files) {
    const t = fs.readFileSync(fp, "utf8");
    for (const v of variants) {
      if (t.includes(v)) hits.push(`${path.basename(fp)} -> ${v}`);
    }
  }

  if (!hits.length) {
    console.log("audit-term-consistency: ✅ 通过");
    process.exit(0);
  }

  console.log(`audit-term-consistency: ⚠ 发现禁用变体 ${hits.length} 条`);
  hits.slice(0, 30).forEach((h) => console.log(`  - ${h}`));
  process.exit(args.enforce ? 1 : 0);
}

main();
