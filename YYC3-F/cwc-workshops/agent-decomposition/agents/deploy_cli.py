# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0
import argparse


def main() -> None:
    p = argparse.ArgumentParser(prog="deploy")
    p.add_argument("agent", choices=["before", "starter"])
    args = p.parse_args()

    if args.agent == "before":
        print("agents/before/ runs locally on the raw Messages API — no deploy needed.")
        return
    from agents.starter.deploy import main as deploy
    deploy()


if __name__ == "__main__":
    main()
