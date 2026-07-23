#!/usr/bin/env python3
"""
代码上下文提取器：为 agent 提供精简的代码上下文，避免全文件读取导致上下文膨胀。

子命令：
  method   提取单个方法/行号附近的代码上下文
  batch    从 findings JSON 中批量提取所有 finding 的代码上下文
  summary  仅输出文件的方法签名列表（用于大文件的快速概览）

设计原则：
  - 单次磁盘 IO 替代多次 Read 工具调用
  - 输出 JSON 格式可控，只包含 agent 需要的最小上下文
  - agent 通过 Bash 调用脚本，结果写入文件，按需 Read 汇总文件的特定字段
"""
import argparse
import json
import re
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# 日志工具
# ---------------------------------------------------------------------------

class Colors:
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'


def log_info(msg):
    print(f"{Colors.CYAN}[extract] {msg}{Colors.ENDC}", file=sys.stderr)


def log_ok(msg):
    print(f"{Colors.GREEN}[extract] {msg}{Colors.ENDC}", file=sys.stderr)


def log_warn(msg):
    print(f"{Colors.WARNING}[extract] [WARN] {msg}{Colors.ENDC}", file=sys.stderr)


def log_error(msg):
    print(f"{Colors.FAIL}[extract] ✗ {msg}{Colors.ENDC}", file=sys.stderr)


def stdout_json(data):
    print(json.dumps(data, ensure_ascii=False))


# ---------------------------------------------------------------------------
# 通用工具
# ---------------------------------------------------------------------------

def load_json_file(path):
    """安全加载 JSON 文件"""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return None
    except json.JSONDecodeError as e:
        log_warn(f"JSON 解析失败: {path} ({e})")
        return None


def write_json_file(path, data):
    """写入 JSON 文件"""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def read_file_lines(file_path):
    """读取文件所有行，返回行列表"""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.readlines()
    except Exception:
        return []


def extract_lines(lines, center_line, radius=30):
    """提取以 center_line 为中心、±radius 行的代码片段"""
    if not lines:
        return [], 0, 0
    start = max(0, center_line - 1 - radius)
    end = min(len(lines), center_line - 1 + radius + 1)
    snippet = [l.rstrip('\n\r') for l in lines[start:end]]
    return snippet, start + 1, end


# ---------------------------------------------------------------------------
# method 子命令：提取单个方法/行号附近的上下文
# ---------------------------------------------------------------------------

def extract_method_context(file_path, line_number, radius=30):
    """提取指定行号附近的代码上下文"""
    lines = read_file_lines(file_path)
    if not lines:
        return {
            "file": str(file_path),
            "totalLines": 0,
            "error": "文件不存在或无法读取",
        }

    snippet, start_line, end_line = extract_lines(lines, line_number, radius)

    return {
        "file": str(file_path),
        "totalLines": len(lines),
        "requestedLine": line_number,
        "startLine": start_line,
        "endLine": end_line,
        "linesExtracted": len(snippet),
        "code": snippet,
    }


# ---------------------------------------------------------------------------
# batch 子命令：从 findings JSON 批量提取代码上下文
# ---------------------------------------------------------------------------

def extract_batch_context(findings_path, output_path, radius=30):
    """从 findings JSON 中批量提取所有 finding 的代码上下文"""
    data = load_json_file(findings_path)
    if data is None:
        log_error(f"无法读取 findings 文件: {findings_path}")
        stdout_json({"status": "error", "message": f"cannot read {findings_path}"})
        sys.exit(1)

    findings = data.get('findings', [])
    if not findings:
        log_warn("findings 列表为空")
        stdout_json({"status": "ok", "totalFindings": 0, "extracted": 0})
        return

    log_info(f"从 {findings_path} 加载 {len(findings)} 个 findings")

    # 按文件分组，避免重复读取同一文件
    file_groups = {}
    for f in findings:
        fp = f.get('file') or f.get('FilePath') or f.get('filePath') or ''
        if fp:
            file_groups.setdefault(fp, []).append(f)

    log_info(f"涉及 {len(file_groups)} 个不同文件")

    # 缓存已读取的文件内容
    file_cache = {}
    contexts = []
    extracted = 0
    errors = 0

    for fp, file_findings in file_groups.items():
        # 读取文件（每个文件只读一次）
        if fp not in file_cache:
            lines = read_file_lines(fp)
            file_cache[fp] = lines

        lines = file_cache[fp]

        for finding in file_findings:
            finding_id = finding.get('findingId', f"unknown-{extracted}")
            line_num = int(finding.get('line') or finding.get('LineNumber') or finding.get('lineNumber') or 0)
            risk_type = finding.get('riskType') or finding.get('RiskType') or ''

            if not lines:
                contexts.append({
                    "findingId": finding_id,
                    "file": fp,
                    "error": "文件不存在或无法读取",
                })
                errors += 1
                continue

            snippet, start_line, end_line = extract_lines(lines, line_num, radius)

            contexts.append({
                "findingId": finding_id,
                "file": fp,
                "totalLines": len(lines),
                "requestedLine": line_num,
                "riskType": risk_type,
                "startLine": start_line,
                "endLine": end_line,
                "linesExtracted": len(snippet),
                "code": snippet,
            })
            extracted += 1

    # 写入输出文件
    output_data = {
        "sourceFile": str(findings_path),
        "totalFindings": len(findings),
        "totalFiles": len(file_groups),
        "extracted": extracted,
        "errors": errors,
        "radius": radius,
        "contexts": contexts,
    }

    out_path = Path(output_path)
    write_json_file(out_path, output_data)
    log_ok(f"已提取 {extracted} 个上下文 → {out_path}")

    stdout_json({
        "status": "ok",
        "totalFindings": len(findings),
        "totalFiles": len(file_groups),
        "extracted": extracted,
        "errors": errors,
        "outputFile": str(out_path),
    })


# ---------------------------------------------------------------------------
# summary 子命令：输出文件方法签名列表
# ---------------------------------------------------------------------------

# 常见语言的方法/函数签名正则
METHOD_PATTERNS = {
    '.java': re.compile(
        r'^\s*(?:public|private|protected)?\s*(?:static\s+)?(?:final\s+)?'
        r'(?:[\w<>\[\]]+)\s+(\w+)\s*\([^)]*\)',
        re.MULTILINE
    ),
    '.py': re.compile(
        r'^\s*(?:async\s+)?def\s+(\w+)\s*\([^)]*\)',
        re.MULTILINE
    ),
    '.go': re.compile(
        r'^func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(',
        re.MULTILINE
    ),
    '.js': re.compile(
        r'(?:(?:async\s+)?function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>))',
        re.MULTILINE
    ),
    '.ts': re.compile(
        r'(?:(?:async\s+)?function\s+(\w+)|(?:(?:public|private|protected)\s+)?(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{)',
        re.MULTILINE
    ),
    '.php': re.compile(
        r'^\s*(?:public|private|protected)?\s*(?:static\s+)?function\s+(\w+)\s*\(',
        re.MULTILINE
    ),
    '.rb': re.compile(
        r'^\s*def\s+(\w+)',
        re.MULTILINE
    ),
}


def extract_file_summary(file_path):
    """提取文件的方法签名列表"""
    lines = read_file_lines(file_path)
    if not lines:
        return {
            "file": str(file_path),
            "totalLines": 0,
            "error": "文件不存在或无法读取",
            "methods": [],
        }

    content = ''.join(lines)
    suffix = Path(file_path).suffix.lower()

    methods = []
    pattern = METHOD_PATTERNS.get(suffix)

    if pattern:
        for match in pattern.finditer(content):
            # 获取第一个非空分组
            name = next((g for g in match.groups() if g), None)
            if name:
                # 计算行号（基于 match 中实际方法名的位置）
                name_pos = match.start(match.lastindex)
                line_num = content[:name_pos].count('\n') + 1
                # 获取完整签名：使用匹配结果本身，并扩展到行尾
                match_end = match.end()
                line_end = content.find('\n', match_end)
                if line_end == -1:
                    line_end = len(content)
                # 从匹配文本中提取签名，去除前导空白行
                raw_sig = match.group(0)
                # 扩展到行尾（如包含返回类型注解等）
                rest = content[match_end:line_end].rstrip()
                signature = raw_sig.strip() + rest
                methods.append({
                    "name": name,
                    "line": line_num,
                    "signature": signature[:200],  # 限制长度
                })

    return {
        "file": str(file_path),
        "totalLines": len(lines),
        "methods": methods,
        "methodCount": len(methods),
    }


# ---------------------------------------------------------------------------
# CLI 入口
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="代码上下文提取器：为 agent 提供精简的代码上下文",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
子命令说明：
  method   提取单个方法/行号附近的代码上下文
  batch    从 findings JSON 批量提取所有 finding 的代码上下文
  summary  仅输出文件的方法签名列表

示例：
  %(prog)s method --file src/UserDao.java --line 45 --radius 30
  %(prog)s batch --findings merged-scan.json --output context-batch.json
  %(prog)s summary --file src/UserDao.java
        """
    )

    subparsers = parser.add_subparsers(dest='command', help='子命令')

    # method
    sp_method = subparsers.add_parser('method', help='提取单个方法/行号附近的代码上下文')
    sp_method.add_argument('--file', required=True, help='源文件路径')
    sp_method.add_argument('--line', type=int, required=True, help='中心行号')
    sp_method.add_argument('--radius', type=int, default=30, help='提取半径（默认 ±30 行）')

    # batch
    sp_batch = subparsers.add_parser('batch', help='从 findings JSON 批量提取上下文')
    sp_batch.add_argument('--findings', required=True, help='findings JSON 文件路径')
    sp_batch.add_argument('--output', '-o', required=True, help='输出文件路径')
    sp_batch.add_argument('--radius', type=int, default=30, help='提取半径（默认 ±30 行）')

    # summary
    sp_summary = subparsers.add_parser('summary', help='输出文件的方法签名列表')
    sp_summary.add_argument('--file', required=True, help='源文件路径')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    if args.command == 'method':
        result = extract_method_context(args.file, args.line, args.radius)
        stdout_json(result)

    elif args.command == 'batch':
        extract_batch_context(args.findings, args.output, args.radius)

    elif args.command == 'summary':
        result = extract_file_summary(args.file)
        stdout_json(result)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
    except Exception as e:
        log_error(f"未预期的错误: {e}")
        stdout_json({"status": "error", "message": str(e)})
        sys.exit(1)
