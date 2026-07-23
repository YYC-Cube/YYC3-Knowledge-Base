# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0
import argparse
import json
from agents.common import run_agent


def main() -> None:
    p = argparse.ArgumentParser(prog="stockpilot")
    p.add_argument("--agent", choices=["before", "starter"], default="starter")
    p.add_argument("prompt", help="task for the agent")
    p.add_argument("--json", action="store_true")
    args = p.parse_args()

    result = run_agent(args.agent, args.prompt)
    if args.json:
        print(json.dumps(result.to_dict(), indent=2))
    else:
        print(result.final_text)
        print(f"\n[{result.turns} turns · {result.total_tokens:,} tokens · {result.wall_ms/1000:.1f}s · {len(result.actions)} actions]")


if __name__ == "__main__":
    main()
