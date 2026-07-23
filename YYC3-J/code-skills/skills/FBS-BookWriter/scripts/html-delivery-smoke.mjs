#!/usr/bin/env node
/**
 * HTML 交付烟测（D1 基础）：
 * - 文件存在、非空
 * - 含 <!doctype html> / <html> / <body>
 * - 检测 D3 反模式（fetch('*.md')、明显占位）
 */
import fs from "fs";
import path from "path";

function parseArgs(argv) {
  const o = { html: null, strict: false, failOnWarn: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--html") o.html = argv[++i];
    else if (a === "--strict") o.strict = true;
    else if (a === "--fail-on-warn") o.failOnWarn = true;
  }
  return o;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.html) {
    console.error("用法: node scripts/html-delivery-smoke.mjs --html <文件> [--strict] [--fail-on-warn]");
    process.exit(2);
  }

  const p = path.resolve(args.html);
  if (!fs.existsSync(p)) {
    console.error(`✖ 文件不存在: ${p}`);
    process.exit(1);
  }
  const t = fs.readFileSync(p, "utf8");
  const failures = [];
  const warns = [];

  if (!t.trim()) failures.push("HTML 为空");
  if (!/<!doctype\s+html>/i.test(t)) failures.push("缺少 <!doctype html>");
  if (!/<html[\s>]/i.test(t)) failures.push("缺少 <html>");
  if (!/<body[\s>]/i.test(t)) failures.push("缺少 <body>");

  if (/fetch\s*\(\s*['"][^'"]+\.md['"]\s*\)/i.test(t)) warns.push("检测到 fetch('*.md') 反模式（疑似 D3）");
  if (/TODO|占位|待补充/i.test(t)) warns.push("检测到占位词（TODO/待补充）");

  console.log(`html-delivery-smoke: ${path.basename(p)}`);
  warns.forEach((w) => console.log(`  ⚠ ${w}`));
  if (failures.length) {
    failures.forEach((f) => console.error(`  ✖ ${f}`));
    process.exit(1);
  }
  if (warns.length && args.failOnWarn) process.exit(1);
  if (warns.length && args.strict && !args.failOnWarn) {
    console.log("  ⚠ strict 模式：存在告警（默认不阻断，配合 --fail-on-warn 阻断）");
  }
  console.log("  ✅ 通过");
  process.exit(0);
}

main();
