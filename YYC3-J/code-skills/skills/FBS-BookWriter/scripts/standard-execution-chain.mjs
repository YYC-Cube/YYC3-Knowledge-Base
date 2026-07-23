#!/usr/bin/env node
/**
 * 标准执行命令链（初始化 → S3 门禁 → 章节门禁）
 *
 * 用法：
 *   node scripts/standard-execution-chain.mjs \
 *     --skill-root <技能根> \
 *     --book-root <本书根> \
 *     --chapter-id <章节ID> \
 *     [--mode parallel_writing|single_writer] \
 *     [--no-verify-stages] \
 *     [--no-verify-s0-timestamp]
 *
 * 说明：第 2 步 s3-start-gate 在已有 [S3]*.md 时会自动子调用
 * audit-temporal-accuracy / audit-term-consistency 的 --scan-book-s3（默认警告；
 * 有成稿且 ledger 存在时还会跑 audit-query-optimization（默认警告）。
 * 若需阻断请在直接调用 s3-start-gate 时使用 --audit-temporal-enforce / --audit-term-enforce /
 * --audit-query-opt-enforce）。
 */
import path from "path";
import { spawnSync } from "child_process";

function parseArgs(argv) {
  const o = {
    skillRoot: process.cwd(),
    bookRoot: null,
    chapterId: null,
    mode: "parallel_writing",
    verifyStages: true,
    verifyS0Timestamp: true,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--skill-root") o.skillRoot = argv[++i];
    else if (a === "--book-root") o.bookRoot = argv[++i];
    else if (a === "--chapter-id") o.chapterId = argv[++i];
    else if (a === "--mode") o.mode = argv[++i] || o.mode;
    else if (a === "--no-verify-stages") o.verifyStages = false;
    else if (a === "--no-verify-s0-timestamp") o.verifyS0Timestamp = false;
  }
  return o;
}

function runNode(scriptPath, args) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.bookRoot || !args.chapterId) {
    console.error(
      "用法: node scripts/standard-execution-chain.mjs --skill-root <技能根> --book-root <本书根> --chapter-id <章节ID> " +
        "[--mode parallel_writing|single_writer] [--no-verify-stages] [--no-verify-s0-timestamp]"
    );
    process.exit(2);
  }

  const skillRoot = path.resolve(args.skillRoot || process.cwd());
  const bookRoot = path.resolve(args.bookRoot);

  console.log("[1/3] 初始化 .fbs 工件...");
  runNode(path.join(skillRoot, "scripts", "init-fbs-multiagent-artifacts.mjs"), ["--book-root", bookRoot]);

  console.log("[2/3] 执行 S3 启动门禁...");
  const s3Args = ["--skill-root", skillRoot, "--book-root", bookRoot, "--mode", args.mode];
  if (args.verifyStages) s3Args.push("--verify-stages");
  runNode(path.join(skillRoot, "scripts", "s3-start-gate.mjs"), s3Args);

  console.log("[3/3] 执行章节检索门禁（含原子性）...");
  const chapterArgs = [
    "--skill-root",
    skillRoot,
    "--book-root",
    bookRoot,
    "--chapter-id",
    args.chapterId,
    "--verify-atomicity",
  ];
  if (args.verifyStages) {
    chapterArgs.push("--verify-stages", "--stage-scope", "pre-s3");
  }
  if (!args.verifyS0Timestamp) {
    chapterArgs.push("--no-verify-s0-timestamp");
  }
  runNode(path.join(skillRoot, "scripts", "enforce-search-policy.mjs"), chapterArgs);

  console.log("✅ standard-execution-chain: 全部通过");
}

main();
