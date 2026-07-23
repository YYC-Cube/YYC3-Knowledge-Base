#!/usr/bin/env bash
# Workshop step: update the deal-team agent in place to add the multiagent
# roster. Creates a new agent version; the UI's "multiagent" toggle uses
# latest (this) vs the pinned base version (solo).
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

: "${AGENT_DEAL_TEAM_ID:?run bin/setup.sh first}"
: "${AGENT_SUB_IDS:?run bin/setup.sh first}"

ver=$(ant beta:agents retrieve --agent-id "$AGENT_DEAL_TEAM_ID" --transform version -r)
roster=$(jq -cn --arg ids "$AGENT_SUB_IDS" '$ids | split(",")')

new_ver=$(ant beta:agents update --agent-id "$AGENT_DEAL_TEAM_ID" --version "$ver" \
  --multiagent "{\"type\":\"coordinator\",\"agents\":$roster}" \
  --transform version -r)

echo "✓ $AGENT_DEAL_TEAM_ID -> v$new_ver (multiagent enabled)"
