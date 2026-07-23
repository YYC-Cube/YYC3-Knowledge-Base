#!/usr/bin/env node
/**
 * ESM 状态切换落盘：响应 v1.8.0 综合审计 P0-5「ESM 状态文件化」与 P0-2 运行时追踪。
 *
 * 用法（技能包根或任意 cwd）：
 *   node scripts/fbs-record-esm-transition.mjs --book-root <本书根> \
 *     --from IDLE --to INTAKE --reason "用户触发写书" [--genre A]
 *
 * 行为：
 *   1) 重写/创建 `.fbs/esm-state.md`（机器可读当前状态，供跨会话 Read）
 *   2) 在 `.fbs/规范执行状态.md` 的「## 切换日志」下 prepend 一条记录（若文件不存在则创建最小骨架）
 *
 * 状态名须与 section-3-workflow.md ESM 一致：IDLE INTAKE RESEARCH PLAN WRITE REVIEW WRITE_MORE DELIVER
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VALID = new Set([
  "IDLE",
  "INTAKE",
  "RESEARCH",
  "PLAN",
  "WRITE",
  "REVIEW",
  "WRITE_MORE",
  "DELIVER",
]);

function parseArgs(argv) {
  const o = {
    bookRoot: null,
    from: null,
    to: null,
    reason: "",
    genre: "",
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--book-root") o.bookRoot = argv[++i];
    else if (a === "--from") o.from = argv[++i];
    else if (a === "--to") o.to = argv[++i];
    else if (a === "--reason") o.reason = argv[++i] || "";
    else if (a === "--genre") o.genre = argv[++i] || "";
  }
  return o;
}

const MIN_NORM_SKELETON = `# 规范执行状态（.fbs/规范执行状态.md）

> 由 \`init-fbs-multiagent-artifacts.mjs\` 生成完整模板；本骨架仅供 CLI 首次写入前兜底。

## ESM 状态追踪

| 时间 | 旧状态 | 新状态 | 触发原因 | 出口条件 |
|------|--------|--------|---------|---------|
| （待补） | — | — | — | — |

## 切换日志

`;

function ensureNormExecState(fbsDir) {
  const p = path.join(fbsDir, "规范执行状态.md");
  if (!fs.existsSync(p)) {
    fs.mkdirSync(fbsDir, { recursive: true });
    fs.writeFileSync(p, MIN_NORM_SKELETON, "utf8");
    console.log("create skeleton:", p);
  }
  return p;
}

function prependTransitionLog(normPath, line) {
  let txt = fs.readFileSync(normPath, "utf8");
  const marker = "## 切换日志";
  const idx = txt.indexOf(marker);
  if (idx === -1) {
    txt += `\n\n${marker}\n\n${line}\n`;
    fs.writeFileSync(normPath, txt, "utf8");
    return;
  }
  const afterHeader = txt.indexOf("\n", idx);
  const insertAt = afterHeader === -1 ? idx + marker.length : afterHeader + 1;
  txt = txt.slice(0, insertAt) + line + "\n" + txt.slice(insertAt);
  fs.writeFileSync(normPath, txt, "utf8");
}

function writeEsmState(fbsDir, { from, to, reason, genre }) {
  const iso = new Date().toISOString();
  const body = `---
currentState: "${to}"
previousState: "${from}"
lastTransitionAt: "${iso}"
transitionReason: ${JSON.stringify(reason || "")}
genre: ${JSON.stringify(genre || "")}
maintainedBy: "scripts/fbs-record-esm-transition.mjs"
---

# ESM 当前状态（.fbs/esm-state.md）

> **权威流程**：见 \`references/01-core/section-3-workflow.md\`「执行状态机」。  
> **更新**：每次对话内输出状态切换宣告后，**应**运行本脚本或等价更新本文件，使磁盘与对话一致（v1.8.0 审计：外部可验证）。

| 字段 | 值 |
|------|-----|
| 当前状态 | **${to}** |
| 上一状态 | ${from} |
| 切换时间 | ${iso} |
| 原因 | ${reason || "—"} |
| 体裁等级 | ${genre || "—"} |
`;
  const p = path.join(fbsDir, "esm-state.md");
  fs.writeFileSync(p, body, "utf8");
  console.log("write:", p);
}

function main() {
  const { bookRoot, from, to, reason, genre } = parseArgs(process.argv);
  if (!bookRoot || !from || !to) {
    console.error(
      "用法: node scripts/fbs-record-esm-transition.mjs --book-root <本书根> --from <旧状态> --to <新状态> [--reason \"...\"] [--genre A|B|C]"
    );
    process.exit(2);
  }
  const fu = from.toUpperCase();
  const tu = to.toUpperCase();
  if (!VALID.has(fu) || !VALID.has(tu)) {
    console.error("状态名须为:", [...VALID].join(", "));
    process.exit(2);
  }
  const root = path.resolve(bookRoot);
  const fbs = path.join(root, ".fbs");
  fs.mkdirSync(fbs, { recursive: true });

  writeEsmState(fbs, { from: fu, to: tu, reason, genre });

  const normPath = ensureNormExecState(fbs);
  const iso = new Date().toISOString();
  const logLine = `- **${iso}** · \`${fu}\` → \`${tu}\` · ${reason || "—"}${genre ? ` · 体裁 ${genre}` : ""}`;
  prependTransitionLog(normPath, logLine);
  console.log("append log:", normPath);
  console.log("done.");
}

main();
