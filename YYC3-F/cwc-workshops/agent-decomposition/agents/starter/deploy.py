# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0
from agents import cma
from agents.starter.agent import build_config


def main() -> dict:
    return cma.deploy("starter", build_config)


if __name__ == "__main__":
    main()
