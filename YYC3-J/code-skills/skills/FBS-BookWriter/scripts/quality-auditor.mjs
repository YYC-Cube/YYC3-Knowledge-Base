#!/usr/bin/env node
/**
 * 轻量质量审计器（与 section-4-commands.md / promise-code-user-alignment.md 对齐）
 *
 * 已实现检查项：
 *   --dash-density         破折号密度（每千字；>3 警告，>1 warn）
 *   --check-section-ids    ###/## 数字编号重复检测
 *   --int-percent-density  整数百分比密度（每千字出现次数）
 *   --enforce              启用阻断模式（S/P/C/B 基础规则 + S6 仅阻断 >qualityGate.block + S5 B类=0 + 编号重复）
 *   --enforce-strict       enforce + S6 警告带一并阻断
 *   --fail-on-s6-warn      S6 警告带单独阻断
 *   --fail-on-s5-buzz      S5 AI味词汇检测（"深入探讨"等）单独阻断
 *   --fail-on-long-sentence-warn  长句比例（>8%）单独阻断
 *   --fail-on-absolute-claims    绝对化陈述检测（"全球最大""唯一""第一"等）
 *   --vcr-heuristic-warn   VCR 启发式警告（P2，见 vcr-heuristic-brief.md）
 *
 * 注意：S/P/C/B 完整评分（语义层）依赖人工或更重型 NLP，本脚本仅覆盖可机读的规则项。
 */
import fs from "fs";
import path from "path";
import { globSync } from "glob";

// S5 AI味词汇：从 s5-buzzword-lexicon.json 加载（官方词表），并补充通用 AI 套话
function loadBuzzWords(skillRoot) {
  const lexiconPath = path.join(skillRoot, "references", "02-quality", "s5-buzzword-lexicon.json");
  const official = [];
  try {
    const j = JSON.parse(fs.readFileSync(lexiconPath, "utf8"));
    if (Array.isArray(j.terms)) official.push(...j.terms);
  } catch (_) { /* 词库不可读时降级使用内置列表 */ }
  const builtin = [
    "深入探讨", "深入分析", "深度剖析", "全面解析", "系统梳理",
    "综合考量", "多维度", "不言而喻", "毋庸置疑", "值得注意的是",
    "不得不提", "尤为重要", "至关重要", "举足轻重", "首当其冲",
  ];
  return Array.from(new Set([...official, ...builtin]));
}

// BUZZ_WORDS 延迟初始化（首次使用时通过 skillRoot 加载）
let _buzzWords = null;
function getBuzzWords(skillRoot) {
  if (!_buzzWords) _buzzWords = loadBuzzWords(skillRoot || process.cwd());
  return _buzzWords;
}

// 绝对化陈述触发词
const ABSOLUTE_PATTERNS = [
  /全球最[大小强弱]/,
  /行业第一/,
  /唯一[一支持提供]/,
  /完全无法/,
  /绝对[不无]/,
  /100%(?:保证|确保|正确)/,
];

// VCR 启发式（P2）：来源缺失的数字引用
const VCR_NUMBER_RE = /[\d,.]+\s*(?:%|万|亿|千万)/g;
const VCR_SOURCE_RE = /〔来源[：:]/;

function parseArgs(argv) {
  const o = {
    skillRoot: process.cwd(),
    inputs: [],
    glob: null,
    dashDensity: false,
    checkSectionIds: false,
    intPercentDensity: false,
    enforce: false,
    enforceStrict: false,
    failOnS6Warn: false,
    failOnS5Buzz: false,
    failOnLongSentenceWarn: false,
    failOnAbsoluteClaims: false,
    vcrHeuristicWarn: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--skill-root") o.skillRoot = argv[++i];
    else if (a === "--inputs") o.inputs.push(argv[++i]);
    else if (a === "--input") o.inputs.push(argv[++i]);
    else if (a === "--glob") o.glob = argv[++i];
    else if (a === "--dash-density") o.dashDensity = true;
    else if (a === "--check-section-ids") o.checkSectionIds = true;
    else if (a === "--int-percent-density") o.intPercentDensity = true;
    else if (a === "--enforce") o.enforce = true;
    else if (a === "--enforce-strict") { o.enforce = true; o.enforceStrict = true; }
    else if (a === "--fail-on-s6-warn") o.failOnS6Warn = true;
    else if (a === "--fail-on-s5-buzz") o.failOnS5Buzz = true;
    else if (a === "--fail-on-long-sentence-warn") o.failOnLongSentenceWarn = true;
    else if (a === "--fail-on-absolute-claims") o.failOnAbsoluteClaims = true;
    else if (a === "--vcr-heuristic-warn") o.vcrHeuristicWarn = true;
  }
  return o;
}

function collectFiles(args) {
  const files = new Set();
  args.inputs.forEach((p) => files.add(path.resolve(p)));
  if (args.glob) globSync(args.glob, { cwd: args.skillRoot, absolute: true }).forEach((f) => files.add(f));
  return [...files].filter((f) => fs.existsSync(f));
}

function textLen(t) {
  return Math.max(1, String(t || "").replace(/\s+/g, "").length);
}

function dashPerThousand(t) {
  const chars = textLen(t);
  const cnt = (t.match(/——/g) || []).length;
  return (cnt * 1000) / chars;
}

function intPercentPerThousand(t) {
  const chars = textLen(t);
  const cnt = (t.match(/\d+%/g) || []).length;
  return (cnt * 1000) / chars;
}

function findDupSectionIds(t) {
  const ids = [];
  for (const line of t.split(/\r?\n/)) {
    const m = line.match(/^#{2,3}\s+((\d+\.\d+(?:\.\d+)?))/);
    if (m) ids.push(m[1]);
  }
  const seen = new Set();
  const dup = new Set();
  ids.forEach((x) => (seen.has(x) ? dup.add(x) : seen.add(x)));
  return [...dup];
}

function findBuzzWords(t, skillRoot) {
  return getBuzzWords(skillRoot).filter((w) => t.includes(w));
}

function findAbsoluteClaims(t) {
  return ABSOLUTE_PATTERNS.filter((re) => re.test(t)).map((re) => re.toString());
}

function longSentenceRatio(t) {
  const sentences = t
    .split(/[。！？\n]/)
    .map((s) => s.replace(/\s+/g, "").length)
    .filter((n) => n > 0);
  if (!sentences.length) return 0;
  const long = sentences.filter((n) => n > 40).length;  // 文档规定 >40 字为长句
  return long / sentences.length;
}

function vcrHeuristicCheck(t) {
  // 检测含数字/比例但本行缺来源标注的情况（启发式，误报率较高）
  const lines = t.split(/\r?\n/);
  const issues = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (VCR_NUMBER_RE.test(line) && !VCR_SOURCE_RE.test(line)) {
      // 重置 lastIndex
      VCR_NUMBER_RE.lastIndex = 0;
      issues.push(`第${i + 1}行：含数字/比例但无来源标注`);
    }
    VCR_NUMBER_RE.lastIndex = 0;
  }
  return issues.slice(0, 5); // 最多报5条避免刷屏
}

function main() {
  const args = parseArgs(process.argv);
  const files = collectFiles(args);

  if (!files.length) {
    console.error("quality-auditor: 未找到输入文件（用 --inputs 或 --glob）");
    process.exit(2);
  }

  const issues = [];   // 阻断级
  const warnings = []; // 警告级

  for (const f of files) {
    const t = fs.readFileSync(f, "utf8");
    const name = path.basename(f);

    // ── 破折号密度 ──
    const rho = dashPerThousand(t);
    if (args.dashDensity || (!args.checkSectionIds && !args.intPercentDensity)) {
      console.log(`${name}: 破折号/千字=${rho.toFixed(2)}`);
    }
    if (rho > 3) {
      (args.enforce || args.enforceStrict ? issues : warnings).push(
        `[破折号] ${name}: ${rho.toFixed(2)}/千字 > 3（阻断阈值）`
      );
    } else if (rho > 1) {
      warnings.push(`[破折号] ${name}: ${rho.toFixed(2)}/千字 > 1（警告）`);
    }

    // ── 编号重复 ──
    if (args.checkSectionIds || args.enforce || args.enforceStrict) {
      const dup = findDupSectionIds(t);
      if (dup.length) {
        (args.enforce || args.enforceStrict ? issues : warnings).push(
          `[编号重复] ${name}: ${dup.join(", ")}`
        );
      }
    }

    // ── 整数百分比密度 ──
    if (args.intPercentDensity) {
      const pct = intPercentPerThousand(t);
      console.log(`${name}: 整数%/千字=${pct.toFixed(2)}`);
      if (pct > 10) warnings.push(`[百分比密度] ${name}: ${pct.toFixed(2)}/千字 偏高`);
    }

    // ── S5 AI味词汇 ──
    if (args.failOnS5Buzz || args.enforce || args.enforceStrict) {
      const buzz = findBuzzWords(t, args.skillRoot);
      if (buzz.length) {
        const list = buzz.slice(0, 5).join("、");
        (args.failOnS5Buzz || args.enforceStrict ? issues : warnings).push(
          `[AI味词汇] ${name}: 发现${buzz.length}处（${list}${buzz.length > 5 ? "…" : ""}）`
        );
      }
    }

    // ── 长句比例 ──
    if (args.failOnLongSentenceWarn || args.enforce || args.enforceStrict) {
      const ratio = longSentenceRatio(t);
      if (ratio > 0.08) {
        (args.failOnLongSentenceWarn || args.enforceStrict ? issues : warnings).push(
          `[长句] ${name}: 长句比例${(ratio * 100).toFixed(1)}% > 8%`
        );
      }
    }

    // ── 绝对化陈述 ──
    if (args.failOnAbsoluteClaims || args.enforce || args.enforceStrict) {
      const abs = findAbsoluteClaims(t);
      if (abs.length) {
        (args.failOnAbsoluteClaims || args.enforceStrict ? issues : warnings).push(
          `[绝对化陈述] ${name}: 命中${abs.length}条规则`
        );
      }
    }

    // ── S6/fail-on-s6-warn ──
    // S6 产出物关键字检测（轻量：缺少完结声明视为警告）
    if (args.failOnS6Warn || args.enforce || args.enforceStrict) {
      const isS6File = /^\[S6\]/i.test(name);
      if (isS6File && !t.includes("完结") && !t.includes("交付完成")) {
        (args.failOnS6Warn || args.enforceStrict ? issues : warnings).push(
          `[S6] ${name}: 未发现完结/交付完成声明`
        );
      }
    }

    // ── VCR 启发式（P2）──
    if (args.vcrHeuristicWarn) {
      const vcrIssues = vcrHeuristicCheck(t);
      vcrIssues.forEach((issue) => warnings.push(`[VCR-P2] ${name}: ${issue}`));
    }
  }

  // ── 输出 ──
  if (warnings.length) {
    console.log("\nquality-auditor: ⚠ 警告");
    warnings.forEach((w) => console.log(`  ⚠ ${w}`));
  }

  if (!issues.length && !warnings.length) {
    console.log("quality-auditor: ✅ 通过");
    process.exit(0);
  }

  if (issues.length) {
    console.log("\nquality-auditor: ❌ 发现阻断问题");
    issues.forEach((i) => console.log(`  ✗ ${i}`));
    process.exit(1);
  }

  process.exit(0);
}

main();
