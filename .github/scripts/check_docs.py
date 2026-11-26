#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""YYC³ 知识库 · docs 一致性校验

在 CI 中作为 Pages 部署的前置门禁运行，覆盖：

1. 资产看板 DATA 结构自洽（分类/项目/文件/体积汇总）
2. 分类 ↔ 可视化架构页 1:1 对应，侧栏导航项数量与页脚快照一致
3. 每张分类页的首屏统计与 DATA 一致
4. docs/YYC3-Knowledge-Base/README.md 表格与 DATA 一致
5. 全局汇总映射行数、连续编号与合计行一致
6. docs/ 内相对链接不外泄（Pages 仅发布 docs/，外泄链接必然 404）
7. 所有 HTML 标签闭合、Markdown 标头标尾（front matter）齐备

用法：
    python3 .github/scripts/check_docs.py [--strict]

退出码：0 = 全部通过；1 = 存在问题
"""
from __future__ import annotations

import json
import os
import re
import sys
import unicodedata
import urllib.parse
from collections import Counter
from html.parser import HTMLParser

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
DOCS = os.path.join(ROOT, "docs")
VB = os.path.join(DOCS, "YYC3-Knowledge-Base")
DASHBOARD = os.path.join(DOCS, "YYC3-KNOWLEDGE-BASE.html")
MAPPING = os.path.join(DOCS, "YYC3-项目治理-全局汇总映射.md")
CAT_README = os.path.join(VB, "README.md")
SITE_INDEX = os.path.join(DOCS, "index.html")

FRONT_MATTER_REQUIRED = ("file", "title", "description", "author", "version", "created", "updated", "status")
FRONT_MATTER_ALLOWLIST = {"YYC3-HTML-设计指导文档.md"}
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}

errors: list[str] = []
warnings: list[str] = []
notes: list[str] = []


def fail(msg: str) -> None:
    errors.append(msg)


def warn(msg: str) -> None:
    warnings.append(msg)


def rel(path: str) -> str:
    return os.path.relpath(path, ROOT)


def read(path: str) -> str:
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def fmt(n: int) -> str:
    return f"{n:,}"


def display_width(s: str) -> int:
    return sum(2 if unicodedata.east_asian_width(ch) in ("W", "F") else 1 for ch in s)


# ─────────────────────────── 1. 资产看板 DATA ───────────────────────────
def load_data() -> dict:
    html = read(DASHBOARD)
    key = "const DATA = "
    if key not in html:
        fail("资产看板缺少 const DATA 数据块")
        return {}
    start = html.index(key) + len(key)
    try:
        data, _ = json.JSONDecoder().raw_decode(html[start:])
    except json.JSONDecodeError as exc:
        fail(f"资产看板 DATA 不是合法 JSON：{exc}")
        return {}
    return data


def check_data(data: dict) -> tuple[list[dict], list[dict]]:
    cats = data.get("categories") or []
    projects = data.get("projects") or []
    if not cats or not projects:
        fail("资产看板 DATA 缺少 categories / projects")
        return cats, projects

    per_cat = Counter(p.get("cat") for p in projects)
    if data.get("total") != len(projects):
        fail(f"DATA.total={data.get('total')} 与项目数组长度 {len(projects)} 不一致")
    if data.get("totalFiles") != sum(c.get("files", 0) for c in cats):
        fail(f"DATA.totalFiles={data.get('totalFiles')} 与分类文件数之和 {sum(c.get('files', 0) for c in cats)} 不一致")
    total_mb = round(sum(c.get("mb", 0) for c in cats), 1)
    if abs(data.get("totalMB", 0) - total_mb) > 0.5:
        fail(f"DATA.totalMB={data.get('totalMB')} 与分类体积之和 {total_mb} 不一致")

    names = [c["name"] for c in cats]
    dup = [n for n, k in Counter(names).items() if k > 1]
    if dup:
        fail(f"分类名重复：{dup}")

    for c in cats:
        if c.get("count") != per_cat.get(c["name"], 0):
            fail(f"分类 {c['name']}：count={c.get('count')} 与项目数 {per_cat.get(c['name'], 0)} 不一致")
        if not c.get("dir"):
            fail(f"分类 {c['name']} 缺少 dir 字段")
        local = os.path.join(ROOT, c.get("dir", ""))
        if os.path.isdir(ROOT) and not os.path.isdir(local) and not ONLY_DOCS:
            warn(f"分类 {c['name']} 的目录在本地不存在：{c.get('dir')}（本地留档分类，CI 中可忽略）")

    seen_paths = Counter(p.get("path") for p in projects)
    dup_paths = [p for p, k in seen_paths.items() if k > 1]
    if dup_paths:
        fail(f"项目 path 重复 {len(dup_paths)} 处，例如：{dup_paths[:3]}")

    notes.append(f"DATA 自洽：{len(cats)} 类 / {len(projects)} 项目 / {fmt(data['totalFiles'])} 文件 / {data['totalMB']} MB")
    return cats, projects


# ─────────────────── 2/3. 分类页 ↔ DATA ───────────────────
def check_category_pages(cats: list[dict]) -> None:
    if not os.path.isdir(VB):
        fail("缺少 docs/YYC3-Knowledge-Base 目录")
        return
    pages = sorted(f for f in os.listdir(VB) if f.endswith("VISUAL-ARCHITECTURE.html"))
    by_cat = {c["name"]: c for c in cats}

    page_cats = {}
    for f in pages:
        page_cats[f[len("YYC3-"):-len("-VISUAL-ARCHITECTURE.html")]] = f
    for name in by_cat:
        if name not in page_cats:
            fail(f"分类 {name} 缺少可视化架构页")
    for name in page_cats:
        if name not in by_cat:
            fail(f"可视化架构页 {page_cats[name]} 对应的分类不在 DATA 中")

    expected_nav = len(cats) + 2  # 总览 2 项 + 分类 N 项
    foot = f"{len(cats)} 类 · {fmt(sum(c['count'] for c in cats))} 个项目"
    for f in pages + ["index.html"]:
        path = os.path.join(VB, f)
        if not os.path.exists(path):
            fail(f"缺少 {rel(path)}")
            continue
        html = read(path)
        nav = len(re.findall(r'class="nav-item', html))
        if nav != expected_nav:
            fail(f"{f}：侧栏导航 {nav} 项，应为 {expected_nav} 项（2 总览 + {len(cats)} 分类）")
        if foot not in html:
            fail(f"{f}：页脚快照未包含「{foot}」")
        active = len(re.findall(r'nav-item active', html))
        if f != "index.html" and active != 1:
            fail(f"{f}：高亮导航项 {active} 个，应为 1 个")

    # 每张分类页首屏统计与 DATA 一致
    for name, f in page_cats.items():
        html = read(os.path.join(VB, f))
        m = re.search(r'<div class="k">项目数</div><div class="v">([\d,]+)<span', html)
        if not m:
            fail(f"{f}：找不到首屏「项目数」统计")
            continue
        got = int(m.group(1).replace(",", ""))
        if got != by_cat[name]["count"]:
            fail(f"{f}：首屏项目数 {got} 与 DATA {by_cat[name]['count']} 不一致")
        cards = len(re.findall(r'<article class="card"', html))
        if cards != by_cat[name]["count"]:
            fail(f"{f}：项目卡片 {cards} 张，应为 {by_cat[name]['count']} 张")

    # 索引页卡片数量
    idx = read(os.path.join(VB, "index.html"))
    cards = len(re.findall(r'<a class="card"', idx))
    if cards != len(cats):
        fail(f"分类索引页卡片 {cards} 张，应为 {len(cats)} 张")
    notes.append(f"分类页：{len(pages)} 张，索引卡片 {cards} 张，侧栏导航 {expected_nav} 项")


# ─────────────────── 4. 分类索引 README ───────────────────
def check_category_readme(cats: list[dict]) -> None:
    if not os.path.exists(CAT_README):
        fail("缺少 docs/YYC3-Knowledge-Base/README.md")
        return
    md = read(CAT_README)
    rows = re.findall(r"^\| ([^|]+?) \| ([\d,]+) \| ([\d,]+) \| ([^|]+?) \| \[", md, re.M)
    by_cat = {c["name"]: c for c in cats}
    if len(rows) != len(cats):
        fail(f"分类索引 README 表格 {len(rows)} 行，应为 {len(cats)} 行")
    for name, count, files, _size in rows:
        name = name.strip()
        c = by_cat.get(name)
        if not c:
            fail(f"分类索引 README 出现未知分类：{name}")
            continue
        if int(count.replace(",", "")) != c["count"]:
            fail(f"分类索引 README {name} 项目数 {count} 与 DATA {c['count']} 不一致")
        if int(files.replace(",", "")) != c["files"]:
            fail(f"分类索引 README {name} 文件数 {files} 与 DATA {c['files']} 不一致")
    notes.append(f"分类索引 README：{len(rows)} 行表格与 DATA 对齐")


# ─────────────────── 5. 全局汇总映射 ───────────────────
def check_mapping(data: dict) -> None:
    if not os.path.exists(MAPPING):
        fail("缺少 docs/YYC3-项目治理-全局汇总映射.md")
        return
    md = read(MAPPING)
    nums = [int(x) for x in re.findall(r"^\| (\d+) \| ", md, re.M)]
    if not nums:
        fail("全局汇总映射表为空")
        return
    if len(nums) != data.get("total"):
        fail(f"全局汇总映射 {len(nums)} 行，应为 DATA.total={data.get('total')} 行")
    if nums != list(range(1, len(nums) + 1)):
        bad = [(i + 1, n) for i, n in enumerate(nums) if n != i + 1][:3]
        fail(f"全局汇总映射编号不连续，例如（期望, 实际）：{bad}")
    expect_total = f"| **合计** | **{fmt(data['total'])}** | **{fmt(data['totalFiles'])}** | "
    if expect_total not in md:
        fail("全局汇总映射的「合计」行与 DATA 汇总不一致")
    notes.append(f"全局汇总映射：{len(nums)} 行连续编号，合计行一致")


# ─────────────────── 6. 链接与 HTML ───────────────────
class Balance(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[str] = []
        self.problems: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag not in VOID_TAGS:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in VOID_TAGS:
            return
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
        elif tag in self.stack:
            while self.stack and self.stack[-1] != tag:
                self.problems.append(f"未闭合 <{self.stack.pop()}>")
            if self.stack:
                self.stack.pop()
        else:
            self.problems.append(f"多余的 </{tag}>")


SCRIPT_STYLE_RE = re.compile(r"<(script|style)\b[^>]*>.*?</\1>", re.S | re.I)
FENCE_RE = re.compile(r"(```.*?```|~~~.*?~~~)", re.S)
INLINE_CODE_RE = re.compile(r"`[^`\n]*`")


def strip_noise(text: str, kind: str) -> str:
    """移除脚本/样式块与代码块中的示例链接，避免把代码示例误判为失效链接。"""
    if kind == "html":
        text = SCRIPT_STYLE_RE.sub("", text)
    else:
        text = FENCE_RE.sub("", text)
        text = INLINE_CODE_RE.sub("", text)
    return text


def check_links_and_html() -> None:
    escaping = Counter()
    broken = []
    html_files = 0
    for dirpath, dirnames, filenames in os.walk(DOCS):
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]
        for f in filenames:
            path = os.path.join(dirpath, f)
            kind = "html" if f.endswith(".html") else ("md" if f.endswith(".md") else "")
            if not kind:
                continue
            raw = read(path)
            if kind == "html":
                html_files += 1
                parser = Balance()
                parser.feed(raw)
                parser.close()
                if parser.stack or parser.problems:
                    fail(f"{rel(path)}：HTML 结构异常 {parser.stack + parser.problems[:3]}")
            text = strip_noise(raw, kind)
            for m in re.finditer(r'(?:href|src)="([^"]+)"', text):
                url = m.group(1)
                if url.startswith(("http://", "https://", "#", "mailto:", "data:", "javascript:")):
                    continue
                target = urllib.parse.unquote(url.split("#")[0].split("?")[0])
                if not target:
                    continue
                resolved = os.path.normpath(os.path.join(dirpath, target))
                if not resolved.startswith(DOCS + os.sep):
                    escaping[rel(os.path.join(dirpath, f))] += 1
                    continue
                if not os.path.exists(resolved):
                    broken.append(f"{rel(path)} -> {url}")
    for page, cnt in escaping.items():
        fail(f"{page}：{cnt} 个链接指向 docs/ 之外（Pages 只发布 docs/，线上必然 404）")
    for item in broken[:10]:
        fail(f"失效链接：{item}")
    if len(broken) > 10:
        fail(f"…另有 {len(broken) - 10} 处失效链接")
    notes.append(f"链接与 HTML：扫描 {html_files} 个 HTML，docs 外泄链接 {sum(escaping.values())} 处，失效链接 {len(broken)} 处")


# ─────────────────── 7. Markdown 标头标尾 ───────────────────
def check_front_matter(strict: bool) -> None:
    missing = []
    partial = []
    for dirpath, dirnames, filenames in os.walk(DOCS):
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]
        for f in filenames:
            if not f.endswith(".md") or f in FRONT_MATTER_ALLOWLIST:
                continue
            path = os.path.join(dirpath, f)
            text = read(path)
            m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
            if not m:
                missing.append(rel(path))
                continue
            keys = {line.split(":")[0].strip() for line in m.group(1).split("\n") if ":" in line}
            gaps = [k for k in FRONT_MATTER_REQUIRED if k not in keys]
            if gaps:
                partial.append(f"{rel(path)} 缺少 {','.join(gaps)}")
    for item in partial:
        fail(f"front matter 不完整：{item}")
    for item in missing:
        (fail if strict else warn)(f"缺少 front matter：{item}")
    notes.append(f"front matter：不完整 {len(partial)} 个，缺失 {len(missing)} 个（allowlist {len(FRONT_MATTER_ALLOWLIST)}）")


# ─────────────────── 8. 站点导航页 ───────────────────
def check_site_index(data: dict) -> None:
    if not os.path.exists(SITE_INDEX):
        fail("缺少 docs/index.html")
        return
    html = read(SITE_INDEX)
    cats = len(data["categories"])
    expect = f"{cats} 类 · {fmt(data['total'])} 个项目"
    if expect not in html:
        fail(f"docs/index.html 未包含「{expect}」")
    if fmt(data["totalFiles"]) not in html:
        fail("docs/index.html 未包含最新文件总量")
    notes.append("站点导航页与 DATA 一致")


def main() -> int:
    global ONLY_DOCS
    strict = "--strict" in sys.argv
    ONLY_DOCS = not os.path.isdir(os.path.join(ROOT, "YYC3-AI-应用工具"))

    if not os.path.isdir(DOCS):
        print("✗ 未找到 docs 目录", file=sys.stderr)
        return 1

    data = load_data()
    if data:
        cats, _projects = check_data(data)
        check_category_pages(cats)
        check_category_readme(cats)
        check_mapping(data)
        check_site_index(data)
    check_links_and_html()
    check_front_matter(strict)

    print("═" * 66)
    print("YYC³ 知识库 · docs 一致性校验")
    print("═" * 66)
    for n in notes:
        print(f"  ✓ {n}")
    if warnings:
        print("\n警告：")
        for w in warnings:
            print(f"  ! {w}")
    if errors:
        print(f"\n失败 {len(errors)} 项：")
        for e in errors:
            print(f"  ✗ {e}")
        print("═" * 66)
        return 1
    print("\n全部检查通过 ✅")
    print("═" * 66)
    return 0


ONLY_DOCS = False

if __name__ == "__main__":
    sys.exit(main())
