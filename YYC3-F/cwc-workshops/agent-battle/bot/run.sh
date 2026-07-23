#!/usr/bin/env bash
# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

# Launch the mineflayer bot with an 8 GB Node heap.
#
# WHY: mineflayer accumulates loaded chunks in memory as the bot moves
# around. The default Node heap is 4 GB, and we hit `Mark-Compact ...
# Allocation failed - JavaScript heap out of memory` after roughly 25
# minutes of continuous play. A workshop participant hitting OOM
# 25 minutes into a 60-minute session is the failure mode that kills the
# whole demo, so the heap bump is non-negotiable.
#
# Usage:
#   ./bot/run.sh                # foreground
#   ./bot/run.sh > log 2>&1 &   # background, log to file
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

# Match server.sh's default. server.sh and run.sh launch in separate process
# trees so an `export` in one doesn't reach the other; both must default it.
export TICK_RATE="${TICK_RATE:-80}"

# Bearer-token auth for /action and /mcp. Empty = auth disabled (dev mode).
# Workshop runs without it: CMA's mcp_servers schema has no auth field, so
# the cloudflared subdomain is the effective access token.
export BOT_TOKEN="${BOT_TOKEN:-}"

exec node --max-old-space-size=12288 bot.js "$@"
