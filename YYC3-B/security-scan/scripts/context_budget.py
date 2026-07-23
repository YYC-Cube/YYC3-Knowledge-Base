#!/usr/bin/env python3
"""
上下文预算追踪器：基于已知的工具调用计数和估算的 token 消耗，
预测剩余上下文容量，输出建议操作。

原理：
  Agent 无法直接查询剩余 token 数，但可以通过以下方式间接估算：
  1. 记录每次工具调用的输入/输出大小
  2. 根据已读取的文件行数估算已消耗 tokens
  3. 根据已有 findings 数量和剩余待分析数量估算是否能完成

用法：
  context_budget.py estimate \
    --total-budget 170000 \
    --files-read 15 \
    --avg-lines-per-file 50 \
    --findings-completed 5 \
    --findings-remaining 8 \
    --tool-calls 45

stdout JSON:
  {
    "estimatedUsed": 85000,
    "estimatedRemaining": 85000,
    "usagePercent": 50,
    "canCompleteRemaining": true,
    "recommendation": "continue",
    "estimatedCallsRemaining": 60,
    "message": "预算充足，可继续正常分析"
  }
"""
import argparse
import json
import sys


# ---------------------------------------------------------------------------
# 常量：token 消耗估算参数
# ---------------------------------------------------------------------------

# 每行代码平均消耗的 tokens（包含代码本身 + 行号元数据）
TOKENS_PER_LINE = 15

# 每次工具调用的平均固定开销（调用请求 + 响应格式 + 元数据）
TOKENS_PER_TOOL_CALL_OVERHEAD = 200

# 系统提示 + agent 指令的基础消耗（估算值）
BASE_SYSTEM_TOKENS = 8000

# 每个 finding 分析的平均 token 消耗（包含 Read、LSP、Grep 调用及响应）
TOKENS_PER_FINDING_ANALYSIS = 3500

# 每次 LSP 调用的平均响应 tokens
TOKENS_PER_LSP_CALL = 400

# 每次 Grep 调用的平均响应 tokens
TOKENS_PER_GREP_CALL = 300

# agent 输出（JSON 写入内容）的估算 tokens
TOKENS_PER_WRITE = 500

# 安全余量（预留 5% 用于最终写入）
SAFETY_MARGIN_PERCENT = 5


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
    print(f"{Colors.CYAN}[budget] {msg}{Colors.ENDC}", file=sys.stderr)


def stdout_json(data):
    print(json.dumps(data, ensure_ascii=False))


# ---------------------------------------------------------------------------
# 预算估算逻辑
# ---------------------------------------------------------------------------

def estimate_budget(
    total_budget: int,
    files_read: int,
    avg_lines_per_file: int,
    findings_completed: int,
    findings_remaining: int,
    tool_calls: int,
    lsp_calls: int = 0,
    grep_calls: int = 0,
) -> dict:
    """
    估算上下文预算使用情况并给出建议。

    Returns:
        dict: 包含估算结果和建议操作
    """
    # 计算已消耗 tokens
    read_tokens = files_read * avg_lines_per_file * TOKENS_PER_LINE
    tool_overhead_tokens = tool_calls * TOKENS_PER_TOOL_CALL_OVERHEAD
    lsp_tokens = lsp_calls * TOKENS_PER_LSP_CALL
    grep_tokens = grep_calls * TOKENS_PER_GREP_CALL
    finding_tokens = findings_completed * TOKENS_PER_FINDING_ANALYSIS
    write_tokens = max(1, findings_completed // 3) * TOKENS_PER_WRITE  # 估算已写入次数

    estimated_used = (
        BASE_SYSTEM_TOKENS
        + read_tokens
        + tool_overhead_tokens
        + lsp_tokens
        + grep_tokens
        + finding_tokens
        + write_tokens
    )

    # 计算安全余量
    safety_margin = int(total_budget * SAFETY_MARGIN_PERCENT / 100)
    effective_budget = total_budget - safety_margin

    estimated_remaining = max(0, effective_budget - estimated_used)
    usage_percent = min(100, int(estimated_used / effective_budget * 100))

    # 估算剩余可执行的工具调用次数
    avg_tokens_per_call = (
        (estimated_used - BASE_SYSTEM_TOKENS) / max(1, tool_calls)
    ) if tool_calls > 0 else TOKENS_PER_TOOL_CALL_OVERHEAD
    estimated_calls_remaining = int(estimated_remaining / max(1, avg_tokens_per_call))

    # 估算是否能完成剩余 findings
    tokens_needed_for_remaining = findings_remaining * TOKENS_PER_FINDING_ANALYSIS
    can_complete = tokens_needed_for_remaining <= estimated_remaining

    # 确定建议操作
    if usage_percent < 50:
        recommendation = "continue"
        message = "预算充足，可继续正常分析"
    elif usage_percent < 70:
        recommendation = "continue"
        message = "预算适中，建议提高写入频率"
    elif usage_percent < 85:
        recommendation = "flush_and_continue"
        message = "预算偏紧，立即写入当前结果，然后继续但减少 Read 范围"
    elif usage_percent < 95:
        recommendation = "flush_and_stop"
        message = "预算紧张，立即写入，完成当前 finding 后停止新分析"
    else:
        recommendation = "emergency_flush"
        message = "预算即将耗尽，紧急写入所有数据，设置 status=partial"

    # 如果剩余 findings 无法完成，提升建议级别
    if not can_complete and recommendation == "continue":
        recommendation = "flush_and_continue"
        message = f"预估无法完成剩余 {findings_remaining} 个 findings，建议写入并调整策略"

    result = {
        "estimatedUsed": estimated_used,
        "estimatedRemaining": estimated_remaining,
        "usagePercent": usage_percent,
        "canCompleteRemaining": can_complete,
        "recommendation": recommendation,
        "estimatedCallsRemaining": estimated_calls_remaining,
        "message": message,
        "breakdown": {
            "baseSystem": BASE_SYSTEM_TOKENS,
            "readTokens": read_tokens,
            "toolOverhead": tool_overhead_tokens,
            "lspTokens": lsp_tokens,
            "grepTokens": grep_tokens,
            "findingAnalysis": finding_tokens,
            "writeTokens": write_tokens,
        },
    }

    return result


# ---------------------------------------------------------------------------
# CLI 入口
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="上下文预算追踪器：估算剩余上下文容量并给出建议操作",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例：
  %(prog)s estimate --total-budget 170000 --files-read 15 --avg-lines-per-file 50 \\
    --findings-completed 5 --findings-remaining 8 --tool-calls 45

建议操作说明：
  continue            预算充足，正常继续
  flush_and_continue  预算偏紧，立即写入后继续（缩小 Read 范围）
  flush_and_stop      预算紧张，写入后停止新分析
  emergency_flush     预算耗尽，紧急写入并终止
        """
    )

    subparsers = parser.add_subparsers(dest='command', help='子命令')

    sp = subparsers.add_parser('estimate', help='估算上下文预算使用情况')
    sp.add_argument('--total-budget', type=int, default=170000,
                    help='总上下文预算（tokens，默认 170000）')
    sp.add_argument('--files-read', type=int, default=0,
                    help='已读取的文件数量')
    sp.add_argument('--avg-lines-per-file', type=int, default=50,
                    help='每次 Read 的平均行数')
    sp.add_argument('--findings-completed', type=int, default=0,
                    help='已完成分析的 findings 数量')
    sp.add_argument('--findings-remaining', type=int, default=0,
                    help='剩余待分析的 findings 数量')
    sp.add_argument('--tool-calls', type=int, default=0,
                    help='已执行的工具调用总次数')
    sp.add_argument('--lsp-calls', type=int, default=0,
                    help='已执行的 LSP 调用次数（可选，用于更精确估算）')
    sp.add_argument('--grep-calls', type=int, default=0,
                    help='已执行的 Grep 调用次数（可选，用于更精确估算）')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    if args.command == 'estimate':
        result = estimate_budget(
            total_budget=args.total_budget,
            files_read=args.files_read,
            avg_lines_per_file=args.avg_lines_per_file,
            findings_completed=args.findings_completed,
            findings_remaining=args.findings_remaining,
            tool_calls=args.tool_calls,
            lsp_calls=args.lsp_calls,
            grep_calls=args.grep_calls,
        )

        log_info(
            f"预算使用 {result['usagePercent']}% "
            f"({result['estimatedUsed']}/{args.total_budget}) — "
            f"{result['recommendation']}: {result['message']}"
        )

        stdout_json(result)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
    except Exception as e:
        print(f"[budget] 错误: {e}", file=sys.stderr)
        stdout_json({"status": "error", "message": str(e)})
        sys.exit(1)
