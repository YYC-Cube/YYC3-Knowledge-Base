#!/usr/bin/env bash
# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

# Facilitator tool: mint a random 18-digit seed for an Agent Battle round
# and print paste-in commands for participants.
#
# Usage:  ./bot/mint-seed.sh
#
# The Agent Battle runs on a shared seed but separate local worlds. The
# facilitator runs this once at kickoff, then broadcasts the printed block
# (e.g. in the workshop chat). Each participant pastes it before starting
# their server so they all race the same randomly-generated world.
set -euo pipefail

# 18 digits keeps the seed in int64 range (max 9223372036854775807 — 19
# digits would sometimes exceed that and the server silently rejects it).
# /dev/urandom → shuf|od|awk each work; python3 is simplest and already a
# dep of server.sh.
SEED=$(python3 -c 'import secrets; print(secrets.randbelow(10**18 - 10**17) + 10**17)')

echo "Agent Battle seed minted: ${SEED}"
echo ""
echo "Broadcast these commands to participants:"
echo "─────────────────────────────────────────────"
echo "export MC_SEED=${SEED}"
echo "./bot/server.sh"
echo "─────────────────────────────────────────────"
echo ""
echo "Notes:"
echo "  - MC_SEED wipes bot/server/world/ and regenerates on the pinned seed."
echo "  - Each participant runs on their own local server (no shared host)."
echo "  - 45-minute wall-clock starts when the agent harness launches."
