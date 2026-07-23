#!/usr/bin/env python3
"""
审计结果合并脚本：将多个 agent 的审计输出合并、去重、校验，减少编排器上下文消耗

子命令：
  merge-scan     合并扫描阶段所有 agent 输出（格式校验 + 去重 + 分配 findingId）
  merge-verify   合并验证阶段结果（代码存在性校验 + 攻击链验证 + 对抗审查 + 全局审计质量评估 + 置信度评分）
  merge-batches  合并多个批次的 batch-N-result.json（全局去重 + findingId 重分配）

  兼容别名：merge-stage2 → merge-scan, merge-stage3 → merge-verify

设计原则：
  - 完整结果写入文件，stdout 仅输出机器可读的 JSON 摘要供编排器解析
  - 日志信息输出到 stderr，不污染 stdout
  - 缺失可选输入文件时降级处理，不中断流程
"""
import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path


# ---------------------------------------------------------------------------
# 常量
# ---------------------------------------------------------------------------

# 风险类型中文 → slug 映射
RISK_TYPE_SLUG = {
    "SQL 注入": "sql-injection",
    "命令注入": "command-injection",
    "路径遍历": "path-traversal",
    "访问控制缺失": "access-control",
    "敏感信息泄露": "information-leak",
    "弱加密算法": "weak-crypto",
    "敏感端点暴露": "endpoint-exposure",
    "硬编码凭证": "hardcoded-secret",
    "高危漏洞": "vulnerable-dependency",
    "高危组件漏洞": "vulnerable-dependency",
    "供应链漏洞": "vulnerable-dependency",
    "vulnerable-dependency": "vulnerable-dependency",
    "CSV 注入": "csv-injection",
    "拒绝服务": "denial-of-service",
    "不安全反序列化": "insecure-deserialization",
    "SSRF": "ssrf",
    "XSS": "xss",
    # --- 以下为 agent 高频产出的中文 riskType 归一化映射 ---
    "硬编码密钥": "hardcoded-secret",
    "硬编码秘钥": "hardcoded-secret",
    "hardcoded-secret": "hardcoded-secret",
    "缺少认证机制": "missing-auth",
    "缺少认证": "missing-auth",
    "认证缺失": "missing-auth",
    "missing-auth": "missing-auth",
    "缺少安全头": "missing-security-headers",
    "missing-security-headers": "missing-security-headers",
    "缺少速率限制": "missing-rate-limit",
    "missing-rate-limit": "missing-rate-limit",
    "不安全的npm源": "insecure-npm-registry",
    "不安全的puppeteer配置": "insecure-puppeteer-config",
    "不安全的Puppeteer配置": "insecure-puppeteer-config",
    "弱密码学": "weak-crypto",
    "weak-cryptography": "weak-crypto",
    "信息泄露": "information-disclosure",
    "information-disclosure": "information-disclosure",
    "不安全配置": "insecure-configuration",
    "insecure-configuration": "insecure-configuration",
    "ssrf": "ssrf",
    "command-injection": "command-injection",
    "ssrf-defense-disabled": "ssrf-defense-disabled",
    "SSRF防御禁用": "ssrf-defense-disabled",
    "SSRF防御被禁用": "ssrf-defense-disabled",
}

SLUG_RISK_TYPE = {v: k for k, v in RISK_TYPE_SLUG.items()}

SEVERITY_ORDER = {"critical": 4, "high": 3, "medium": 2, "low": 1}

# 语义分析 agent（需要检查 traceMethod）
SEMANTIC_AGENTS = {"vulnerability-audit", "logic-defect-audit", "deep-scan"}


# ---------------------------------------------------------------------------
# attackChain 验证
# ---------------------------------------------------------------------------


def _is_valid_chain_node(node):
    """Check if a chain node (source/sink) is valid.

    Accepts two formats:
      - string: non-empty string (e.g. "src/routes.js:39")
      - object: dict with at least a 'file' key (e.g. {"file": "src/routes.js", "line": 39, "code": "..."})
    """
    if isinstance(node, str):
        return bool(node.strip())
    if isinstance(node, dict):
        return bool(node.get('file'))
    return False


def validate_attack_chain(chain):
    """Validate attackChain conforms to schema. Returns (valid, reason).

    source/sink accept both string and object {"file", "line", "code"} formats,
    since deep-scan produces structured objects while quick-scan uses strings.
    """
    if not isinstance(chain, dict):
        return False, "attackChain is not a dict"
    source = chain.get('source')
    if not _is_valid_chain_node(source):
        return False, "missing or empty source"
    propagation = chain.get('propagation')
    if not isinstance(propagation, list):
        return False, "propagation is not a list"
    sink = chain.get('sink')
    if not _is_valid_chain_node(sink):
        return False, "missing or empty sink"
    trace = chain.get('traceMethod')
    if not trace or not isinstance(trace, str):
        return False, "missing traceMethod"
    return True, ""


# ---------------------------------------------------------------------------
# 日志工具
# ---------------------------------------------------------------------------

class Colors:
    """终端颜色输出"""
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'


def log_info(msg):
    print(f"{Colors.CYAN}[merge] {msg}{Colors.ENDC}", file=sys.stderr)


def log_ok(msg):
    print(f"{Colors.GREEN}[merge] {msg}{Colors.ENDC}", file=sys.stderr)


def log_warn(msg):
    print(f"{Colors.WARNING}[merge] [WARN] {msg}{Colors.ENDC}", file=sys.stderr)


def log_error(msg):
    print(f"{Colors.FAIL}[merge] ✗ {msg}{Colors.ENDC}", file=sys.stderr)


def stdout_json(data):
    """将摘要 JSON 输出到 stdout 供编排器解析"""
    print(json.dumps(data, ensure_ascii=False))


# ---------------------------------------------------------------------------
# 通用工具
# ---------------------------------------------------------------------------

def load_json_file(path):
    """安全加载 JSON 文件，失败返回 None"""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return None
    except json.JSONDecodeError as e:
        log_warn(f"JSON 解析失败: {path} ({e})")
        return None
    except Exception as e:
        log_warn(f"读取文件失败: {path} ({e})")
        return None


def write_json_file(path, data):
    """写入 JSON 文件"""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def normalize_severity(level):
    """标准化风险等级为 critical/high/medium/low 四级"""
    if not level:
        return ""
    level_lower = str(level).lower().strip()
    if level_lower in ('critical', '严重'):
        return 'critical'
    elif level_lower in ('high', '高'):
        return 'high'
    elif level_lower in ('medium', 'moderate', '中', '中等'):
        return 'medium'
    elif level_lower in ('low', '低'):
        return 'low'
    return level_lower


def severity_rank(sev):
    """获取严重性排序值（高值优先）"""
    return SEVERITY_ORDER.get(normalize_severity(sev), 0)


def lower_severity(sev):
    """降低一级严重性"""
    s = normalize_severity(sev)
    if s == 'critical':
        return 'high'
    elif s == 'high':
        return 'medium'
    elif s == 'medium':
        return 'low'
    return 'low'


def raise_severity(sev):
    """提升一级严重性"""
    s = normalize_severity(sev)
    if s == 'low':
        return 'medium'
    elif s == 'medium':
        return 'high'
    elif s == 'high':
        return 'critical'
    return 'critical'


def group_findings_by_file(findings):
    """按文件路径分组 findings"""
    by_file = {}
    for f in findings:
        fp = f.get('file') or f.get('FilePath') or ''
        if fp:
            by_file.setdefault(fp, []).append(f)
    return by_file


def detect_vulnerability_chains(findings):
    """标记潜在漏洞链候选：同一文件存在 ≥2 个不同类型的漏洞时，标记为链候选。
    返回 chain_candidates 列表，每项包含 file、findingIds、riskTypes。
    """
    by_file = group_findings_by_file(findings)
    chain_candidates = []
    for file_path, file_findings in by_file.items():
        risk_types = set(f.get('riskType', '') for f in file_findings)
        if len(file_findings) >= 2 and len(risk_types) >= 2:
            chain_candidates.append({
                "file": file_path,
                "findingIds": [f.get('findingId', '') for f in file_findings],
                "riskTypes": list(risk_types),
            })
    return chain_candidates


def risk_type_to_slug(risk_type):
    """将风险类型转换为 slug"""
    if not risk_type:
        return "unknown"
    # 先查精确映射
    slug = RISK_TYPE_SLUG.get(risk_type)
    if slug:
        return slug
    # 尝试小写匹配
    rt_lower = risk_type.lower().strip()
    for cn, sl in RISK_TYPE_SLUG.items():
        if rt_lower == cn.lower() or rt_lower == sl:
            return sl
    # 自动生成 slug
    return rt_lower.replace(' ', '-').replace('_', '-')


# ---------------------------------------------------------------------------
# 阶段 2 合并逻辑
# ---------------------------------------------------------------------------

def extract_findings_from_agent(data, agent_name):
    """从 agent 输出中提取 findings 列表并标记来源"""
    if data is None:
        return []

    findings = []
    raw_findings = data.get('findings', [])

    for f in raw_findings:
        # 标准化字段名（agent 输出可能用 FilePath/file 等不同名称）
        normalized = dict(f)  # 保留所有原始字段
        normalized['file'] = f.get('FilePath') or f.get('file') or f.get('filePath') or ''
        normalized['line'] = f.get('LineNumber') or f.get('line') or f.get('lineNumber') or 0
        normalized['riskType'] = f.get('RiskType') or f.get('riskType') or f.get('type') or ''
        normalized['severity'] = normalize_severity(
            f.get('RiskLevel') or f.get('severity') or f.get('riskLevel') or ''
        )
        normalized['sourceAgent'] = agent_name
        findings.append(normalized)

    return findings


def extract_findings_from_pattern_scan(data):
    """从 pattern-scan-results.json 提取 findings"""
    if data is None:
        return []

    findings = []

    # 提取 cveFindings
    for f in data.get('cveFindings', []):
        dependency_file = (
            f.get('dependencyFile') or
            f.get('manifestFile') or
            f.get('declFile') or
            f.get('filePath') or
            f.get('file') or
            ''
        )
        line_number = (
            f.get('declarationLine') or
            f.get('lineNumber') or
            f.get('line') or
            1
        )
        component = f.get('component') or f.get('package') or ''
        version = f.get('currentVersion') or f.get('version') or ''
        cve = f.get('cve') or f.get('advisoryId') or ''
        risk_code = f.get('code') or f.get('RiskCode') or ''
        if not risk_code and component:
            risk_code = f"{component}:{version}" if version else component
        risk_detail = f.get('description') or f.get('RiskDetail') or ''
        if not risk_detail and component:
            parts = [component]
            if version:
                parts.append(version)
            if cve:
                parts.append(cve)
            risk_detail = " / ".join(parts)

        findings.append({
            'file': dependency_file,
            'line': int(line_number),
            'riskType': f.get('type') or f.get('riskType') or '高危组件漏洞',
            'severity': normalize_severity(f.get('severity') or 'medium'),
            'sourceAgent': 'pattern-matching',
            'RiskCode': risk_code,
            'RiskDetail': risk_detail,
            **{k: v for k, v in f.items()
               if k not in (
                   'dependencyFile', 'manifestFile', 'declFile', 'filePath', 'file',
                   'declarationLine', 'lineNumber', 'line',
                   'type', 'riskType', 'severity', 'code', 'description'
               )},
        })

    # 提取 configFindings
    for f in data.get('configFindings', []):
        findings.append({
            'file': f.get('filePath') or f.get('file') or '',
            'line': f.get('lineNumber') or f.get('line') or 0,
            'riskType': f.get('type') or f.get('pattern') or '',
            'severity': normalize_severity(f.get('severity') or 'medium'),
            'sourceAgent': 'pattern-matching',
            'RiskCode': f.get('code') or f.get('RiskCode') or '',
            'RiskDetail': f.get('description') or f.get('RiskDetail') or '',
            **{k: v for k, v in f.items()
               if k not in ('filePath', 'file', 'lineNumber', 'line', 'type', 'severity', 'code',
                            'description', 'pattern')},
        })

    # 提取 findings（通用数组，部分 pattern-matching 直接用这个字段）
    for f in data.get('findings', []):
        findings.append({
            'file': f.get('filePath') or f.get('file') or '',
            'line': f.get('lineNumber') or f.get('line') or 0,
            'riskType': f.get('type') or f.get('riskType') or '',
            'severity': normalize_severity(f.get('severity') or 'medium'),
            'sourceAgent': 'pattern-matching',
            'RiskCode': f.get('code') or f.get('RiskCode') or '',
            'RiskDetail': f.get('description') or f.get('RiskDetail') or '',
            **{k: v for k, v in f.items()
               if k not in ('filePath', 'file', 'lineNumber', 'line', 'type', 'riskType',
                            'severity', 'code', 'description')},
        })

    return findings


def validate_finding(finding):
    """校验 finding 必需字段，返回 (valid, reason)"""
    if not finding.get('file'):
        return False, "missing file"
    if not finding.get('line'):
        return False, "missing line"
    if not finding.get('riskType'):
        return False, "missing riskType"
    if not finding.get('severity'):
        return False, "missing severity"
    return True, ""


def dedup_key(finding):
    """生成去重键（riskType 归一化为 slug 后再去重）"""
    return (
        str(finding.get('file', '')),
        int(finding.get('line', 0)),
        risk_type_to_slug(finding.get('riskType', '')),
    )


def merge_stage2(batch_dir, prefix='', output_path=None):
    """执行阶段 2 合并。

    优先消费当前 pipeline 的 `pattern-scan-results/quick-scan + deep-scan` 输出；
    仅当当前产物全部缺失时，才回退兼容旧版 `*-audit.json` 输出。
    """
    batch_path = Path(batch_dir)
    agents_dir = batch_path / 'agents'

    all_findings = []
    loaded_agents = []
    current_pipeline_loaded = False

    # 优先加载当前 pipeline：pattern-scan-results
    pattern_findings_count = 0
    pattern_data = load_json_file(batch_path / f'{prefix}pattern-scan-results.json')
    if pattern_data is not None:
        findings = extract_findings_from_pattern_scan(pattern_data)
        pattern_findings_count = len(findings)
        all_findings.extend(findings)
        loaded_agents.append('pattern-matching')
        current_pipeline_loaded = True
        log_info(f"pattern-matching: {len(findings)} findings")
    else:
        log_warn(f"{prefix}pattern-scan-results.json 不存在或为空，跳过")

    # 回退：如果 pattern-scan-results 未加载或提取 0 个 findings，尝试加载 quick-scan.json
    if 'pattern-matching' not in loaded_agents or pattern_findings_count == 0:
        qs_data = load_json_file(agents_dir / f'{prefix}quick-scan.json')
        if qs_data is not None:
            # quick-scan 混合格式：cveFindings/configFindings 用 camelCase，
            # findings[] 用 PascalCase（FilePath/RiskType 等），需两种提取器配合
            findings_pattern = extract_findings_from_pattern_scan(qs_data)
            findings_agent = extract_findings_from_agent(qs_data, 'quick-scan')
            # 合并两种提取结果，后续 dedup 会处理重复
            findings = findings_pattern + findings_agent
            if len(findings) > 0:
                all_findings.extend(findings)
                loaded_agents.append('quick-scan')
                current_pipeline_loaded = True
                log_info(f"quick-scan (回退): {len(findings)} findings")

    # 加载 deep-scan（当前语义分析 agent）
    deep_data = load_json_file(agents_dir / f'{prefix}deep-scan.json')
    if deep_data is not None:
        findings = extract_findings_from_agent(deep_data, 'deep-scan')
        all_findings.extend(findings)
        loaded_agents.append('deep-scan')
        current_pipeline_loaded = True
        log_info(f"deep-scan: {len(findings)} findings")
    else:
        log_warn(f"{prefix}deep-scan.json 不存在或为空，跳过")

    # 仅在当前 pipeline 产物全部缺失时，回退兼容旧版 *-audit.json
    if not current_pipeline_loaded:
        log_warn("未检测到当前 pipeline 输出，回退到旧版 *-audit.json 兼容模式")

        vuln_data = load_json_file(agents_dir / f'{prefix}vulnerability-audit.json')
        if vuln_data is not None:
            findings = extract_findings_from_agent(vuln_data, 'vulnerability-audit')
            all_findings.extend(findings)
            loaded_agents.append('vulnerability-audit')
            log_info(f"vulnerability-audit: {len(findings)} findings")
        else:
            log_warn(f"{prefix}vulnerability-audit.json 不存在或为空，跳过")

        logic_data = load_json_file(agents_dir / f'{prefix}logic-defect-audit.json')
        if logic_data is not None:
            findings = extract_findings_from_agent(logic_data, 'logic-defect-audit')
            all_findings.extend(findings)
            loaded_agents.append('logic-defect-audit')
            log_info(f"logic-defect-audit: {len(findings)} findings")
        else:
            log_warn(f"{prefix}logic-defect-audit.json 不存在或为空，跳过")

        supply_data = load_json_file(agents_dir / f'{prefix}dependency-audit.json')
        if supply_data is not None:
            findings = extract_findings_from_agent(supply_data, 'dependency-audit')
            all_findings.extend(findings)
            loaded_agents.append('dependency-audit')
            log_info(f"dependency-audit: {len(findings)} findings")
        else:
            log_warn(f"{prefix}dependency-audit.json 不存在或为空，跳过")

    log_info(f"合计加载 {len(all_findings)} 个原始 findings (来自 {len(loaded_agents)} 个 agent)")

    # 格式校验
    valid_findings = []
    discarded_count = 0
    for f in all_findings:
        valid, reason = validate_finding(f)
        if valid:
            valid_findings.append(f)
        else:
            discarded_count += 1
            log_warn(f"丢弃不完整 finding: {reason} — {f.get('file', '?')}:{f.get('line', '?')}")

    if discarded_count > 0:
        log_warn(f"共丢弃 {discarded_count} 个格式不完整的 finding")

    # traceMethod 检查（仅语义分析 agent）
    trace_fixed = 0
    for f in valid_findings:
        if f.get('sourceAgent') in SEMANTIC_AGENTS:
            if not f.get('traceMethod') and not f.get('attackChain', {}).get('traceMethod'):
                f['traceMethod'] = 'unknown'
                trace_fixed += 1
    if trace_fixed > 0:
        log_warn(f"为 {trace_fixed} 个语义分析 finding 补充 traceMethod: unknown")

    # attackChain 合约校验（仅语义分析 agent）
    chain_invalid = 0
    for f in valid_findings:
        if f.get('sourceAgent') in SEMANTIC_AGENTS:
            chain = f.get('attackChain')
            if chain:
                ok, reason = validate_attack_chain(chain)
                if not ok:
                    chain_invalid += 1
                    log_warn(
                        f"attackChain 不合规 ({reason}): "
                        f"{f.get('file', '?')}:{f.get('line', '?')} [{f.get('riskType', '?')}]"
                    )
                    # 标记为不完整，供 finding-validator 识别并执行完整追踪
                    f.setdefault('_chainIncomplete', True)
    if chain_invalid > 0:
        log_warn(f"共 {chain_invalid} 个语义分析 finding 的 attackChain 不符合合约")

    # 去重（按 file+line+riskType，保留最高 severity）
    dedup_groups = {}
    for f in valid_findings:
        key = dedup_key(f)
        if key in dedup_groups:
            existing = dedup_groups[key]
            if severity_rank(f['severity']) > severity_rank(existing['severity']):
                dedup_groups[key] = f
        else:
            dedup_groups[key] = f

    deduplicated_count = len(valid_findings) - len(dedup_groups)
    merged_findings = list(dedup_groups.values())

    if deduplicated_count > 0:
        log_info(f"去重移除 {deduplicated_count} 个重复 finding")

    # 分配 findingId
    for i, f in enumerate(merged_findings, 1):
        f['findingId'] = f"f-{i:03d}"

    # 统计
    by_severity = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    by_risk_type = {}
    for f in merged_findings:
        sev = normalize_severity(f['severity'])
        by_severity[sev] = by_severity.get(sev, 0) + 1
        slug = risk_type_to_slug(f['riskType'])
        by_risk_type[slug] = by_risk_type.get(slug, 0) + 1

    # 写入 merged-stage2.json
    output_data = {
        "mergedAt": datetime.now(timezone.utc).isoformat(),
        "totalFindings": len(merged_findings),
        "byRiskType": by_risk_type,
        "bySeverity": by_severity,
        "deduplicatedCount": deduplicated_count,
        "discardedCount": discarded_count,
        "loadedAgents": loaded_agents,
        "findings": merged_findings,
    }
    out_file = output_path or (batch_path / f'{prefix}merged-stage2.json')
    write_json_file(out_file, output_data)
    log_ok(f"已写入 {out_file} ({len(merged_findings)} findings)")

    # 漏洞链检测
    chain_candidates = detect_vulnerability_chains(merged_findings)
    if chain_candidates:
        log_info(f"检测到 {len(chain_candidates)} 个潜在漏洞链候选")
        output_data["chainCandidates"] = chain_candidates

    # stdout 摘要
    stdout_json({
        "status": "ok",
        "totalFindings": len(merged_findings),
        "criticalCount": by_severity.get("critical", 0),
        "bySeverity": by_severity,
        "byRiskType": by_risk_type,
        "deduplicatedCount": deduplicated_count,
        "discardedCount": discarded_count,
        "chainCandidates": len(chain_candidates),
        "outputFile": str(out_file.name),
    })


# ---------------------------------------------------------------------------
# 阶段 3 合并逻辑
# ---------------------------------------------------------------------------

def build_finding_index(findings):
    """构建 finding 索引（findingId → finding, file+line+riskType → finding）"""
    by_id = {}
    by_key = {}
    for f in findings:
        fid = f.get('findingId')
        if fid:
            by_id[fid] = f
        key = dedup_key(f)
        by_key[key] = f
    return by_id, by_key


def match_finding(by_id, by_key, ref):
    """匹配 finding：先按 findingId，再按 file+line+riskType"""
    # 尝试 findingId
    fid = ref.get('findingId')
    if fid and fid in by_id:
        return by_id[fid]
    # 尝试 file+line+riskType
    file_val = ref.get('FilePath') or ref.get('file') or ref.get('filePath') or ''
    line_val = ref.get('LineNumber') or ref.get('line') or ref.get('lineNumber') or 0
    rt_val = ref.get('RiskType') or ref.get('riskType') or ''
    key = (str(file_val), int(line_val), str(rt_val))
    return by_key.get(key)


def _normalize_vf(vf):
    """将扁平 verification output 归一化为 output-schemas.md 嵌套格式。

    verification agent 可能输出扁平结构（ahAction, verificationStatus, riskConfidence
    等字段直接挂在 finding 上），而 _apply_finding_validator() 期望嵌套结构
    （antiHallucination{}, verification{}, confidence{}）。
    此函数兼容两种格式，确保下游逻辑统一消费嵌套结构。
    """
    if 'antiHallucination' not in vf and 'ahAction' in vf:
        phase_a_detail = vf.get('phaseADetail', {})
        vf['antiHallucination'] = {
            'ahAction': vf.get('ahAction', 'pass'),
            'fileExists': phase_a_detail.get('fileExists', vf.get('fileExists')),
            'lineValid': phase_a_detail.get('lineValid', vf.get('lineValid')),
            'codeMatches': phase_a_detail.get('codeMatches', vf.get('codeMatches')),
        }
    if 'verification' not in vf and 'verificationStatus' in vf:
        vf['verification'] = {
            'verificationStatus': vf.get('verificationStatus'),
            'challengeVerdict': vf.get('challengeVerdict', ''),
            'traceMethod': (vf.get('attackChain') or {}).get('traceMethod',
                           vf.get('traceMethod', 'unknown')),
        }
    if 'confidence' not in vf and 'riskConfidence' in vf:
        vf['confidence'] = {
            'RiskConfidence': vf.get('riskConfidence'),
        }
        if vf.get('confidenceBreakdown'):
            vf['confidence']['confidenceBreakdown'] = vf['confidenceBreakdown']
    return vf


def _apply_finding_validator(fv_data, findings, by_id, by_key, ah_actions):
    """从 finding-validator.json 统一格式中提取并应用三阶段验证结果。
    返回 (removed_by_ah, downgraded_by_ah, removed_by_challenge, downgraded_by_rv, escalated_by_rv)。
    """
    removed_by_ah = 0
    downgraded_by_ah = 0
    removed_by_challenge = 0
    downgraded_by_rv = 0
    escalated_by_rv = 0

    # 兼容 validatedFindings / findings 两种键名
    validated = fv_data.get('validatedFindings', fv_data.get('findings', []))
    for vf in validated:
        vf = _normalize_vf(vf)
        ref = {'findingId': vf.get('findingId', '')}
        finding = match_finding(by_id, by_key, ref)
        if finding is None:
            log_warn(f"finding-validator 引用未知 finding: {vf.get('findingId', '?')}")
            continue

        fid = finding.get('findingId', '')

        # --- 步骤一: 代码存在性校验 ---
        ah = vf.get('antiHallucination', {})
        ah_action = ah.get('ahAction', 'pass')
        ah_actions[fid] = ah_action

        if ah_action == 'remove':
            finding['_removed'] = True
            finding['_removed_by'] = 'finding-validator:anti-hallucination'
            removed_by_ah += 1
            continue  # 已移除，跳过后续阶段
        elif ah_action == 'downgrade':
            current_conf = finding.get('RiskConfidence', finding.get('riskConfidence', 50))
            finding['RiskConfidence'] = max(0, int(current_conf) - 20)
            downgraded_by_ah += 1

        # --- 步骤二/三: 攻击链验证 + 对抗审查 ---
        verif = vf.get('verification', {})
        finding['verificationStatus'] = verif.get('verificationStatus', 'unverified')
        finding['traceMethod'] = verif.get('traceMethod', finding.get('traceMethod', 'unknown'))

        verdict = verif.get('challengeVerdict', '')
        finding['challengeVerdict'] = verdict

        if finding['verificationStatus'] == 'false_positive':
            finding['_removed'] = True
            finding['_removed_by'] = 'finding-validator:false_positive'
            removed_by_challenge += 1
            continue
        elif verdict == 'dismissed':
            finding['_removed'] = True
            finding['_removed_by'] = 'finding-validator:dismissed'
            removed_by_challenge += 1
            continue
        elif verdict == 'downgraded':
            finding['severity'] = lower_severity(finding.get('severity', 'medium'))
            downgraded_by_rv += 1
        elif verdict == 'escalated':
            finding['severity'] = raise_severity(finding.get('severity', 'medium'))
            escalated_by_rv += 1

        # --- 步骤五: 置信度评分 ---
        conf = vf.get('confidence', {})
        if 'RiskConfidence' in conf:
            finding['RiskConfidence'] = conf['RiskConfidence']
        if 'confidenceBreakdown' in conf:
            finding['confidenceBreakdown'] = conf['confidenceBreakdown']

    log_info(
        f"finding-validator: AH 移除 {removed_by_ah}, AH 降级 {downgraded_by_ah}, "
        f"验证移除 {removed_by_challenge}, 验证降级 {downgraded_by_rv}, 升级 {escalated_by_rv}"
    )

    # P2 修复：验证覆盖率告警 — 当有 findings 但全部验证计数为 0 时，说明 schema 可能不匹配
    if len(validated) > 0 and (removed_by_ah + downgraded_by_ah + removed_by_challenge + downgraded_by_rv + escalated_by_rv) == 0:
        log_warn("⚠ finding-validator 未对任何 finding 产生效果，可能存在 schema 不匹配")

    return removed_by_ah, downgraded_by_ah, removed_by_challenge, downgraded_by_rv, escalated_by_rv


def merge_stage3(batch_dir, prefix=''):
    """执行阶段 3 合并。prefix 用于分批模式（如 'batch-1-'）。
    
    从 finding-validator.json 读取统一验证结果。
    """
    batch_path = Path(batch_dir)
    agents_dir = batch_path / 'agents'

    # 加载 merged-stage2.json（必选，支持 merged-scan.json 回退）
    stage2_data = load_json_file(batch_path / f'{prefix}merged-stage2.json')
    if stage2_data is None:
        stage2_data = load_json_file(batch_path / f'{prefix}merged-scan.json')
        if stage2_data is not None:
            log_info("使用 merged-scan.json 作为 merged-stage2.json 的回退")
    if stage2_data is None:
        log_error(f"{prefix}merged-stage2.json 不存在，无法执行阶段 3 合并")
        stdout_json({"status": "error", "message": f"{prefix}merged-stage2.json not found"})
        sys.exit(1)

    findings = stage2_data.get('findings', [])
    input_count = len(findings)
    log_info(f"加载 {input_count} 个 stage2 findings")

    # 构建索引
    by_id, by_key = build_finding_index(findings)

    # 跟踪每个 finding 的 anti-hallucination action
    ah_actions = {}  # findingId → action

    # 从 finding-validator.json 读取统一验证结果（支持 verification.json 回退）
    fv_data = load_json_file(agents_dir / f'{prefix}finding-validator.json')
    if fv_data is None:
        fv_data = load_json_file(agents_dir / f'{prefix}verification.json')
        if fv_data is not None:
            log_info("使用 verification.json 作为 finding-validator.json 的回退")
    if fv_data is None:
        log_error(f"{prefix}finding-validator.json 不存在，无法执行阶段 3 合并")
        stdout_json({"status": "error", "message": f"{prefix}finding-validator.json not found"})
        sys.exit(1)

    removed_by_ah, downgraded_by_ah, removed_by_challenge, downgraded_by_rv, escalated_by_rv = \
        _apply_finding_validator(fv_data, findings, by_id, by_key, ah_actions)

    # 移除标记删除的 findings
    findings = [f for f in findings if not f.get('_removed')]

    # 重建索引
    by_id, by_key = build_finding_index(findings)

    # --- 高置信度门禁 ---
    # finding-validator 已做门禁，此处做最终兜底校验
    gate_demoted = 0
    for f in findings:
        confidence = f.get('RiskConfidence', 0)
        if confidence >= 90:
            verified = f.get('verificationStatus') == 'verified'
            confirmed = f.get('challengeVerdict') in ('confirmed', 'escalated')
            ah_pass = ah_actions.get(f.get('findingId', ''), 'pass') == 'pass'

            if not (verified and confirmed and ah_pass):
                f['RiskConfidence'] = 89
                gate_demoted += 1

    if gate_demoted > 0:
        log_info(f"高置信度门禁: {gate_demoted} 个 finding 置信度降至 89")

    # --- 步骤 5: 按风险类型分组输出 finding-{slug}.json ---
    final_count = len(findings)
    groups = {}
    for f in findings:
        slug = risk_type_to_slug(f.get('riskType', ''))
        if slug not in groups:
            groups[slug] = []
        groups[slug].append(f)

    finding_files = []
    by_severity_final = {"critical": 0, "high": 0, "medium": 0, "low": 0}

    for slug, group_findings in sorted(groups.items()):
        # 构建标准输出格式
        risk_list = []
        critical = high = medium = low = 0
        for f in group_findings:
            sev = normalize_severity(f.get('severity', 'medium'))
            if sev == 'critical':
                critical += 1
            elif sev == 'high':
                high += 1
            elif sev == 'medium':
                medium += 1
            else:
                low += 1
            by_severity_final[sev] = by_severity_final.get(sev, 0) + 1

            # 清理内部字段
            risk_item = {
                "FilePath": f.get('file') or f.get('FilePath', ''),
                "RiskType": f.get('riskType') or f.get('RiskType', ''),
                "RiskLevel": sev,
                "LineNumber": int(f.get('line') or f.get('LineNumber', 0)),
                "RiskCode": f.get('RiskCode') or f.get('riskCode') or '',
                "RiskConfidence": f.get('RiskConfidence', 50),
                "RiskDetail": f.get('RiskDetail') or f.get('riskDetail') or '',
                "Suggestions": f.get('Suggestions') or f.get('suggestions') or '',
                "FixedCode": f.get('FixedCode') or f.get('fixedCode') or '',
                "verificationStatus": f.get('verificationStatus', 'unverified'),
                "challengeVerdict": f.get('challengeVerdict', ''),
                "findingId": f.get('findingId', ''),
                "sourceAgent": f.get('sourceAgent', ''),
            }
            # 保留可选字段
            for extra_key in (
                'component', 'currentVersion', 'fixedVersion', 'cve', 'source', 'reasoning',
                'recommendation', 'dependencyFile', 'manifestFile'
            ):
                if f.get(extra_key) not in (None, ''):
                    risk_item[extra_key] = f.get(extra_key)
            if f.get('attackChain'):
                risk_item['attackChain'] = f['attackChain']
            if f.get('traceMethod'):
                risk_item['traceMethod'] = f['traceMethod']
            if f.get('confidenceBreakdown'):
                risk_item['confidenceBreakdown'] = f['confidenceBreakdown']
            if f.get('confidenceCeiling') is not None:
                risk_item['confidenceCeiling'] = f['confidenceCeiling']
            if f.get('confidenceCeilingReason'):
                risk_item['confidenceCeilingReason'] = f['confidenceCeilingReason']
            if f.get('auditedBy'):
                risk_item['auditedBy'] = f['auditedBy']
            if f.get('defenses'):
                risk_item['defenses'] = f['defenses']
            if f.get('attackPayload'):
                risk_item['attackPayload'] = f['attackPayload']
            if f.get('callChain'):
                risk_item['callChain'] = f['callChain']

            risk_list.append(risk_item)

        cn_name = SLUG_RISK_TYPE.get(slug, slug)
        file_name = f"finding-{slug}.json"
        finding_data = {
            "metadata": {
                "riskTypeSlug": slug,
                "riskTypeName": cn_name,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "version": "1.0",
            },
            "summary": {
                "totalIssues": len(risk_list),
                "criticalRisk": critical,
                "highRisk": high,
                "mediumRisk": medium,
                "lowRisk": low,
            },
            "StatInfo": {"RiskNum": len(risk_list)},
            "RiskList": risk_list,
        }
        write_json_file(batch_path / file_name, finding_data)
        finding_files.append(file_name)
        log_info(f"  {file_name} — {cn_name}（{len(risk_list)} 个风险）")

    # --- 步骤 6: 写 summary.json ---
    # 从 batch-plan.json 读取扫描文件总数（由 batch_files.py 生成）
    total_files = 0
    batch_plan_path = batch_path / 'batch-plan.json'
    if batch_plan_path.exists():
        batch_plan = load_json_file(batch_plan_path)
        if batch_plan:
            total_files = batch_plan.get('total_files', 0)
    # 收集涉及风险的文件数
    risk_file_set = set()
    for f in findings:
        fp = f.get('file') or f.get('FilePath') or ''
        if fp:
            risk_file_set.add(fp)
    risk_files = len(risk_file_set)

    summary = {
        "batchId": batch_path.name,
        "command": "project" if "project-audit" in batch_path.name else "diff",
        "totalFiles": total_files,
        "riskFiles": risk_files,
        "totalFindings": final_count,
        "criticalRisk": by_severity_final.get("critical", 0),
        "highRisk": by_severity_final.get("high", 0),
        "mediumRisk": by_severity_final.get("medium", 0),
        "lowRisk": by_severity_final.get("low", 0),
        "mergeMetrics": {
            "inputFindings": input_count,
            "removedByAntiHallucination": removed_by_ah,
            "removedByChallenge": removed_by_challenge,
            "downgradedByAntiHallucination": downgraded_by_ah,
            "downgradedByVerification": downgraded_by_rv,
            "escalatedByVerification": escalated_by_rv,
            "highConfidenceGateDemoted": gate_demoted,
            "finalFindings": final_count,
        },
    }
    write_json_file(batch_path / 'summary.json', summary)
    log_ok(f"已写入 summary.json ({final_count} findings)")

    # stdout 摘要
    stdout_json({
        "status": "ok",
        "inputFindings": input_count,
        "removedByAntiHallucination": removed_by_ah,
        "removedByChallenge": removed_by_challenge,
        "downgraded": downgraded_by_ah + downgraded_by_rv,
        "highConfidenceGateDemoted": gate_demoted,
        "finalFindings": final_count,
        "criticalCount": by_severity_final.get("critical", 0),
        "bySeverity": by_severity_final,
        "findingFiles": finding_files,
        "summaryFile": "summary.json",
    })


# ---------------------------------------------------------------------------
# merge-batches：合并多个批次的 batch-N-result.json
# ---------------------------------------------------------------------------

def merge_batches(batch_dir, output_path=None):
    """合并多个 batch-N-result.json，全局去重，输出合并结果"""
    import glob as glob_mod

    log_info("开始合并多批次结果...")

    # 发现所有 batch-N-result.json
    pattern = str(batch_dir / "batch-*-result.json")
    batch_files = sorted(glob_mod.glob(pattern))

    if not batch_files:
        log_error("未找到任何 batch-N-result.json 文件")
        stdout_json({"status": "error", "message": "no batch result files found"})
        sys.exit(1)

    log_info(f"发现 {len(batch_files)} 个批次结果文件")

    all_findings = []
    batch_summaries = []
    total_errors = []

    for bf_path in batch_files:
        batch_data = load_json_file(Path(bf_path))
        if batch_data is None:
            log_warn(f"跳过无法解析的文件: {bf_path}")
            continue

        batch_idx = batch_data.get("batchIndex", "?")
        batch_label = batch_data.get("batchLabel", "")
        status = batch_data.get("status", "unknown")

        batch_summaries.append({
            "batchIndex": batch_idx,
            "batchLabel": batch_label,
            "status": status,
            "totalFindings": batch_data.get("totalFindings", 0),
            "bySeverity": batch_data.get("bySeverity", {}),
        })

        # 收集错误
        for err in batch_data.get("errors", []):
            total_errors.append(f"batch-{batch_idx}: {err}")

        # 加载该批次的 finding 文件
        for ff in batch_data.get("findingFiles", []):
            ff_path = batch_dir / ff
            ff_data = load_json_file(ff_path)
            if ff_data and isinstance(ff_data, dict):
                findings = ff_data.get("findings", [])
                if isinstance(findings, list):
                    all_findings.extend(findings)
            elif ff_data and isinstance(ff_data, list):
                all_findings.extend(ff_data)

    log_info(f"合并前 findings 总数: {len(all_findings)}")

    # 全局去重：基于 (file, line, riskType) 元组
    # 注意：各批次经过 merge_stage2 后字段已归一化为 file/line，
    # 但保留对原始字段名 filePath/lineNumber 的容错，防止未归一化数据混入。
    seen = set()
    deduped = []
    dup_count = 0
    for f in all_findings:
        key = (
            str(f.get("file") or f.get("filePath") or ""),
            int(f.get("line") or f.get("lineNumber") or 0),
            str(f.get("riskType", "")),
        )
        if key in seen:
            dup_count += 1
            continue
        seen.add(key)
        deduped.append(f)

    if dup_count > 0:
        log_info(f"全局去重移除 {dup_count} 个跨批次重复 findings")

    # 统计
    severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for f in deduped:
        sev = normalize_severity(f.get("severity", ""))
        if sev in severity_counts:
            severity_counts[sev] += 1

    # 重新分配全局 findingId
    for i, f in enumerate(deduped, 1):
        f["findingId"] = f"FIND-{i:04d}"

    # 写入合并结果
    out_path = output_path or (batch_dir / "all-batches-merged.json")
    result = {
        "mergedAt": datetime.now(timezone.utc).isoformat(),
        "totalBatches": len(batch_summaries),
        "batchSummaries": batch_summaries,
        "totalFindings": len(deduped),
        "duplicatesRemoved": dup_count,
        "bySeverity": severity_counts,
        "findings": deduped,
        "errors": total_errors,
    }
    write_json_file(out_path, result)
    log_ok(f"全批次合并完成 → {out_path}")

    # stdout 摘要
    stdout_json({
        "status": "ok",
        "totalBatches": len(batch_summaries),
        "totalFindings": len(deduped),
        "duplicatesRemoved": dup_count,
        "bySeverity": severity_counts,
        "outputFile": str(out_path),
        "errors": total_errors,
    })


# ---------------------------------------------------------------------------
# CLI 入口
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="审计结果合并脚本：合并多 agent 输出、去重、校验",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
子命令说明：
  merge-scan     合并扫描阶段所有 agent 输出（格式校验 + 去重 + findingId 分配 + 漏洞链检测）
  merge-verify   合并验证阶段结果，生成最终 finding-*.json 和 summary.json
  merge-batches  合并多个批次的 batch-N-result.json，全局去重

  兼容别名：merge-stage2 → merge-scan, merge-stage3 → merge-verify

示例：
  %(prog)s merge-scan --batch-dir security-scan-output/project-audit-20250302120000
  %(prog)s merge-verify --batch-dir security-scan-output/project-audit-20250302120000
  %(prog)s merge-batches --batch-dir security-scan-output/project-audit-20250302120000
        """
    )

    subparsers = parser.add_subparsers(dest='command', help='子命令')

    # merge-scan (新名称) + merge-stage2 (兼容别名)
    scan_help = '合并扫描阶段 agent 输出（格式校验 + 去重 + findingId 分配 + 漏洞链检测）'
    for cmd_name in ('merge-scan', 'merge-stage2'):
        sp = subparsers.add_parser(cmd_name, help=scan_help)
        sp.add_argument('--batch-dir', required=True,
                        help='审计批次目录路径（如 security-scan-output/project-audit-xxx）')
        sp.add_argument('--prefix', default='',
                        help='agent 输出文件名前缀（分批模式用，如 batch-1-）')
        sp.add_argument('--output', '-o',
                        help='输出文件路径（默认 batch-dir/merged-stage2.json）')

    # merge-verify (新名称) + merge-stage3 (兼容别名)
    verify_help = '合并验证阶段结果，生成 finding-*.json 和 summary.json'
    for cmd_name in ('merge-verify', 'merge-stage3'):
        sp = subparsers.add_parser(cmd_name, help=verify_help)
        sp.add_argument('--batch-dir', required=True,
                        help='审计批次目录路径（如 security-scan-output/project-audit-xxx）')
        sp.add_argument('--prefix', default='',
                        help='agent 输出文件名前缀（分批模式用，如 batch-1-）')
        sp.add_argument('--output', '-o',
                        help='输出文件路径（默认按风险类型分文件）')

    # merge-batches
    spb = subparsers.add_parser('merge-batches',
                                help='合并多个批次的 batch-N-result.json，全局去重')
    spb.add_argument('--batch-dir', required=True,
                     help='审计批次目录路径（如 security-scan-output/project-audit-xxx）')
    spb.add_argument('--output', '-o',
                     help='输出文件路径（默认 batch-dir/all-batches-merged.json）')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    # 校验 batch-dir 存在
    batch_dir = Path(args.batch_dir)
    if not batch_dir.is_dir():
        log_error(f"批次目录不存在: {batch_dir}")
        stdout_json({"status": "error", "message": f"batch dir not found: {batch_dir}"})
        sys.exit(1)

    prefix = getattr(args, 'prefix', '')
    output_file = getattr(args, 'output', None)

    if args.command in ('merge-scan', 'merge-stage2'):
        merge_stage2(batch_dir, prefix=prefix, output_path=Path(output_file) if output_file else None)
    elif args.command in ('merge-verify', 'merge-stage3'):
        merge_stage3(batch_dir, prefix=prefix)
    elif args.command == 'merge-batches':
        output_path = Path(args.output) if args.output else None
        merge_batches(batch_dir, output_path)


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
