#!/usr/bin/env python3
"""
审计报告生成脚本
根据代码审计结果生成 HTML 报告（可选 JSON）
"""
import json
import argparse
import os
import sys
import subprocess
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from html import escape


class Colors:
    """终端颜色输出"""
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


BEIJING_TZ = timezone(timedelta(hours=8))
LOCAL_TZ = datetime.now().astimezone().tzinfo or timezone.utc
TIME_FORMAT = "%Y-%m-%d %H:%M:%S"


def print_colored(message, color=Colors.ENDC):
    """彩色打印"""
    print(f"{color}{message}{Colors.ENDC}", file=sys.stderr)


def _normalize_remediation_to_risklist(data):
    """将 remediation agent 输出格式转换为标准 RiskList 格式"""
    remediations = data.get('remediations', [])
    if not remediations:
        return None

    risk_list = []
    for r in remediations:
        entry = {
            'RiskType': r.get('RiskType', r.get('riskType', '未知风险')),
            'RiskLevel': r.get('RiskLevel', r.get('riskLevel', 'low')),
            'RiskConfidence': r.get('RiskConfidence', r.get('riskConfidence', '')),
            'FilePath': r.get('FilePath', r.get('filePath', '')),
            'LineNumber': r.get('LineNumber', r.get('lineNumber', None)),
            'RiskCode': r.get('RiskCode', r.get('riskCode', '')),
            'RiskDetail': r.get('RiskDetail', r.get('riskDetail', '')),
            'Suggestions': r.get('Suggestions', r.get('suggestion', r.get('recommendation', ''))),
            'CodeSnippet': r.get('CodeSnippet', r.get('codeSnippet', r.get('originalCode', ''))),
            'FixedCode': r.get('FixedCode', r.get('fixedCode', '')),
        }
        # 保留 0-day / AI 推理标记
        merged_id = r.get('mergedId', r.get('findingId', ''))
        if merged_id:
            entry['mergedId'] = merged_id
        audited_by = r.get('auditedBy', [])
        if audited_by:
            entry['auditedBy'] = audited_by
        # 标记发现来源（用于 0-day 判断）
        discovery_method = r.get('discoveryMethod', '')
        if discovery_method:
            entry['discoveryMethod'] = discovery_method
        risk_list.append(entry)

    # 构造 summary
    critical = 0
    high = 0
    medium = 0
    low = 0
    for entry in risk_list:
        level = get_risk_level_normalized(entry.get('RiskLevel', 'low'))
        if level == 'critical':
            critical += 1
        elif level == 'high':
            high += 1
        elif level == 'medium':
            medium += 1
        else:
            low += 1

    # 收集涉及的文件
    file_set = {}
    for entry in risk_list:
        fp = entry.get('FilePath', '')
        if fp:
            if fp not in file_set:
                file_set[fp] = {'fileName': os.path.basename(fp), 'filePath': fp, 'issues': 0}
            file_set[fp]['issues'] += 1

    normalized = {
        'metadata': data.get('metadata', {}),
        'summary': {
            'totalIssues': len(risk_list),
            'criticalRisk': critical,
            'highRisk': high,
            'mediumRisk': medium,
            'lowRisk': low,
        },
        'RiskList': risk_list,
        '_files': list(file_set.values()),
    }

    # 保留攻击链信息
    attack_chains = data.get('attackChains', data.get('chainVerification', []))
    if attack_chains:
        normalized['attackChains'] = attack_chains

    return normalized


def load_audit_results(input_path, audit_batch_id=None):
    """加载审计结果"""
    results = []
    summary = None

    # 确定输入路径
    if audit_batch_id and not input_path:
        possible_paths = [
            os.path.join(os.getcwd(), "security-scan-output", audit_batch_id),
            os.path.join("/tmp", "security-scan-output", audit_batch_id),
        ]
        for path in possible_paths:
            if os.path.exists(path):
                input_path = path
                break

    if not input_path:
        raise ValueError("未指定输入路径，请使用 --input 或 --audit-batch-id")

    input_path = Path(input_path)

    if input_path.is_file():
        with open(input_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

            # 如果是 remediation agent 格式，先转换
            if 'remediations' in data and 'RiskList' not in data and 'issues' not in data:
                normalized = _normalize_remediation_to_risklist(data)
                if normalized:
                    data = normalized

            results.append(data)
            if 'summary' in data:
                summary = {
                    'auditBatchId': data.get('metadata', {}).get('auditBatchId', audit_batch_id or 'unknown'),
                    'riskFiles': sum(1 for f in (data.get('_files', []) or []) if f.get('issues', 0) > 0) or (1 if data['summary'].get('totalIssues', 0) > 0 else 0),
                    'totalIssues': data['summary'].get('totalIssues', 0),
                    'criticalRisk': data['summary'].get('criticalRisk', 0),
                    'highRisk': data['summary'].get('highRisk', 0),
                    'mediumRisk': data['summary'].get('mediumRisk', 0),
                    'lowRisk': data['summary'].get('lowRisk', 0),
                    'files': data.get('_files', []) or [{
                        'fileName': data.get('metadata', {}).get('fileName', 'unknown'),
                        'filePath': data.get('metadata', {}).get('filePath', ''),
                        'issues': data['summary'].get('totalIssues', 0)
                    }]
                }

    elif input_path.is_dir():
        summary_file = input_path / "summary.json"
        if summary_file.exists():
            with open(summary_file, 'r', encoding='utf-8') as f:
                summary = json.load(f)
            # 兼容 summary.json 中的不同字段名
            if isinstance(summary, dict):
                # batchId → auditBatchId
                if 'batchId' in summary and 'auditBatchId' not in summary:
                    summary['auditBatchId'] = summary['batchId']
                # totalFindings → totalIssues
                if 'totalFindings' in summary and 'totalIssues' not in summary:
                    summary['totalIssues'] = summary['totalFindings']
            summary_id = summary.get('auditBatchId') if isinstance(summary, dict) else None
            if audit_batch_id and (not summary_id or summary_id == 'unknown'):
                summary['auditBatchId'] = audit_batch_id
            elif not summary_id or summary_id == 'unknown':
                summary['auditBatchId'] = input_path.name

        for file_path in sorted(input_path.glob("finding-*.json")):
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if 'remediations' in data and 'RiskList' not in data and 'issues' not in data:
                    normalized = _normalize_remediation_to_risklist(data)
                    if normalized:
                        data = normalized
                results.append(data)

        # 如果没有 finding-*.json，尝试加载 agents 子目录中的 remediation.json 或 verification.json
        if not results:
            agents_dir = input_path / "agents"
            if agents_dir.is_dir():
                for candidate in ["remediation.json", "verification.json"]:
                    candidate_path = agents_dir / candidate
                    if candidate_path.exists():
                        with open(candidate_path, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                        if 'remediations' in data or 'verifiedFindings' in data:
                            if 'remediations' in data:
                                normalized = _normalize_remediation_to_risklist(data)
                            elif 'verifiedFindings' in data:
                                # verification 格式也做简单转换
                                vdata = dict(data)
                                vdata['remediations'] = vdata.pop('verifiedFindings', [])
                                normalized = _normalize_remediation_to_risklist(vdata)
                            if normalized:
                                results.append(normalized)
                                break

        if not summary and results:
            total_issues = 0
            critical_risk = 0
            high_risk = 0
            medium_risk = 0
            low_risk = 0
            files = []

            for r in results:
                s = r.get('summary', {})
                total_issues += s.get('totalIssues', 0)
                critical_risk += s.get('criticalRisk', 0)
                high_risk += s.get('highRisk', 0)
                medium_risk += s.get('mediumRisk', 0)
                low_risk += s.get('lowRisk', 0)
                files.append({
                    'fileName': r.get('metadata', {}).get('fileName', 'unknown'),
                    'filePath': r.get('metadata', {}).get('filePath', ''),
                    'issues': s.get('totalIssues', 0)
                })

            summary = {
                'auditBatchId': audit_batch_id or input_path.name or 'unknown',
                'riskFiles': sum(1 for r in results if r.get('summary', {}).get('totalIssues', 0) > 0),
                'totalIssues': total_issues,
                'criticalRisk': critical_risk,
                'highRisk': high_risk,
                'mediumRisk': medium_risk,
                'lowRisk': low_risk,
                'files': files
            }
    else:
        raise ValueError(f"输入路径不存在: {input_path}")

    if summary and isinstance(summary, dict):
        summary_id = summary.get('auditBatchId')
        if audit_batch_id and (not summary_id or summary_id == 'unknown'):
            summary['auditBatchId'] = audit_batch_id
        elif not summary_id or summary_id == 'unknown':
            if input_path.is_dir():
                summary['auditBatchId'] = input_path.name
            elif input_path.is_file():
                parent_name = input_path.parent.name
                if parent_name.startswith("audit-"):
                    summary['auditBatchId'] = parent_name

    # 兼容 summary 中的不同字段名（覆盖所有输入路径）
    if summary and isinstance(summary, dict):
        if 'batchId' in summary and 'auditBatchId' not in summary:
            summary['auditBatchId'] = summary['batchId']
        if 'totalFindings' in summary and 'totalIssues' not in summary:
            summary['totalIssues'] = summary['totalFindings']

    return results, summary



def resolve_git_base(input_path):
    if not input_path:
        return Path.cwd()
    try:
        path = Path(input_path)
        if path.is_file():
            return path.parent
        return path
    except Exception:
        return Path.cwd()


def get_git_branch(base_path=None):
    base = Path(base_path) if base_path else Path.cwd()
    try:
        result = subprocess.run(
            ["git", "-C", str(base), "rev-parse", "--abbrev-ref", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return ""
    branch = result.stdout.strip()
    if not branch or branch == "HEAD":
        return ""
    return branch


def get_git_project_name(base_path=None):
    """从 git remote origin url 解析项目名称"""
    base = Path(base_path) if base_path else Path.cwd()
    try:
        result = subprocess.run(
            ["git", "-C", str(base), "remote", "get-url", "origin"],
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return ""
    url = result.stdout.strip()
    if not url:
        return ""
    # 处理 SSH 格式: git@host:group/repo.git
    if url.startswith("git@"):
        url = url.split(":", 1)[-1]
    # 处理 HTTPS 格式: https://host/group/repo.git
    name = url.rstrip("/").rsplit("/", 1)[-1]
    if name.endswith(".git"):
        name = name[:-4]
    return name


def _parse_datetime(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=LOCAL_TZ)
        return value
    if isinstance(value, (int, float)):
        timestamp = float(value)
        if timestamp > 1e12:
            timestamp /= 1000.0
        return datetime.fromtimestamp(timestamp, tz=timezone.utc)

    text = str(value).strip()
    if not text:
        return None
    if text.isdigit():
        try:
            timestamp = int(text)
            if len(text) >= 13:
                timestamp /= 1000.0
            return datetime.fromtimestamp(timestamp, tz=timezone.utc)
        except (ValueError, OSError):
            return None

    normalized = text.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(normalized)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=LOCAL_TZ)
        return dt
    except ValueError:
        pass

    for fmt in (
        "%Y-%m-%d %H:%M:%S",
        "%Y/%m/%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y/%m/%d %H:%M",
        "%Y-%m-%d",
        "%Y/%m/%d",
    ):
        try:
            dt = datetime.strptime(text, fmt)
            return dt.replace(tzinfo=LOCAL_TZ)
        except ValueError:
            continue

    return None


def format_beijing_time(value):
    dt = _parse_datetime(value)
    if not dt:
        return ""
    return dt.astimezone(BEIJING_TZ).strftime(TIME_FORMAT)


def _format_file_entries(files):
    formatted = []
    for item in files or []:
        if isinstance(item, dict):
            entry = dict(item)
            if "timestamp" in entry:
                entry["timestamp"] = format_beijing_time(entry.get("timestamp"))
            formatted.append(entry)
        else:
            formatted.append(item)
    return formatted


def _resolve_issue_file_path(issue_path, fallback_path, file_name):
    issue_path = issue_path or ""
    fallback_path = fallback_path or ""
    if fallback_path:
        normalized = issue_path.replace("\\", "/")
        if not issue_path or normalized.startswith("task/") or issue_path == file_name:
            return fallback_path
    return issue_path or fallback_path


def get_risk_level_normalized(level):
    """标准化风险等级（支持4级：critical/high/medium/low）"""
    level_lower = str(level).lower()
    if level_lower in ['critical', '严重']:
        return 'critical'
    elif level_lower in ['high', '高']:
        return 'high'
    elif level_lower in ['medium', '中', 'moderate', '中等']:
        return 'medium'
    else:
        return 'low'


def generate_json_report(results, summary, code_branch=None, project_name=None):
    """生成 JSON 格式报告"""
    audit_batch_id = summary.get('auditBatchId') or 'unknown'
    timestamp = format_beijing_time(datetime.now(timezone.utc))
    code_branch_value = code_branch or "未知"
    total_issues = summary.get('totalIssues', 0)
    critical_count = summary.get('criticalRisk', 0)
    high_count = summary.get('highRisk', 0)
    medium_count = summary.get('mediumRisk', 0)
    low_count = summary.get('lowRisk', 0)
    

    # 收集所有风险并分类
    all_issues = []
    critical_issues = []
    high_issues = []
    medium_issues = []
    low_issues = []

    all_attack_chains = []

    for result in results:
        file_name = result.get('metadata', {}).get('fileName', '')
        file_path_meta = result.get('metadata', {}).get('filePath', '')

        # 收集攻击链
        attack_chains = result.get('attackChains', result.get('chainVerification', []))
        if attack_chains:
            all_attack_chains.extend(attack_chains)

        issues = result.get('RiskList', result.get('issues', []))

        for issue in issues:
            risk_level = issue.get('RiskLevel', issue.get('riskLevel', ''))
            level_normalized = get_risk_level_normalized(risk_level)
            raw_file_path = issue.get('FilePath', issue.get('filePath', ''))
            file_path = _resolve_issue_file_path(raw_file_path, file_path_meta, file_name)
            file_name_value = file_name or os.path.basename(file_path) or "unknown"

            # 判断是否为 0-day / AI 推理发现的漏洞
            discovery_method = issue.get('discoveryMethod', '')
            audited_by = issue.get('auditedBy', [])
            is_zero_day = (
                discovery_method == '0-day'
                or (isinstance(audited_by, list) and 'deep-scan' in audited_by and 'quick-scan' not in audited_by)
            )

            issue_entry = {
                "issueId": len(all_issues),
                "fileName": file_name_value,
                "filePath": file_path,
                "riskType": issue.get('RiskType', issue.get('riskType', '未知风险')),
                "riskLevel": level_normalized,
                "lineNumber": issue.get('LineNumber', issue.get('lineNumber')),
                "riskCode": issue.get('RiskCode', issue.get('riskCode', '')),
                "riskConfidence": issue.get('RiskConfidence', issue.get('riskConfidence', '')),
                "description": issue.get('RiskDetail', issue.get('Description', issue.get('description', ''))),
                "recommendation": issue.get('Suggestions', issue.get('Recommendation', issue.get('recommendation', ''))),
                "codeSnippet": issue.get('CodeSnippet', issue.get('codeSnippet', '')),
                "fixedCode": issue.get('FixedCode', issue.get('fixedCode', '')),
                "isZeroDay": is_zero_day,
            }
            if issue.get('mergedId'):
                issue_entry["mergedId"] = issue['mergedId']
            # 保留调用链数据（单漏洞 source→propagation→sink 路径）
            attack_chain = issue.get('attackChain', issue.get('AttackChain'))
            if attack_chain and isinstance(attack_chain, dict):
                issue_entry["attackChain"] = attack_chain

            all_issues.append(issue_entry)

            if level_normalized == 'critical':
                critical_issues.append(issue_entry)
            elif level_normalized == 'high':
                high_issues.append(issue_entry)
            elif level_normalized == 'medium':
                medium_issues.append(issue_entry)
            else:
                low_issues.append(issue_entry)

    # 如果 summary 中的计数为 0 但实际有 issues，用实际数据覆盖
    actual_total = len(all_issues)
    actual_critical = len(critical_issues)
    actual_high = len(high_issues)
    actual_medium = len(medium_issues)
    actual_low = len(low_issues)
    if actual_total > 0:
        total_issues = actual_total
        critical_count = actual_critical
        high_count = actual_high
        medium_count = actual_medium
        low_count = actual_low

    # 如果 files 列表为空但可以从 _files 或 issues 推导
    files_list = summary.get('files', [])
    if not files_list:
        for result in results:
            files_list.extend(result.get('_files', []))
    if not files_list and all_issues:
        file_map = {}
        for iss in all_issues:
            fp = iss.get('filePath', '')
            if fp and fp not in file_map:
                file_map[fp] = {'fileName': iss.get('fileName', ''), 'filePath': fp, 'issues': 0}
            if fp:
                file_map[fp]['issues'] += 1
        files_list = list(file_map.values())
    risk_files_count = sum(1 for f in files_list if f.get('issues', 0) > 0)

    files = _format_file_entries(files_list)
    report = {
        "success": True,
        "metadata": {
            "auditBatchId": audit_batch_id,
            "generatedAt": timestamp,
            "codeBranch": code_branch_value,
            "projectName": project_name or ""
        },
        "summary": {
            "riskFiles": risk_files_count,
            "totalIssues": total_issues,
            "criticalRisk": critical_count,
            "highRisk": high_count,
            "mediumRisk": medium_count,
            "lowRisk": low_count
        },
        "files": files,
        "issues": {
            "critical": critical_issues,
            "high": high_issues,
            "medium": medium_issues,
            "low": low_issues
        },
        "allIssues": all_issues,
    }

    if all_attack_chains:
        report["attackChains"] = all_attack_chains

    return report


def resolve_input_path(input_path, audit_batch_id=None):
    """解析输入路径（用于写回 summary.json）"""
    if input_path:
        return Path(input_path)
    if audit_batch_id:
        possible_paths = [
            os.path.join(os.getcwd(), "security-scan-output", audit_batch_id),
            os.path.join("/tmp", "security-scan-output", audit_batch_id),
        ]
        for path in possible_paths:
            if os.path.exists(path):
                return Path(path)
    return None


def ensure_summary_file(input_path, summary):
    """确保目录输入生成 summary.json"""
    if not input_path or not input_path.is_dir():
        return
    summary_path = input_path / "summary.json"
    if summary_path.exists() or not isinstance(summary, dict):
        return
    try:
        with summary_path.open("w", encoding="utf-8") as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)
    except Exception:
        return


def _risk_label(level):
    if level == "critical":
        return "严重"
    if level == "high":
        return "高"
    if level == "medium":
        return "中"
    return "低"


# 风险类型英文→中文映射
_RISK_TYPE_CN_MAP = {
    "CODE_EXECUTION": "代码执行",
    "COMMAND_INJECTION": "命令注入",
    "EXPRESSION_INJECTION": "表达式注入",
    "HARDCODED_SECRET": "硬编码密钥",
    "IDOR": "越权访问",
    "INSECURE_CONFIGURATION": "不安全配置",
    "INSECURE_COOKIE": "不安全Cookie",
    "INSECURE_DESERIALIZATION": "不安全反序列化",
    "OPEN_REDIRECT": "开放重定向",
    "PATH_TRAVERSAL": "路径遍历",
    "PROTOTYPE_POLLUTION": "原型链污染",
    "SQL_INJECTION": "SQL注入",
    "SSRF": "服务端请求伪造",
    "SSTI": "模板注入",
    "UNRESTRICTED_FILE_UPLOAD": "任意文件上传",
    "WEAK_CRYPTOGRAPHY": "弱加密",
    "XSS": "跨站脚本",
    "XXE": "XML外部实体注入",
    "CSRF": "跨站请求伪造",
    "LDAP_INJECTION": "LDAP注入",
    "LOG_INJECTION": "日志注入",
    "RACE_CONDITION": "竞态条件",
    "BUFFER_OVERFLOW": "缓冲区溢出",
    "INFORMATION_DISCLOSURE": "信息泄露",
    "AUTHENTICATION_BYPASS": "认证绕过",
    "PRIVILEGE_ESCALATION": "权限提升",
}


def _risk_type_chinese(risk_type):
    """将风险类型英文标识转为中文名称"""
    return _RISK_TYPE_CN_MAP.get(risk_type, risk_type)


def _confidence_chinese(value):
    """将置信度文本值转为中文显示"""
    if value is None or value == '':
        return '无'
    str_val = str(value).strip().lower()
    mapping = {'high': '高', 'medium': '中', 'low': '低', 'very high': '极高', 'very low': '极低'}
    return mapping.get(str_val, str(value))


def _is_high_confidence(raw_conf):
    """判断置信度是否为高置信度"""
    if not raw_conf:
        return False
    if isinstance(raw_conf, str) and raw_conf.strip().lower() in ('high', '高', 'very high', '极高'):
        return True
    try:
        conf_value = float(str(raw_conf).strip())
        return conf_value >= 90
    except (ValueError, TypeError):
        return False


def _report_status(success, critical_count, high_count, medium_count, low_count):
    if not success:
        return "failed", "生成失败", "审计结果可能不完整"
    if critical_count:
        return "critical", "需立即处理", "存在严重风险"
    if high_count:
        return "high", "需立即处理", "存在高危风险"
    if medium_count:
        return "medium", "需要关注", "存在中危风险"
    if low_count:
        return "low", "低危风险", "存在低危风险"
    return "clean", "通过", "未发现风险"


_CODE_FENCE_PATTERN = re.compile(r"```([A-Za-z0-9_-]*)\n?([\s\S]*?)```")


def _format_recommendation_html(recommendation):
    if not recommendation:
        return ""

    sections = []
    last_index = 0
    for match in _CODE_FENCE_PATTERN.finditer(recommendation):
        if match.start() > last_index:
            sections.append(("text", recommendation[last_index:match.start()]))
        sections.append(("code", (match.group(1).strip(), match.group(2))))
        last_index = match.end()
    if last_index < len(recommendation):
        sections.append(("text", recommendation[last_index:]))

    html_parts = []
    for kind, value in sections:
        if kind == "text":
            text = value.strip()
            if not text:
                continue
            escaped = escape(text).replace("\n", "<br>")
            html_parts.append(f"<p>{escaped}</p>")
            continue

        lang, code = value
        if code is None:
            continue
        code = code.rstrip("\n")
        if code.startswith("\n"):
            code = code[1:]
        elif code.startswith(" "):
            code = code[1:]
        if not code.strip():
            continue
        summary = "修复建议代码"
        if lang:
            summary = f"{summary} ({escape(lang)})"
        html_parts.append(
            f"""
                <details class="code-block" open>
                    <summary>{summary}</summary>
                    <pre><code>{escape(code)}</code></pre>
                </details>
            """
        )

    if not html_parts:
        escaped = escape(str(recommendation)).replace("\n", "<br>")
        return f"<p>{escaped}</p>"
    return "\n".join(html_parts)


def _stringify_chain_node(node):
    """将 attackChain 的 source/sink/propagation 节点统一转为字符串。
    兼容 str 和 dict（如 {"file": "...", "line": 55, "description": "..."}）两种格式。"""
    if isinstance(node, str):
        return node.strip()
    if isinstance(node, dict):
        parts = []
        if node.get('file'):
            loc = str(node['file'])
            if node.get('line'):
                loc += f":{node['line']}"
            parts.append(loc)
        if node.get('description'):
            parts.append(str(node['description']))
        return ' — '.join(parts) if parts else str(node)
    if node is None:
        return ''
    return str(node).strip()


def _format_attack_chain_html(attack_chain):
    """将单个漏洞的 attackChain 渲染为调用链流程图"""
    if not attack_chain or not isinstance(attack_chain, dict):
        return ""
    source = _stringify_chain_node(attack_chain.get('source', ''))
    propagation = attack_chain.get('propagation', [])
    sink = _stringify_chain_node(attack_chain.get('sink', ''))
    raw_trace = attack_chain.get('traceMethod', '')
    trace_method = raw_trace.strip() if isinstance(raw_trace, str) else str(raw_trace or '').strip()
    if not source and not sink:
        return ""

    trace_labels = {
        'LSP': 'LSP 语义追踪',
        'Grep+Read': 'Grep 模式匹配',
        'unknown': '未知',
    }
    trace_badge = ""
    if trace_method:
        label = trace_labels.get(trace_method, escape(trace_method))
        trace_badge = f'<span class="chain-trace-badge">{label}</span>'

    nodes_html = ""
    if source:
        nodes_html += f"""
            <div class="chain-node chain-node-source">
                <span class="chain-node-label">入口</span>
                <span class="chain-node-text">{escape(source)}</span>
            </div>
            <div class="chain-arrow">↓</div>
        """
    for step in (propagation or []):
        step_text = _stringify_chain_node(step)
        if step_text:
            nodes_html += f"""
            <div class="chain-node chain-node-prop">
                <span class="chain-node-label">传播</span>
                <span class="chain-node-text">{escape(step_text)}</span>
            </div>
            <div class="chain-arrow">↓</div>
        """
    if sink:
        nodes_html += f"""
            <div class="chain-node chain-node-sink">
                <span class="chain-node-label">危险点</span>
                <span class="chain-node-text">{escape(sink)}</span>
            </div>
        """

    return f"""
        <div class="issue-section">
            <div class="issue-section-title">调用链路:{trace_badge}</div>
            <div class="attack-call-chain">{nodes_html}</div>
        </div>
    """


def _format_issue_html(issue, issue_id=None):
    file_name = escape(str(issue.get("fileName", ""))) or "未知文件"
    file_path = escape(str(issue.get("filePath", "")))
    risk_type_raw = escape(str(issue.get("riskType", ""))) or "未知风险"
    risk_type = _risk_type_chinese(risk_type_raw)
    risk_level = escape(str(issue.get("riskLevel", ""))).lower() or "low"
    line_number = issue.get("lineNumber")
    description = escape(str(issue.get("description", ""))) or "无描述"
    recommendation = str(issue.get("recommendation", ""))
    risk_code = escape(str(issue.get("riskCode", "")))
    risk_confidence = _confidence_chinese(issue.get("riskConfidence", ""))
    code_snippet = escape(str(issue.get("codeSnippet", "")))
    fixed_code = escape(str(issue.get("fixedCode", "")))
    is_zero_day = issue.get("isZeroDay", False)
    
    # Generate unique ID for the issue card
    id_attr = f' id="issue-{issue_id}"' if issue_id is not None else ""

    line_display = f": {line_number}" if line_number else ""
    location = f"{file_name}{line_display}"
    risk_label = _risk_label(risk_level)
    if file_path and file_path != file_name:
        location = f"{file_path}{line_display}"

    # 0-day tag
    zero_day_tag = ""
    if is_zero_day:
        zero_day_tag = '<span class="zero-day-tag">0-day</span>'

    confidence_html = ""
    if risk_confidence and risk_confidence != "无":
        confidence_html = f'<div class="issue-info-item"><span class="issue-info-label">置信度:</span><span class="mono">{escape(str(risk_confidence))}</span></div>'

    # Build risk code block
    risk_code_block = ""
    actual_risk_code = risk_code or code_snippet
    if actual_risk_code:
        risk_code_block = f"""
            <div class="issue-section">
                <div class="issue-section-title">风险代码:</div>
                <pre class="issue-code"><code>{actual_risk_code}</code></pre>
            </div>
        """

    # Build recommendation block
    recommendation_block = ""
    recommendation_html = _format_recommendation_html(recommendation)
    if recommendation_html:
        recommendation_block = f"""
            <div class="issue-section">
                <div class="issue-section-title">修复建议:</div>
                <div class="issue-recommendation">{recommendation_html}</div>
            </div>
        """

    # Build fixed code block
    fixed_code_block = ""
    if fixed_code:
        fixed_code_block = f"""
            <div class="issue-section">
                <div class="issue-section-title">修复后代码:</div>
                <pre class="issue-code issue-code-fixed"><code>{fixed_code}</code></pre>
            </div>
        """

    # Build attack call chain block
    attack_chain_block = _format_attack_chain_html(issue.get("attackChain"))

    return f"""
        <article class="issue-card issue-{risk_level}"{id_attr}>
            <header class="issue-head">
                <div class="issue-type" title="{risk_type_raw}">{risk_type}{zero_day_tag}</div>
                <span class="severity-pill severity-{risk_level}">{risk_label}</span>
            </header>
            <div class="issue-body">
                <div class="issue-info">
                    <div class="issue-info-item"><span class="issue-info-label">位置:</span><span class="mono">{location}</span></div>
                    {confidence_html}
                </div>
                <div class="issue-section">
                    <div class="issue-section-title">风险描述:</div>
                    <p class="issue-desc">{description}</p>
                </div>
                {attack_chain_block}
                {risk_code_block}
                {recommendation_block}
                {fixed_code_block}
            </div>
        </article>
    """


def generate_html_report(report):
    """生成 HTML 格式报告"""
    metadata = report.get("metadata", {})
    summary = report.get("summary", {})
    audit_batch_id = escape(str(metadata.get("auditBatchId", "unknown") or "unknown"))
    generated_at = escape(str(metadata.get("generatedAt", "")))
    code_branch = escape(str(metadata.get("codeBranch", ""))) or "未知"
    project_name = escape(str(metadata.get("projectName", ""))) or "未知项目"
    success = report.get("success", False)
    risk_files = summary.get("riskFiles", 0)
    total_issues = summary.get("totalIssues", 0)
    critical_count = summary.get("criticalRisk", 0)
    high_count = summary.get("highRisk", 0)
    medium_count = summary.get("mediumRisk", 0)
    low_count = summary.get("lowRisk", 0)
    scope = f"{risk_files} 个风险文件 · {total_issues} 个风险"
    status_class, _, _ = _report_status(
        success, critical_count, high_count, medium_count, low_count
    )

    critical_issues = report.get("issues", {}).get("critical", [])
    high_issues = report.get("issues", {}).get("high", [])
    medium_issues = report.get("issues", {}).get("medium", [])
    low_issues = report.get("issues", {}).get("low", [])
    all_issues = report.get("allIssues", [])

    # 计算高置信度数量
    high_confidence_count = sum(1 for issue in all_issues if _is_high_confidence(issue.get("riskConfidence")))

    # Build issue ID mapping for linking from the issues table
    issue_id_map = {}
    for idx, issue in enumerate(all_issues):
        issue_id_map[id(issue)] = issue.get("issueId", idx)

    critical_html = "\n".join(_format_issue_html(i, i.get("issueId", issue_id_map.get(id(i)))) for i in critical_issues) or "<p class=\"empty-state\">暂无严重风险。</p>"
    high_html = "\n".join(_format_issue_html(i, i.get("issueId", issue_id_map.get(id(i)))) for i in high_issues) or "<p class=\"empty-state\">暂无高危风险。</p>"
    medium_html = "\n".join(_format_issue_html(i, i.get("issueId", issue_id_map.get(id(i)))) for i in medium_issues) or "<p class=\"empty-state\">暂无中危风险。</p>"
    low_html = "\n".join(_format_issue_html(i, i.get("issueId", issue_id_map.get(id(i)))) for i in low_issues) or "<p class=\"empty-state\">暂无低危风险。</p>"

    risk_type_stats = {}
    for issue in all_issues:
        risk_type = issue.get("riskType") or "未知风险"
        entry = risk_type_stats.setdefault(risk_type, {"count": 0, "max_level": "low"})
        entry["count"] += 1
        level = (issue.get("riskLevel") or "").lower()
        if level in ("critical", "严重"):
            entry["max_level"] = "critical"
        elif level in ("high", "高") and entry["max_level"] not in ("critical",):
            entry["max_level"] = "high"
        elif level in ("medium", "中") and entry["max_level"] == "low":
            entry["max_level"] = "medium"

    risk_type_rows = ""
    _severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    for risk_type, stats in sorted(risk_type_stats.items(), key=lambda x: (_severity_order.get(x[1]["max_level"], 9), -x[1]["count"])):
        risk_type_rows += f"""
            <tr>
                <td>{escape(str(risk_type))}</td>
                <td>{stats["count"]}</td>
                <td><span class="severity-pill severity-{stats["max_level"]}">{_risk_label(stats["max_level"])}</span></td>
            </tr>
        """
    if not risk_type_rows:
        risk_type_rows = "<tr><td colspan=\"3\" class=\"empty-state\">暂无风险类型统计</td></tr>"

    all_issues_rows = ""
    for idx, issue in enumerate(all_issues):
        issue_id = issue.get("issueId", idx)
        file_name = escape(str(issue.get("fileName", ""))) or "未知文件"
        file_path = escape(str(issue.get("filePath", "")))
        risk_type = str(issue.get("riskType", "")) or "未知风险"
        risk_type_cn = _risk_type_chinese(risk_type)
        risk_level = escape(str(issue.get("riskLevel", ""))).lower() or "low"
        line_number = issue.get("lineNumber") or "无"
        description = escape(str(issue.get("description", ""))) or "无"
        risk_confidence = escape(_confidence_chinese(issue.get("riskConfidence", "")))
        is_zero_day = issue.get("isZeroDay", False)
        zero_day_td = '<span class="zero-day-tag">0-day</span>' if is_zero_day else ''

        # 判断置信度等级（用于筛选）
        confidence_level = "high" if _is_high_confidence(issue.get("riskConfidence")) else "all"

        all_issues_rows += f"""
            <tr class="issue-row" data-issue-id="{issue_id}" data-confidence="{confidence_level}" data-risk-level="{risk_level}" onclick="openIssueModal({issue_id})">
                <td><span class="mono">{file_path or file_name}</span></td>
                <td title="{escape(risk_type)}">{escape(risk_type_cn)}{zero_day_td}</td>
                <td><span class="severity-pill severity-{risk_level}">{_risk_label(risk_level)}</span></td>
                <td><span class="mono">{line_number}</span></td>
                <td>{risk_confidence}</td>
                <td>{description}</td>
            </tr>
        """
    if not all_issues_rows:
        all_issues_rows = "<tr><td colspan=\"6\" class=\"empty-state\">暂无风险详情</td></tr>"

    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>代码安全审查报告 - {audit_batch_id}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;600;700&family=Spectral:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

        :root {{
            --paper: #f7f2e8;
            --paper-2: #fcfaf5;
            --ink: #1b1a17;
            --muted: #6e665c;
            --border: #e1d7c6;
            --accent: #1f3a5f;
            --accent-soft: rgba(31, 58, 95, 0.16);
            --high: #b23a2f;
            --critical: #7b1a1a;
            --medium: #d08a27;
            --low: #2f7e59;
            --shadow: 0 24px 60px rgba(17, 14, 10, 0.18);
            --mono: "JetBrains Mono", "Fira Code", monospace;
            --display: "Chakra Petch", "Trebuchet MS", sans-serif;
            --body: "Spectral", "Noto Serif SC", "Songti SC", serif;
        }}

        * {{
            box-sizing: border-box;
        }}

        body {{
            margin: 0;
            font-family: var(--body);
            color: var(--ink);
            background-color: #fff;
            padding: 32px;
            line-height: 1.6;
        }}

        .report {{
            max-width: 1280px;
            margin: 0 auto;
            background: var(--paper-2);
            border: 1px solid var(--border);
            border-radius: 18px;
            padding: 36px;
            box-shadow: var(--shadow);
            position: relative;
            overflow: hidden;
        }}

        .report[data-risk="critical"] {{
            --accent: var(--critical);
            --accent-soft: rgba(123, 26, 26, 0.14);
        }}

        .report[data-risk="high"] {{
            --accent: var(--high);
            --accent-soft: rgba(178, 58, 47, 0.14);
        }}

        .report[data-risk="medium"] {{
            --accent: var(--medium);
            --accent-soft: rgba(208, 138, 39, 0.16);
        }}

        .report[data-risk="low"] {{
            --accent: var(--low);
            --accent-soft: rgba(47, 126, 89, 0.16);
        }}

        .report[data-risk="clean"] {{
            --accent: var(--low);
            --accent-soft: rgba(47, 126, 89, 0.16);
        }}

        .report[data-risk="failed"] {{
            --accent: var(--high);
            --accent-soft: rgba(178, 58, 47, 0.18);
        }}

        .report-header {{
            display: grid;
            grid-template-columns: 1fr;
            gap: 32px;
            border-bottom: 2px solid var(--accent);
            padding-bottom: 24px;
            margin-bottom: 28px;
        }}

        .kicker {{
            font-family: var(--display);
            text-transform: uppercase;
            letter-spacing: 0.2em;
            font-size: 0.72rem;
            color: var(--muted);
            margin-bottom: 12px;
        }}

        h1 {{
            font-family: var(--display);
            font-size: 2.4rem;
            margin: 0 0 8px;
        }}

        .subtitle {{
            margin: 0 0 20px;
            color: var(--muted);
            font-size: 1rem;
        }}

        .meta-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 12px 20px;
            font-size: 0.9rem;
        }}

        .meta-item {{
            display: flex;
            flex-direction: column;
            gap: 4px;
        }}

        .meta-label {{
            color: var(--muted);
            font-size: 0.75rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            font-family: var(--display);
        }}

        .meta-value {{
            font-weight: 600;
        }}

        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 16px;
            margin-bottom: 28px;
        }}

        .metric {{
            background: #fff;
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 18px;
            text-align: center;
            box-shadow: 0 8px 18px rgba(24, 19, 13, 0.08);
        }}

        .metric-value {{
            font-family: var(--display);
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 6px;
        }}

        .metric-label {{
            color: var(--muted);
            font-size: 0.85rem;
        }}

        .metric.high .metric-value {{ color: var(--high); }}
        .metric.critical .metric-value {{ color: var(--critical); }}
        .metric.medium .metric-value {{ color: var(--medium); }}
        .metric.low .metric-value {{ color: var(--low); }}

        .metric.clickable {{
            cursor: pointer;
            transition: transform 0.15s ease, box-shadow 0.15s ease;
        }}

        .metric.clickable:hover {{
            transform: translateY(-2px);
            box-shadow: 0 12px 28px rgba(24, 19, 13, 0.15);
        }}

        .section-title {{
            font-family: var(--display);
            font-size: 1.5rem;
            margin: 0 0 14px;
            border-left: 4px solid var(--accent);
            padding-left: 12px;
        }}

        .section-title.section-title-lg {{
            font-size: 1.9rem;
            margin-bottom: 18px;
        }}

        .section-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 28px;
        }}

        .card {{
            background: #fff;
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 18px;
            box-shadow: 0 10px 24px rgba(24, 19, 13, 0.08);
        }}

        section.card + section.card {{
            margin-top: 28px;
        }}

        .card-header {{
            font-family: var(--display);
            font-size: 1.1rem;
            margin-bottom: 12px;
            color: var(--ink);
        }}

        .data-table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9rem;
        }}

        .data-table th,
        .data-table td {{
            padding: 10px 12px;
            border-bottom: 1px solid var(--border);
            text-align: left;
            vertical-align: top;
        }}

        .data-table th {{
            font-family: var(--display);
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--muted);
        }}

        .data-table th.sortable {{
            cursor: pointer;
            user-select: none;
            position: relative;
            padding-right: 24px;
            transition: color 0.2s ease, background-color 0.2s ease;
        }}

        .data-table th.sortable:hover {{
            color: var(--ink);
            background-color: var(--accent-soft);
        }}

        .data-table th.sortable::after {{
            content: '⇅';
            position: absolute;
            right: 8px;
            opacity: 0.4;
            font-size: 0.7rem;
        }}

        .data-table th.sortable.asc::after {{
            content: '↑';
            opacity: 1;
            color: var(--accent);
        }}

        .data-table th.sortable.desc::after {{
            content: '↓';
            opacity: 1;
            color: var(--accent);
        }}

        .data-table tbody tr:nth-child(even) {{
            background: rgba(247, 242, 232, 0.6);
        }}

        .data-table tbody tr.issue-row {{
            cursor: pointer;
            transition: background-color 0.2s ease;
        }}

        .data-table tbody tr.issue-row:hover {{
            background: var(--accent-soft);
        }}

        .issue-card.highlight {{
            animation: highlight-pulse 2s ease-out;
        }}

        @keyframes highlight-pulse {{
            0% {{
                box-shadow: 0 0 0 4px var(--accent);
            }}
            100% {{
                box-shadow: 0 8px 20px rgba(24, 19, 13, 0.08);
            }}
        }}

        /* Modal */
        .modal-overlay {{
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.45);
            z-index: 1000;
            justify-content: center;
            align-items: center;
            padding: 24px;
            backdrop-filter: blur(4px);
        }}

        .modal-overlay.active {{
            display: flex;
        }}

        .modal-box {{
            background: var(--paper-2);
            border-radius: 18px;
            max-width: 780px;
            width: 100%;
            max-height: 85vh;
            overflow-y: auto;
            box-shadow: 0 24px 64px rgba(24, 19, 13, 0.25);
            position: relative;
            animation: modal-in 0.25s ease-out;
        }}

        @keyframes modal-in {{
            from {{ opacity: 0; transform: translateY(16px) scale(0.97); }}
            to   {{ opacity: 1; transform: translateY(0) scale(1); }}
        }}

        .modal-close {{
            position: sticky;
            top: 0;
            display: flex;
            justify-content: flex-end;
            padding: 12px 16px 0;
            z-index: 1;
        }}

        .modal-close-btn {{
            width: 36px;
            height: 36px;
            border: none;
            border-radius: 50%;
            background: var(--border);
            color: var(--ink);
            font-size: 1.2rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }}

        .modal-close-btn:hover {{
            background: var(--muted);
            color: #fff;
        }}

        .modal-body {{
            padding: 4px 24px 24px;
        }}

        .modal-body .issue-card {{
            margin-bottom: 0;
            box-shadow: none;
        }}

        .mono {{
            font-family: var(--mono);
            font-size: 0.82rem;
        }}

        .empty-state {{
            color: var(--muted);
            font-style: italic;
        }}

        .issues-block {{
            margin: 40px 0 32px;
        }}

        .group-title {{
            font-family: var(--display);
            font-size: 1.1rem;
            margin: 20px 0 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }}

        .issue-card {{
            border: 1px solid var(--border);
            border-left: 6px solid var(--accent);
            border-radius: 14px;
            padding: 16px 18px;
            background: #fff;
            margin-bottom: 16px;
            box-shadow: 0 8px 20px rgba(24, 19, 13, 0.08);
        }}

        .issue-card.issue-critical {{
            border-left-color: var(--critical);
            background: #fff2f0;
        }}

        .issue-card.issue-high {{
            border-left-color: var(--high);
            background: #fff6f4;
        }}

        .issue-card.issue-medium {{
            border-left-color: var(--medium);
            background: #fff8ea;
        }}

        .issue-card.issue-low {{
            border-left-color: var(--low);
            background: #f4fbf7;
        }}

        .issue-head {{
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: center;
            margin-bottom: 14px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--border);
        }}

        .issue-type {{
            font-family: var(--display);
            font-size: 1.15rem;
            font-weight: 700;
        }}

        .issue-info {{
            display: flex;
            flex-direction: column;
            gap: 14px;
            margin-bottom: 14px;
            font-size: 0.9rem;
        }}

        .issue-info-item {{
            display: flex;
            flex-direction: column;
            gap: 4px;
        }}

        .issue-info-label {{
            font-family: var(--display);
            color: #1a1a1a;
            font-weight: 600;
            font-size: 0.9rem;
        }}

        .issue-section {{
            margin-bottom: 14px;
        }}

        .issue-section:last-child {{
            margin-bottom: 0;
        }}

        .issue-section-title {{
            font-family: var(--display);
            font-size: 0.9rem;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 4px;
        }}

        .issue-desc {{
            margin: 0;
            line-height: 1.7;
        }}

        .issue-code {{
            margin: 0;
            padding: 14px;
            background: #1f1c18;
            color: #f5efe6;
            border-radius: 10px;
            font-family: var(--mono);
            font-size: 0.82rem;
            overflow-x: auto;
            border: 1px solid var(--border);
        }}

        .issue-code-fixed {{
            background: #1a2e1a;
            border-color: var(--low);
        }}

        .issue-recommendation {{
            background: #e8f5e9;
            border-left: 4px solid var(--low);
            padding: 12px 14px;
            border-radius: 10px;
        }}

        .issue-recommendation p {{
            margin: 0 0 8px;
        }}

        .issue-recommendation p:last-child {{
            margin-bottom: 0;
        }}

        .severity-pill {{
            display: inline-flex;
            align-items: center;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 0.75rem;
            font-family: var(--display);
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: #fff;
            background: var(--accent);
        }}

        .severity-critical {{ background: var(--critical); }}
        .severity-high {{ background: var(--high); }}
        .severity-medium {{ background: var(--medium); }}
        .severity-low {{ background: var(--low); }}

        .zero-day-tag {{
            display: inline-flex;
            align-items: center;
            padding: 2px 8px;
            border-radius: 6px;
            font-size: 0.65rem;
            font-family: var(--display);
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #fff;
            background: linear-gradient(135deg, #6b21a8, #9333ea);
            margin-left: 8px;
            vertical-align: middle;
        }}

        /* 单漏洞调用链流程图 */
        .attack-call-chain {{
            display: flex;
            flex-direction: column;
            padding: 10px 12px;
            background: #f9f7f3;
            border: 1px solid var(--border);
            border-radius: 10px;
        }}

        .chain-node {{
            display: flex;
            align-items: flex-start;
            gap: 8px;
            padding: 6px 10px;
            border-radius: 6px;
            font-family: var(--mono);
            font-size: 0.82rem;
            line-height: 1.5;
        }}

        .chain-node-source {{
            background: rgba(31, 58, 95, 0.10);
            border-left: 3px solid var(--accent);
        }}

        .chain-node-prop {{
            background: rgba(0, 0, 0, 0.04);
            border-left: 3px solid var(--border);
            margin-left: 16px;
        }}

        .chain-node-sink {{
            background: rgba(178, 58, 47, 0.10);
            border-left: 3px solid var(--high);
        }}

        .chain-node-label {{
            flex-shrink: 0;
            font-family: var(--display);
            font-size: 0.65rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            padding: 1px 6px;
            border-radius: 4px;
            margin-top: 2px;
            white-space: nowrap;
        }}

        .chain-node-source .chain-node-label {{
            background: var(--accent);
            color: #fff;
        }}

        .chain-node-prop .chain-node-label {{
            background: var(--muted);
            color: #fff;
        }}

        .chain-node-sink .chain-node-label {{
            background: var(--high);
            color: #fff;
        }}

        .chain-node-text {{
            word-break: break-all;
            color: var(--ink);
        }}

        .chain-arrow {{
            text-align: left;
            color: var(--muted);
            font-size: 0.9rem;
            line-height: 1;
            padding: 3px 0 3px 22px;
            user-select: none;
        }}

        .chain-trace-badge {{
            display: inline-flex;
            align-items: center;
            padding: 1px 8px;
            border-radius: 999px;
            font-size: 0.7rem;
            font-family: var(--display);
            background: var(--accent-soft);
            color: var(--accent);
            margin-left: 6px;
            vertical-align: middle;
            font-weight: 600;
        }}

        .advice {{
            background: var(--accent-soft);
            border-left: 4px solid var(--accent);
            padding: 12px 14px;
            border-radius: 10px;
            margin-bottom: 12px;
        }}

        .advice-title {{
            font-family: var(--display);
            font-size: 0.85rem;
            margin-bottom: 6px;
        }}

        .code-stack {{
            display: grid;
            gap: 12px;
        }}

        .code-block {{
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 0;
            overflow: hidden;
            background: #1f1c18;
        }}

        .code-block summary {{
            cursor: pointer;
            padding: 10px 12px;
            font-family: var(--display);
            color: #f5efe6;
            background: rgba(255, 255, 255, 0.08);
        }}

        .code-block pre {{
            margin: 0;
            padding: 14px;
            color: #f5efe6;
            font-family: var(--mono);
            font-size: 0.82rem;
            overflow-x: auto;
        }}

        .inline-details summary {{
            cursor: pointer;
            font-family: var(--display);
            font-size: 0.8rem;
        }}

        .inline-details pre {{
            margin-top: 8px;
            background: #1f1c18;
            color: #f5efe6;
            padding: 12px;
            border-radius: 8px;
            font-family: var(--mono);
            font-size: 0.78rem;
        }}

        .filter-tags {{
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }}

        .filter-tag {{
            display: inline-flex;
            align-items: center;
            padding: 8px 16px;
            border-radius: 8px;
            border: 1px solid var(--border);
            background: #fff;
            color: var(--ink);
            font-family: var(--display);
            font-size: 0.85rem;
            font-weight: 600;
            letter-spacing: 0.06em;
            cursor: pointer;
            transition: all 0.2s ease;
            user-select: none;
        }}

        .filter-tag:hover {{
            background: var(--accent-soft);
            color: var(--accent);
            border-color: var(--accent);
        }}

        .filter-tag.active {{
            background: var(--accent);
            color: #fff;
            border-color: var(--accent);
        }}

        .filter-tag-label {{
            display: inline-block;
        }}

        .table-scroll {{
            overflow-x: auto;
        }}

        .report-footer {{
            margin-top: 32px;
            padding-top: 18px;
            border-top: 1px solid var(--border);
            text-align: center;
            font-size: 0.9rem;
            color: var(--muted);
        }}

        @media (max-width: 980px) {{
            body {{ padding: 20px; }}
            .report {{ padding: 24px; }}
            .report-header {{
                grid-template-columns: 1fr;
            }}
        }}

        @media (max-width: 720px) {{
            h1 {{ font-size: 2rem; }}
            .metrics-grid {{
                grid-template-columns: 1fr;
            }}
        }}

        @media print {{
            body {{
                background: #fff;
                padding: 0;
            }}
            .report {{
                box-shadow: none;
                border: none;
                padding: 0;
            }}
            .issue-card {{
                page-break-inside: avoid;
            }}
        }}
    </style>
</head>
<body>
    <div class="report" data-risk="{status_class}">
        <header class="report-header">
            <div class="header-main">
                <h1>代码安全审查报告</h1>
                <p class="subtitle">{project_name} · {scope}</p>
                <div class="meta-grid">
                    <div class="meta-item">
                        <span class="meta-label">生成时间</span>
                        <span class="meta-value">{generated_at}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">项目名称</span>
                        <span class="meta-value">{project_name}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">审计批次</span>
                        <span class="meta-value">{audit_batch_id}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">代码分支</span>
                        <span class="meta-value">{code_branch}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">生成状态</span>
                        <span class="meta-value">{"成功" if success else "失败"}</span>
                    </div>
                </div>
            </div>
        </header>

        <section class="metrics-grid">
            <div class="metric">
                <div class="metric-value">{risk_files}</div>
                <div class="metric-label">风险文件数</div>
            </div>
            <div class="metric clickable" onclick="filterRiskTable('all')">
                <div class="metric-value">{total_issues}</div>
                <div class="metric-label">风险总数</div>
            </div>
            <div class="metric critical clickable" onclick="filterRiskTableByLevel('critical')">
                <div class="metric-value">{critical_count}</div>
                <div class="metric-label">严重风险</div>
            </div>
            <div class="metric high clickable" onclick="filterRiskTableByLevel('high')">
                <div class="metric-value">{high_count}</div>
                <div class="metric-label">高危风险</div>
            </div>
            <div class="metric medium clickable" onclick="filterRiskTableByLevel('medium')">
                <div class="metric-value">{medium_count}</div>
                <div class="metric-label">中等风险</div>
            </div>
            <div class="metric low clickable" onclick="filterRiskTableByLevel('low')">
                <div class="metric-value">{low_count}</div>
                <div class="metric-label">低危风险</div>
            </div>
        </section>

        <section class="section-grid">
            <div class="card">
                <div class="card-header">风险类型分布</div>
                <div class="table-scroll">
                    <table class="data-table" id="risk-type-table">
                        <thead>
                            <tr>
                                <th class="sortable" data-sort="string" onclick="sortTable(this, 0)">风险类型</th>
                                <th class="sortable" data-sort="number" onclick="sortTable(this, 1)">数量</th>
                                <th class="sortable" data-sort="severity" onclick="sortTable(this, 2)">严重程度</th>
                            </tr>
                        </thead>
                        <tbody>
                            {risk_type_rows}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

        <section class="card" id="risk-list-section">
            <div class="card-header">风险列表</div>
            <div class="filter-tags">
                <button class="filter-tag active" data-filter="high" onclick="filterRiskTable('high')">
                    <span class="filter-tag-label">高置信度</span>
                </button>
                <button class="filter-tag" data-filter="all" onclick="filterRiskTable('all')">
                    <span class="filter-tag-label">全部</span>
                </button>
                <button class="filter-tag" data-filter="level-critical" onclick="filterRiskTableByLevel('critical')">
                    <span class="filter-tag-label">严重</span>
                </button>
                <button class="filter-tag" data-filter="level-high" onclick="filterRiskTableByLevel('high')">
                    <span class="filter-tag-label">高危</span>
                </button>
                <button class="filter-tag" data-filter="level-medium" onclick="filterRiskTableByLevel('medium')">
                    <span class="filter-tag-label">中危</span>
                </button>
                <button class="filter-tag" data-filter="level-low" onclick="filterRiskTableByLevel('low')">
                    <span class="filter-tag-label">低危</span>
                </button>
            </div>
            <div class="table-scroll">
                <table class="data-table" id="risk-list-table">
                    <thead>
                        <tr>
                            <th class="sortable" data-sort="string" onclick="sortTable(this, 0)">文件</th>
                            <th class="sortable" data-sort="string" onclick="sortTable(this, 1)">风险类型</th>
                            <th class="sortable" data-sort="severity" onclick="sortTable(this, 2)">级别</th>
                            <th class="sortable" data-sort="number" onclick="sortTable(this, 3)">行号</th>
                            <th class="sortable" data-sort="number" onclick="sortTable(this, 4)">置信度</th>
                            <th class="sortable" data-sort="string" onclick="sortTable(this, 5)">描述</th>
                        </tr>
                    </thead>
                    <tbody>
                        {all_issues_rows}
                    </tbody>
                </table>
            </div>
        </section>

        <section class="issues-block">
            <h2 class="section-title section-title-lg">详细风险列表</h2>
            <h3 class="group-title">🔴 严重风险</h3>
            {critical_html}
            <h3 class="group-title">🟠 高危风险</h3>
            {high_html}
            <h3 class="group-title">🟡 中危风险</h3>
            {medium_html}
            <h3 class="group-title">🟢 低危风险</h3>
            {low_html}
        </section>

        <div class="modal-overlay" id="issueModal" onclick="closeIssueModal()">
            <div class="modal-box" onclick="event.stopPropagation()">
                <div class="modal-close"><button class="modal-close-btn" onclick="closeIssueModal()">&times;</button></div>
                <div class="modal-body" id="issueModalBody"></div>
            </div>
        </div>

        <footer class="report-footer">
            <div>内容由 AI 生成，仅供参考</div>
            <div style="margin-top: 8px;">联系人: thonwang</div>
            <div style="margin-top: 4px;">问题反馈: <a href="https://git.woa.com/CSIGCodeSec/marketplace/issues" target="_blank" style="color: var(--accent);">https://git.woa.com/CSIGCodeSec/marketplace/issues</a></div>
        </footer>
    </div>
    <script>
        function openIssueModal(issueId) {{
            var source = document.getElementById('issue-' + issueId);
            if (!source) return;
            var body = document.getElementById('issueModalBody');
            while (body.firstChild) body.removeChild(body.firstChild);
            var clone = source.cloneNode(true);
            clone.removeAttribute('id');
            body.appendChild(clone);
            document.getElementById('issueModal').classList.add('active');
            document.body.style.overflow = 'hidden';
        }}

        function closeIssueModal() {{
            document.getElementById('issueModal').classList.remove('active');
            document.body.style.overflow = '';
        }}

        document.addEventListener('keydown', function(e) {{
            if (e.key === 'Escape') closeIssueModal();
        }});

        function sortTable(header, columnIndex) {{
            const table = header.closest('table');
            const tbody = table.querySelector('tbody');
            const rows = Array.from(tbody.querySelectorAll('tr'));
            const sortType = header.dataset.sort || 'string';
            
            // Severity order mapping (critical > high > medium > low)
            const severityOrder = {{
                '严重': 4, 'critical': 4, 'CRITICAL': 4,
                '高': 3, 'high': 3, 'HIGH': 3,
                '中': 2, 'medium': 2, 'MEDIUM': 2,
                '低': 1, 'low': 1, 'LOW': 1
            }};
            
            // Check if already sorted and determine direction
            const isAsc = header.classList.contains('asc');
            const direction = isAsc ? -1 : 1;
            
            // Remove sort classes from all headers in this table
            table.querySelectorAll('th.sortable').forEach(th => {{
                th.classList.remove('asc', 'desc');
            }});
            
            // Add appropriate class to current header
            header.classList.add(isAsc ? 'desc' : 'asc');
            
            // Sort rows
            rows.sort((a, b) => {{
                const aCell = a.cells[columnIndex];
                const bCell = b.cells[columnIndex];
                
                if (!aCell || !bCell) return 0;
                
                let aVal = aCell.textContent.trim();
                let bVal = bCell.textContent.trim();
                
                if (sortType === 'number') {{
                    aVal = parseFloat(aVal) || 0;
                    bVal = parseFloat(bVal) || 0;
                    return (aVal - bVal) * direction;
                }} else if (sortType === 'severity') {{
                    aVal = severityOrder[aVal] || 0;
                    bVal = severityOrder[bVal] || 0;
                    return (aVal - bVal) * direction;
                }} else {{
                    return aVal.localeCompare(bVal, 'zh-CN') * direction;
                }}
            }});
            
            // Re-append sorted rows
            rows.forEach(row => tbody.appendChild(row));
        }}

        function filterRiskTable(filterType, scroll) {{
            const table = document.getElementById('risk-list-table');
            const rows = table.querySelectorAll('tbody tr');
            const filterButtons = document.querySelectorAll('.filter-tag');

            // 更新按钮状态（同时清除 level 过滤的 active 状态）
            filterButtons.forEach(btn => {{
                btn.classList.remove('active');
                if (btn.dataset.filter === filterType) {{
                    btn.classList.add('active');
                }}
            }});

            // 过滤行
            rows.forEach(row => {{
                const confidence = row.dataset.confidence;
                if (filterType === 'high') {{
                    row.style.display = confidence === 'high' ? '' : 'none';
                }} else {{
                    row.style.display = '';
                }}
            }});

            // 滚动到风险列表
            if (scroll !== false) {{
                document.getElementById('risk-list-section').scrollIntoView({{ behavior: 'smooth', block: 'start' }});
            }}
        }}

        function filterRiskTableByLevel(level) {{
            const table = document.getElementById('risk-list-table');
            const rows = table.querySelectorAll('tbody tr');
            const filterButtons = document.querySelectorAll('.filter-tag');

            // 更新按钮状态（同时清除 confidence 过滤的 active 状态）
            filterButtons.forEach(btn => {{
                btn.classList.remove('active');
                if (btn.dataset.filter === 'level-' + level) {{
                    btn.classList.add('active');
                }}
            }});

            // 按风险级别过滤
            rows.forEach(row => {{
                const riskLevel = row.dataset.riskLevel;
                row.style.display = riskLevel === level ? '' : 'none';
            }});

            // 滚动到风险列表
            document.getElementById('risk-list-section').scrollIntoView({{ behavior: 'smooth', block: 'start' }});
        }}
        
        // 页面加载时初始化过滤（默认显示高置信度）
        document.addEventListener('DOMContentLoaded', function() {{
            filterRiskTable('high', false);
        }});
    </script>
</body>
</html>
"""


def main():
    parser = argparse.ArgumentParser(
        description="根据代码审计结果生成 JSON 或 HTML 报告",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  # 从审计目录生成报告
  %(prog)s --input security-scan-output/audit-20250103120000

  # 使用审计批次 ID 自动查找目录
  %(prog)s --audit-batch-id audit-20250103120000

  # 输出 JSON 到文件
  %(prog)s --input security-scan-output/audit-20250103120000 --output report.json

  # 输出 HTML 到文件（保存在 security-scan-output 下）
  %(prog)s --audit-batch-id audit-20250103120000 --format html \\
    --output security-scan-output/audit-20250103120000/report.html
        """
    )

    parser.add_argument('--input', help='输入路径（JSON 文件或审计目录）')
    parser.add_argument('--audit-batch-id', help='审计批次 ID（用于自动定位目录）')
    parser.add_argument('--output', help='输出 JSON 文件路径（默认输出到 stdout）')
    parser.add_argument('--format', choices=['json', 'html'], default='json',
                        help='报告输出格式（默认: json）')
    parser.add_argument('--quiet', action='store_true', help='静默模式（不输出日志）')
    parser.add_argument('--pretty', action='store_true', default=True,
                       help='格式化 JSON 输出（默认: True）')
    parser.add_argument('--compact', action='store_true',
                       help='紧凑 JSON 输出（单行）')

    args = parser.parse_args()

    if args.quiet:
        Colors.HEADER = Colors.BLUE = Colors.CYAN = Colors.GREEN = ''
        Colors.WARNING = Colors.FAIL = Colors.ENDC = Colors.BOLD = ''

    if not args.input and not args.audit_batch_id:
        print_colored("[FAIL] 请指定 --input 或 --audit-batch-id", Colors.FAIL)
        sys.exit(1)

    try:
        # 加载审计结果
        resolved_input = resolve_input_path(args.input, args.audit_batch_id)
        input_for_load = str(resolved_input) if resolved_input else args.input
        results, summary = load_audit_results(input_for_load, args.audit_batch_id)
        ensure_summary_file(resolved_input, summary)

        if not results:
            raise ValueError("未找到审计结果")

        if not args.quiet:
            print_colored(f"[OK] 加载了 {len(results)} 个审计结果", Colors.GREEN)

        # 生成报告
        base_path = resolve_git_base(args.input)
        code_branch = get_git_branch(base_path) or "未知"
        project_name = get_git_project_name(base_path) or "未知项目"
        report = generate_json_report(results, summary, code_branch=code_branch, project_name=project_name)

        output_format = args.format
        if args.output and args.output.lower().endswith(".html"):
            output_format = "html"

        if output_format == "html":
            html_output = generate_html_report(report)
            if not args.output:
                output_name = f"security-scan-report-{summary.get('auditBatchId', 'unknown')}.html"
                args.output = os.path.join(os.getcwd(), output_name)
            output_path = os.path.abspath(args.output)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(html_output)
            if not args.quiet:
                print_colored(f"[OK] 报告已保存: {output_path}", Colors.GREEN)
        else:
            # 输出 JSON
            indent = None if args.compact else 2
            json_output = json.dumps(report, ensure_ascii=False, indent=indent)

            if args.output:
                output_path = os.path.abspath(args.output)
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(json_output)
                if not args.quiet:
                    print_colored(f"[OK] 报告已保存: {output_path}", Colors.GREEN)
            else:
                print(json_output)

    except Exception as e:
        error_report = {"success": False, "error": str(e)}
        print(json.dumps(error_report, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print_colored("\n\n[WARN] 用户中断操作", Colors.WARNING)
        sys.exit(130)
    except Exception as e:
        print_colored(f"\n[FAIL] 未预期的错误: {e}", Colors.FAIL)
        import traceback
        traceback.print_exc()
        sys.exit(1)
