#!/usr/bin/env node
/**
 * 术语门禁：
 * - 读取 .fbs/GLOSSARY.md 与 .fbs/术语锁定记录.md（若存在）
 * - --strict 时命中禁用变体则阻断
 */
import fs from "fs";
import path from "path";

function parseArgs(argv) {
  const o = { bookRoot: null, chapterFile: null, strict: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--book-root") o.bookRoot = argv[++i];
    else if (a === "--chapter-file") o.chapterFile = argv[++i];
    else if (a === "--strict") o.strict = true;
  }
  return o;
}

function parseForbidden(md) {
  const out = [];
  let inSection = false;
  for (const line of md.split(/\r?\n/)) {
    if (/^##\s*禁用变体/.test(line.trim())) {
      inSection = true;
      continue;
    }
    if (inSection && /^##\s+/.test(line.trim())) break;
    if (!inSection || !/^\|/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map((s) => s.trim());
    const v = cells[0];
    if (!v || v === "禁用变体" || /^-+$/.test(v)) continue;
    out.push(v);
  }
  return Array.from(new Set(out));
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.bookRoot || !args.chapterFile) {
    console.error("用法: node scripts/terminology-gate.mjs --book-root <本书根> --chapter-file <章.md> [--strict]");
    process.exit(2);
  }
  const root = path.resolve(args.bookRoot);
  const ch = path.resolve(args.chapterFile);
  if (!fs.existsSync(ch)) {
    console.error(`✖ 章节不存在: ${ch}`);
    process.exit(1);
  }

  const lock = path.join(root, ".fbs", "术语锁定记录.md");
  if (!fs.existsSync(lock)) {
    console.log("terminology-gate: 无术语锁定记录，跳过");
    process.exit(0);
  }

  const forbidden = parseForbidden(fs.readFileSync(lock, "utf8"));
  if (!forbidden.length) {
    console.log("terminology-gate: 无禁用变体，跳过");
    process.exit(0);
  }

  const t = fs.readFileSync(ch, "utf8");
  const hits = forbidden.filter((x) => t.includes(x));
  if (!hits.length) {
    console.log("terminology-gate: ✅ 通过");
    process.exit(0);
  }

  console.log("terminology-gate: ⚠ 命中禁用变体");
  hits.forEach((h) => console.log(`  - ${h}`));
  process.exit(args.strict ? 1 : 0);
}

main();
