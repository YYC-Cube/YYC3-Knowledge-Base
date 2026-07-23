#!/usr/bin/env python3
"""
Checkpoint 采样校验脚本：自动化验证 agent 输出的真实性，替代 coordinator 手动 Read 抽检。

子命令：
  verify-explore  校验探索阶段输出（文件列表、入口点、依赖）
  verify-scan     校验扫描阶段合并结果（finding 文件路径、riskCode 真实性 + 严重性统计）
  verify-batches  校验全批次合并结果（去重正确性 + 文件路径抽检）

  兼容别名：verify-stage1 → verify-explore, verify-stage2 → verify-scan

设计原则：
  - stdout 仅输出 JSON 摘要供 coordinator 解析
  - 日志输出到 stderr
  - 采样数可配置，默认 5 个
"""
import argparse
import json
import random
import re
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# 日志工具（复用 merge_findings.py 风格）
# ---------------------------------------------------------------------------

class Colors:
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'


def log_info(msg):
    print(f"{Colors.CYAN}[checkpoint] {msg}{Colors.ENDC}", file=sys.stderr)


def log_ok(msg):
    print(f"{Colors.GREEN}[checkpoint] {msg}{Colors.ENDC}", file=sys.stderr)


def log_warn(msg):
    print(f"{Colors.WARNING}[checkpoint] {msg}{Colors.ENDC}", file=sys.stderr)


def log_error(msg):
    print(f"{Colors.FAIL}[checkpoint] {msg}{Colors.ENDC}", file=sys.stderr)


def stdout_json(data):
    print(json.dumps(data, ensure_ascii=False))


# ---------------------------------------------------------------------------
# 通用工具
# ---------------------------------------------------------------------------

def load_json_file(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return None
    except json.JSONDecodeError as e:
        log_warn(f"JSON 解析失败: {path} ({e})")
        return None


def write_json_file(path, data):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def sample_items(items, n=None):
    """从列表中动态采样。
    当 n 为 None 时：采样数 = max(5, min(len(items) * 0.1, 20))
    当 n 显式指定时：采样数 = min(n, len(items))
    """
    if not items:
        return []
    if n is None:
        n = max(5, min(int(len(items) * 0.1), 20))
    sample_count = min(n, len(items))
    return random.sample(items, sample_count)


def read_lines(file_path, center_line, radius=3):
    """读取文件指定行号附近的内容，返回行列表"""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
        start = max(0, center_line - 1 - radius)
        end = min(len(lines), center_line + radius)
        return [l.rstrip('\n') for l in lines[start:end]]
    except Exception:
        return []


def file_exists(path):
    return Path(path).is_file()


# ---------------------------------------------------------------------------
# verify-artifacts：校验阶段 2/3 关键产物是否完整落盘
# ---------------------------------------------------------------------------

FINAL_AGENT_STATUSES = {"completed", "partial"}
ALL_AGENT_STATUSES = FINAL_AGENT_STATUSES | {"in_progress", "failed"}

AGENT_OUTPUT_SPECS = {
    "recon-lite": {
        "path": "agents/{prefix}recon-lite.json",
        "required_keys": ["agent", "status", "fileList", "projectInfo"],
    },
    "recon-deep": {
        "path": "agents/{prefix}recon-deep.json",
        "required_keys": ["agent", "status", "entryPoints", "endpointPermissionMatrix"],
    },
    "quick-scan": {
        "path": "agents/{prefix}quick-scan.json",
        "required_keys": ["agent", "status", "findings"],
        "companion_files": [
            {
                "path": "{prefix}pattern-scan-results.json",
                "required_keys": ["sinkLocations"],
                "optional": True,
            }
        ],
    },
    "deep-scan": {
        "path": "agents/{prefix}deep-scan.json",
        "required_keys": ["agent", "status", "findings"],
    },
    "verification": {
        "path": "agents/{prefix}verification.json",
        "required_keys": ["agent", "status"],
        "alternative_keys": {
            "validatedFindings": ["findings"],
            "summary": ["metrics"],
        },
    },
}


def _validate_json_artifact(path, expected_agent=None, required_keys=None, alternative_keys=None):
    data = load_json_file(path)
    if data is None:
        return False, "missing_or_invalid_json", None

    if expected_agent and data.get("agent") != expected_agent:
        return False, f"agent_mismatch:{data.get('agent', '')}", data

    alt = alternative_keys or {}
    for key in required_keys or []:
        if key not in data:
            # Check alternative key names
            alternatives = alt.get(key, [])
            found = any(alt_key in data for alt_key in alternatives)
            if not found:
                return False, f"missing_key:{key}", data

    status = str(data.get("status", "")).strip().lower()
    if status and status not in ALL_AGENT_STATUSES:
        return False, f"invalid_status:{status}", data

    if status and status not in FINAL_AGENT_STATUSES:
        return False, f"non_final_status:{status}", data

    if "writeCount" in data and isinstance(data.get("writeCount"), int) and data["writeCount"] <= 0:
        return False, "invalid_write_count", data

    return True, "ok", data


def verify_artifacts(batch_dir, agents, prefix=""):
    """校验关键 agent 产物是否已落盘且状态可用于下游交接。"""
    log_info("开始关键产物完整性校验...")

    requested_agents = [a.strip() for a in agents.split(",") if a.strip()]
    if not requested_agents:
        stdout_json({"status": "error", "message": "未指定 --agents"})
        sys.exit(1)

    results = {
        "status": "ok",
        "checkedAgents": requested_agents,
        "readyAgents": [],
        "failedAgents": [],
        "missingFiles": [],
        "details": [],
    }

    for agent_name in requested_agents:
        spec = AGENT_OUTPUT_SPECS.get(agent_name)
        if spec is None:
            results["failedAgents"].append(agent_name)
            results["details"].append({
                "agent": agent_name,
                "status": "fail",
                "reason": "unknown_agent",
            })
            continue

        artifact_path = batch_dir / spec["path"].format(prefix=prefix)
        ok, reason, data = _validate_json_artifact(
            artifact_path,
            expected_agent=agent_name,
            required_keys=spec.get("required_keys", []),
            alternative_keys=spec.get("alternative_keys"),
        )
        if not ok:
            results["failedAgents"].append(agent_name)
            if reason == "missing_or_invalid_json":
                results["missingFiles"].append(str(artifact_path))
            results["details"].append({
                "agent": agent_name,
                "path": str(artifact_path),
                "status": "fail",
                "reason": reason,
            })
            continue

        companion_failures = []
        for companion in spec.get("companion_files", []):
            companion_path = batch_dir / companion["path"].format(prefix=prefix)
            is_optional = companion.get("optional", False)
            c_ok, c_reason, _ = _validate_json_artifact(
                companion_path,
                expected_agent=None if is_optional else agent_name,
                required_keys=companion.get("required_keys", []),
            )
            if not c_ok:
                if is_optional:
                    pass  # optional companion missing is not a failure
                else:
                    companion_failures.append({
                        "path": str(companion_path),
                        "reason": c_reason,
                    })
                    if c_reason == "missing_or_invalid_json":
                        results["missingFiles"].append(str(companion_path))

        if companion_failures:
            results["failedAgents"].append(agent_name)
            results["details"].append({
                "agent": agent_name,
                "path": str(artifact_path),
                "status": "fail",
                "reason": "companion_artifact_invalid",
                "companionFailures": companion_failures,
            })
            continue

        results["readyAgents"].append(agent_name)
        results["details"].append({
            "agent": agent_name,
            "path": str(artifact_path),
            "status": "ok",
            "agentStatus": data.get("status", ""),
            "writeCount": data.get("writeCount"),
        })

    if results["failedAgents"]:
        results["status"] = "fail"
        failures_name = f"{prefix}checkpoint-artifact-failures.json" if prefix else "checkpoint-artifact-failures.json"
        try:
            write_json_file(batch_dir / failures_name, results)
        except OSError as exc:
            results["failureReportWriteError"] = str(exc)
            log_warn(f"写入 {failures_name} 失败：{exc}")
        log_error(
            "关键产物校验失败："
            + ", ".join(f"{item['agent']}({item['reason']})" for item in results["details"] if item["status"] == "fail")
        )
    else:
        log_ok(f"关键产物校验通过：{', '.join(results['readyAgents'])}")

    stdout_json(results)


# ---------------------------------------------------------------------------
# verify-stage1：校验阶段 1 输出
# ---------------------------------------------------------------------------

def verify_explore(batch_dir, sample_size=5):
    """校验探索阶段输出 stage1-context.json 中的文件列表、入口点、依赖"""
    log_info("开始探索阶段交接校验...")

    ctx_path = batch_dir / "stage1-context.json"
    ctx = load_json_file(ctx_path)
    if ctx is None:
        stdout_json({"status": "error", "message": f"无法读取 {ctx_path}"})
        sys.exit(1)

    results = {"status": "ok", "checks": [], "failedItems": [], "passRate": 1.0}
    total_checks = 0
    passed_checks = 0

    # 1. 校验 fileList
    file_list = ctx.get("fileList", [])
    if isinstance(file_list, list) and file_list:
        sampled = sample_items(file_list, sample_size)
        for fp in sampled:
            total_checks += 1
            if file_exists(fp):
                passed_checks += 1
            else:
                results["failedItems"].append({"type": "fileList", "path": fp, "reason": "文件不存在"})
        results["checks"].append({
            "type": "fileList", "total": len(file_list),
            "sampled": len(sampled), "passed": passed_checks
        })
        log_info(f"fileList 抽检 {len(sampled)}/{len(file_list)}，通过 {passed_checks}")
    else:
        results["checks"].append({"type": "fileList", "total": 0, "sampled": 0, "passed": 0})
        log_warn("fileList 为空")

    # 2. 校验 entryPoints
    entry_points = ctx.get("entryPoints", [])
    if isinstance(entry_points, list) and entry_points:
        sampled_ep = sample_items(entry_points, sample_size)
        ep_passed = 0
        for ep in sampled_ep:
            total_checks += 1
            ep_file = ep.get("file", ep.get("filePath", ""))
            ep_method = ep.get("method", ep.get("name", ""))
            if not ep_file or not file_exists(ep_file):
                results["failedItems"].append({
                    "type": "entryPoint", "file": ep_file,
                    "method": ep_method, "reason": "文件不存在"
                })
                continue
            # 检查方法名是否出现在文件中
            try:
                with open(ep_file, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                if ep_method and ep_method in content:
                    ep_passed += 1
                    passed_checks += 1
                else:
                    results["failedItems"].append({
                        "type": "entryPoint", "file": ep_file,
                        "method": ep_method, "reason": "方法名未找到"
                    })
            except Exception:
                results["failedItems"].append({
                    "type": "entryPoint", "file": ep_file,
                    "method": ep_method, "reason": "读取文件失败"
                })
        results["checks"].append({
            "type": "entryPoints", "total": len(entry_points),
            "sampled": len(sampled_ep), "passed": ep_passed
        })
        log_info(f"entryPoints 抽检 {len(sampled_ep)}/{len(entry_points)}，通过 {ep_passed}")

    # 3. 校验 dependencies
    deps = ctx.get("dependencies", [])
    if isinstance(deps, list) and deps:
        sampled_deps = sample_items(deps, min(3, sample_size))
        dep_passed = 0
        for dep in sampled_deps:
            total_checks += 1
            dep_file = dep.get("file", dep.get("filePath", ""))
            if dep_file and file_exists(dep_file):
                dep_passed += 1
                passed_checks += 1
            else:
                results["failedItems"].append({
                    "type": "dependency", "file": dep_file, "reason": "依赖文件不存在"
                })
        results["checks"].append({
            "type": "dependencies", "total": len(deps),
            "sampled": len(sampled_deps), "passed": dep_passed
        })
        log_info(f"dependencies 抽检 {len(sampled_deps)}/{len(deps)}，通过 {dep_passed}")

    # 汇总
    results["totalChecks"] = total_checks
    results["passedChecks"] = passed_checks
    results["passRate"] = round(passed_checks / total_checks, 2) if total_checks > 0 else 1.0

    if results["passRate"] < 0.6:
        results["status"] = "fail"
        log_error(f"探索阶段校验失败：通过率 {results['passRate']}")
    else:
        results["status"] = "ok"
        log_ok(f"探索阶段校验通过：{passed_checks}/{total_checks} (通过率 {results['passRate']})")

    stdout_json(results)


# ---------------------------------------------------------------------------
# verify-scan：校验扫描阶段合并结果
# ---------------------------------------------------------------------------

def verify_scan(batch_dir, sample_size=None, prefix=""):
    """校验 merged-stage2.json 中的 findings 真实性，包含严重性分布统计"""
    log_info("开始扫描阶段交接校验...")

    merged_name = f"{prefix}merged-stage2.json" if prefix else "merged-stage2.json"
    merged_path = batch_dir / merged_name
    merged = load_json_file(merged_path)
    if merged is None:
        # 回退到 merged-scan.json
        fallback_name = f"{prefix}merged-scan.json" if prefix else "merged-scan.json"
        fallback_path = batch_dir / fallback_name
        merged = load_json_file(fallback_path)
        if merged is not None:
            log_info(f"使用 {fallback_name} 作为 {merged_name} 的回退")
    if merged is None:
        stdout_json({"status": "error", "message": f"无法读取 {merged_path}"})
        sys.exit(1)

    findings = merged.get("findings", [])
    if not isinstance(findings, list):
        findings = []

    results = {
        "status": "ok",
        "totalFindings": len(findings),
        "sampled": 0,
        "passed": 0,
        "failed": 0,
        "failedItems": [],
        "hallucinations": [],
    }

    if not findings:
        log_info("无 findings 需要校验")
        stdout_json(results)
        return

    sampled = sample_items(findings, sample_size)
    results["sampled"] = len(sampled)
    passed = 0

    for finding in sampled:
        fp = finding.get("filePath", finding.get("file", ""))
        line_num = finding.get("lineNumber", finding.get("line", 0))
        risk_code = finding.get("riskCode", finding.get("codeSnippet", ""))
        finding_id = finding.get("findingId", "unknown")

        # 检查 1：文件存在性
        if not fp or not file_exists(fp):
            results["failedItems"].append({
                "findingId": finding_id, "filePath": fp,
                "reason": "文件不存在"
            })
            results["hallucinations"].append(finding_id)
            continue

        # 检查 2：行号有效性 + riskCode 匹配
        if line_num and risk_code:
            nearby_lines = read_lines(fp, int(line_num), radius=3)
            combined = "\n".join(nearby_lines)
            # 取 riskCode 的前 40 字符做模糊匹配（agent 可能有轻微格式差异）
            snippet = risk_code.strip()[:40]
            # 转义正则特殊字符后做子串匹配
            snippet_escaped = re.escape(snippet)
            if nearby_lines and re.search(snippet_escaped, combined):
                passed += 1
            elif nearby_lines:
                # 行号附近有内容但代码片段不匹配
                results["failedItems"].append({
                    "findingId": finding_id, "filePath": fp,
                    "lineNumber": line_num,
                    "reason": "riskCode 在行号 ±3 行范围内未匹配"
                })
                results["hallucinations"].append(finding_id)
            else:
                results["failedItems"].append({
                    "findingId": finding_id, "filePath": fp,
                    "lineNumber": line_num,
                    "reason": "行号超出文件范围"
                })
                results["hallucinations"].append(finding_id)
        elif not risk_code:
            # 无 riskCode 时仅验证文件存在即通过
            passed += 1
        else:
            passed += 1

    results["passed"] = passed
    results["failed"] = results["sampled"] - passed
    results["passRate"] = round(passed / results["sampled"], 2) if results["sampled"] > 0 else 1.0

    # 写入失败详情文件
    if results["failedItems"]:
        failures_name = f"{prefix}checkpoint-stage2-failures.json" if prefix else "checkpoint-stage2-failures.json"
        write_json_file(batch_dir / failures_name, {
            "failedItems": results["failedItems"],
            "hallucinations": results["hallucinations"],
        })

    # 严重性分布统计
    severity_dist = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for f in findings:
        sev = str(f.get("severity", "")).lower().strip()
        if sev in ("critical", "严重"):
            severity_dist["critical"] += 1
        elif sev in ("high", "高"):
            severity_dist["high"] += 1
        elif sev in ("medium", "moderate", "中", "中等"):
            severity_dist["medium"] += 1
        elif sev in ("low", "低"):
            severity_dist["low"] += 1
    results["bySeverity"] = severity_dist

    # 证据链完整性抽检
    evidence_checked = 0
    evidence_missing = 0
    for f in sampled:
        evidence_checked += 1
        has_attack_chain = bool(f.get("attackChain"))
        has_trace = bool(f.get("traceMethod"))
        source_agent = f.get("sourceAgent", "")
        if source_agent in ("vulnerability-audit", "logic-defect-audit"):
            if not has_attack_chain and not has_trace:
                evidence_missing += 1
    results["evidenceChecked"] = evidence_checked
    results["evidenceMissing"] = evidence_missing

    if results["passRate"] < 0.6:
        results["status"] = "fail"
        log_error(f"扫描阶段校验失败：{passed}/{results['sampled']} (通过率 {results['passRate']})")
    else:
        results["status"] = "ok"
        log_ok(f"扫描阶段校验通过：{passed}/{results['sampled']} (通过率 {results['passRate']})")
    log_info(f"严重性分布: critical={severity_dist['critical']} high={severity_dist['high']} medium={severity_dist['medium']} low={severity_dist['low']}")

    stdout_json(results)


# ---------------------------------------------------------------------------
# verify-batches：校验全批次合并结果
# ---------------------------------------------------------------------------

def verify_batches(batch_dir, sample_size=5):
    """校验 all-batches-merged.json 的去重正确性 + 文件路径抽检"""
    log_info("开始全批次合并校验...")

    merged_path = batch_dir / "all-batches-merged.json"
    merged = load_json_file(merged_path)
    if merged is None:
        stdout_json({"status": "error", "message": f"无法读取 {merged_path}"})
        sys.exit(1)

    findings = merged.get("findings", [])
    results = {
        "status": "ok",
        "totalFindings": len(findings),
        "duplicatesInMerged": 0,
        "sampled": 0,
        "passed": 0,
        "failedItems": [],
        "passRate": 1.0,
    }

    # 检查 1：去重正确性 — 合并后不应有重复
    seen = set()
    dup_count = 0
    for f in findings:
        key = (
            str(f.get("file") or f.get("filePath") or ""),
            int(f.get("line") or f.get("lineNumber") or 0),
            str(f.get("riskType", "")),
        )
        if key in seen:
            dup_count += 1
        seen.add(key)
    results["duplicatesInMerged"] = dup_count
    if dup_count > 0:
        log_warn(f"合并结果中仍有 {dup_count} 个重复 findings")

    # 检查 2：文件路径抽检
    if findings:
        sampled = sample_items(findings, sample_size)
        results["sampled"] = len(sampled)
        passed = 0
        for f in sampled:
            fp = f.get("filePath", f.get("file", ""))
            if fp and file_exists(fp):
                passed += 1
            else:
                results["failedItems"].append({
                    "findingId": f.get("findingId", "?"),
                    "filePath": fp, "reason": "文件不存在"
                })
        results["passed"] = passed
        results["passRate"] = round(passed / len(sampled), 2) if sampled else 1.0

    if results["passRate"] < 0.6 or dup_count > 0:
        results["status"] = "fail" if results["passRate"] < 0.6 else "warn"
        log_error(f"全批次校验：通过率 {results['passRate']}，重复 {dup_count}")
    else:
        log_ok(f"全批次校验通过：{results['passed']}/{results['sampled']}，无重复")

    stdout_json(results)


# ---------------------------------------------------------------------------
# CLI 入口
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Checkpoint 采样校验脚本：自动化验证 agent 输出真实性",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
子命令说明：
  verify-artifacts 校验关键 agent 产物是否完整落盘（推荐在 merge 前执行）
  verify-explore  校验探索阶段输出（文件列表、入口点、依赖）
  verify-scan     校验扫描阶段合并结果（finding 路径 + riskCode 真实性 + 严重性统计）
  verify-batches  校验全批次合并结果（去重正确性 + 路径抽检）

  兼容别名：verify-stage1 → verify-explore, verify-stage2 → verify-scan

示例：
  %(prog)s verify-artifacts --batch-dir security-scan-output/project-audit-xxx --agents quick-scan,deep-scan,verification
  %(prog)s verify-explore --batch-dir security-scan-output/project-audit-xxx
  %(prog)s verify-scan --batch-dir security-scan-output/project-audit-xxx
  %(prog)s verify-scan --batch-dir security-scan-output/project-audit-xxx --prefix batch-1-
  %(prog)s verify-batches --batch-dir security-scan-output/project-audit-xxx
        """
    )

    subparsers = parser.add_subparsers(dest='command', help='子命令')

    # verify-artifacts
    sp0 = subparsers.add_parser('verify-artifacts', help='校验关键 agent 产物是否已完整落盘')
    sp0.add_argument('--batch-dir', required=True, help='审计批次目录路径')
    sp0.add_argument('--agents', required=True, help='需要检查的 agent 列表，逗号分隔')
    sp0.add_argument('--prefix', default='', help='文件名前缀（分批模式用，如 batch-1-）')

    # verify-explore (新名称) + verify-stage1 (兼容别名)
    for cmd_name in ('verify-explore', 'verify-stage1'):
        sp = subparsers.add_parser(cmd_name, help='校验探索阶段输出')
        sp.add_argument('--batch-dir', required=True, help='审计批次目录路径')
        sp.add_argument('--sample-size', type=int, default=5, help='采样数量（默认 5）')

    # verify-scan (新名称) + verify-stage2 (兼容别名)
    for cmd_name in ('verify-scan', 'verify-stage2'):
        sp = subparsers.add_parser(cmd_name, help='校验扫描阶段合并结果')
        sp.add_argument('--batch-dir', required=True, help='审计批次目录路径')
        sp.add_argument('--prefix', default='', help='文件名前缀（分批模式用，如 batch-1-）')
        sp.add_argument('--sample-size', type=int, default=5, help='采样数量（默认 5）')

    # verify-batches
    sp3 = subparsers.add_parser('verify-batches', help='校验全批次合并结果')
    sp3.add_argument('--batch-dir', required=True, help='审计批次目录路径')
    sp3.add_argument('--sample-size', type=int, default=5, help='采样数量（默认 5）')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    batch_dir = Path(args.batch_dir)
    if not batch_dir.is_dir():
        log_error(f"批次目录不存在: {batch_dir}")
        stdout_json({"status": "error", "message": f"batch dir not found: {batch_dir}"})
        sys.exit(1)

    if args.command == 'verify-artifacts':
        verify_artifacts(batch_dir, args.agents, args.prefix)
    elif args.command in ('verify-explore', 'verify-stage1'):
        verify_explore(batch_dir, args.sample_size)
    elif args.command in ('verify-scan', 'verify-stage2'):
        verify_scan(batch_dir, args.sample_size, args.prefix)
    elif args.command == 'verify-batches':
        verify_batches(batch_dir, args.sample_size)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        log_warn("用户中断操作")
        sys.exit(130)
    except Exception as e:
        log_error(f"未预期的错误: {e}")
        import traceback
        traceback.print_exc(file=sys.stderr)
        stdout_json({"status": "error", "message": str(e)})
        sys.exit(1)
