#!/usr/bin/env node
/**
 * 扫描本书根目录下章节 MD，对照 .fbs/chapter-dependencies.json 声明，生成/更新事实台账（测试报告 01 对齐）。
 *
 * 用法：
 *   node scripts/sync-book-chapter-index.mjs --book-root <本书根>
 *   node scripts/sync-book-chapter-index.mjs --book-root <本书根> --write-status   # 合并写入 .fbs/chapter-status.md 表格体
 *   node scripts/sync-book-chapter-index.mjs --book-root <本书根> --json-out .fbs/chapter-scan-result.json
 *   [--flat-only]  仅扫描本书根一层（默认递归子目录 *.md）
 *
 * 退出码：0 全部匹配；1 有声明章节未找到文件；2 参数错误
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { listDraftMd, matchContains } from "./lib/chapter-md-resolve.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const o = { bookRoot: null, writeStatus: false, jsonOut: null, flatOnly: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--book-root") o.bookRoot = argv[++i];
    else if (a === "--write-status") o.writeStatus = true;
    else if (a === "--json-out") o.jsonOut = argv[++i];
    else if (a === "--flat-only") o.flatOnly = true;
  }
  return o;
}

function loadDeps(fbs) {
  const p = path.join(fbs, "chapter-dependencies.json");
  if (!fs.existsSync(p)) return { chapters: [], path: p, missing: true };
  try {
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    return { chapters: Array.isArray(j.chapters) ? j.chapters : [], path: p, missing: false };
  } catch {
    return { chapters: [], path: p, corrupt: true };
  }
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.bookRoot) {
    console.error(
      "用法: node scripts/sync-book-chapter-index.mjs --book-root <本书根> [--write-status] [--json-out <path>] [--flat-only]"
    );
    process.exit(2);
  }
  const root = path.resolve(args.bookRoot);
  const fbs = path.join(root, ".fbs");
  const scanOpts = { recursive: !args.flatOnly };
  const files = listDraftMd(root, scanOpts);
  const deps = loadDeps(fbs);

  const result = {
    scannedAt: new Date().toISOString(),
    bookRoot: root,
    mdScanRecursive: scanOpts.recursive,
    mdFilesInRoot: files.map((p) => path.basename(p)),
    chapters: [],
    allResolved: true,
  };

  for (const ch of deps.chapters) {
    const hint = ch.fileNameContains || ch.title || ch.id || "";
    const matched = matchContains(files, hint);
    const ok = matched.length > 0;
    if (!ok) result.allResolved = false;
    result.chapters.push({
      id: ch.id || null,
      title: ch.title || null,
      fileNameContains: hint,
      matchedFiles: matched.map((p) => path.basename(p)),
      fileFound: ok,
      dependsOn: ch.dependsOn || [],
      batch: ch.batch ?? null,
    });
  }

  if (deps.missing) {
    console.log("sync-book-chapter-index: 未找到 chapter-dependencies.json，仅列出根目录 MD：");
    console.log(result.mdFilesInRoot.join("\n") || "(无)");
    process.exit(0);
  }

  console.log("sync-book-chapter-index:", root);
  for (const c of result.chapters) {
    const mark = c.fileFound ? "✅" : "❌";
    console.log(`  ${mark} ${c.id || c.title} ← 包含「${c.fileNameContains}」→`, c.matchedFiles.join(", ") || "(无)");
  }

  if (args.jsonOut) {
    const outp = path.isAbsolute(args.jsonOut) ? args.jsonOut : path.join(root, args.jsonOut);
    fs.mkdirSync(path.dirname(outp), { recursive: true });
    fs.writeFileSync(outp, JSON.stringify(result, null, 2) + "\n", "utf8");
    console.log("wrote:", outp);
  }

  if (args.writeStatus) {
    const statusPath = path.join(fbs, "chapter-status.md");

    // 读取已有台账中人工维护的"状态"列，以章节ID为键缓存
    const existingStatus = {};
    if (fs.existsSync(statusPath)) {
      const old = fs.readFileSync(statusPath, "utf8");
      for (const line of old.split(/\r?\n/)) {
        // 匹配表格行：| chId | ... | ... | ... | 状态 | ... |
        const m = /^\|\s*([^\|]+?)\s*\|(?:[^\|]*\|){3}\s*([^\|]+?)\s*\|/.exec(line);
        if (m && m[1] !== "章节ID" && m[1] !== "------") {
          existingStatus[m[1].trim()] = m[2].trim();
        }
      }
    }

    const lines = [
      "# 章节完成状态台账（由 sync-book-chapter-index 生成，可手工改状态列）",
      "",
      `最后扫描：${result.scannedAt}`,
      "",
      "| 章节ID | 匹配文件 | 磁盘存在 | 依赖 | 状态 | 质量自检(折算/10) |",
      "|--------|----------|----------|------|------|-------------------|",
    ];
    for (const c of result.chapters) {
      const fn = c.matchedFiles[0] || "—";
      const ex = c.fileFound ? "是" : "否";
      const dep = (c.dependsOn && c.dependsOn.length) ? c.dependsOn.join(",") : "—";
      // 优先保留人工维护的状态列；仅在章节不存在时才置默认值
      const key = (c.id || c.title || "").trim();
      const st = existingStatus[key] || (c.fileFound ? "待核对" : "❌ 缺稿");
      lines.push(`| ${c.id || "—"} | ${fn} | ${ex} | ${dep} | ${st} |  |`);
    }
    fs.mkdirSync(fbs, { recursive: true });
    fs.writeFileSync(statusPath, lines.join("\n") + "\n", "utf8");
    console.log("wrote:", statusPath);

    // 规范要求：同步将只读快照写出到本书根（单向：.fbs → 本书根）
    const snapshotPath = path.join(root, "chapter-status.md");
    const snapshotLines = [
      "# 章节完成状态台账（本书根快照，只读）",
      "<!-- SNAPSHOT: 本文件为只读快照，权威来源在 .fbs/chapter-status.md -->",
      "<!-- 请勿直接编辑本文件；如需更新请修改 .fbs/chapter-status.md 后执行同步脚本 -->",
      "",
      ...lines.slice(1),
    ];
    fs.writeFileSync(snapshotPath, snapshotLines.join("\n") + "\n", "utf8");
    console.log("snapshot wrote:", snapshotPath);

  process.exit(result.allResolved ? 0 : 1);
}

main();
