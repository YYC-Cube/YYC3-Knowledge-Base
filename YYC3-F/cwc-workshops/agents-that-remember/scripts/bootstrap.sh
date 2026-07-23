#!/usr/bin/env bash
# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0
#
# One-command setup for the "Agents that remember" workshop:
# downloads the preview `ant` CLI, then creates the agent + environment
# and seeds the historical sessions the rest of the README assumes exist.
#
# Idempotent: skips the CLI download if ./ant is already present; reuses
# agent/env by name. Sessions are created fresh each run — re-running just
# gives Dreaming more history, which is fine.
set -euo pipefail

# Preview CLI bundle URL. Override with `export CWC_DIST_URL=...` if needed.
CWC_DIST_URL="${CWC_DIST_URL:-https://pkg.stainless.com/s/anthropic-cli/da90c7f7d47be61e2d45d8faa182a62c7c962d2e}"

# Run from the repo root regardless of where the script was invoked from.
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Pick up ANTHROPIC_API_KEY from .env if present.
[[ -f .env ]] && source .env
: "${ANTHROPIC_API_KEY:?ANTHROPIC_API_KEY must be set — copy .env.example to .env and fill it in}"

command -v jq >/dev/null || { echo "jq not found — install with: brew install jq (or apt-get install jq)" >&2; exit 1; }

echo "› CLI"
if [[ -x ./ant ]]; then
  echo "  reusing: ./ant ($(./ant --version 2>/dev/null || echo '?'))"
else
  case "$(uname -s)/$(uname -m)" in
    Darwin/arm64)            DIST="macos_darwin_arm64*"  ;;
    Darwin/x86_64)           DIST="macos_darwin_amd64*"  ;;
    Linux/x86_64)            DIST="linux_linux_amd64*"   ;;
    Linux/aarch64|Linux/arm64) DIST="linux_linux_arm64*" ;;
    *) echo "  unsupported platform: $(uname -s)/$(uname -m)" >&2; exit 1 ;;
  esac
  echo "  downloading $CWC_DIST_URL"
  curl -fsSL "$CWC_DIST_URL" -o dist.zip
  unzip -jo -qq dist.zip "$DIST/ant" -d .
  chmod +x ./ant
  echo "  installed: ./ant ($(./ant --version 2>/dev/null || echo '?'))"
fi
export PATH="$PWD:$PATH"
ant beta:dreams --help >/dev/null 2>&1 || { echo "  this build lacks beta:dreams — wrong dist URL?" >&2; exit 1; }

AGENT_NAME="cwc-agent"
ENV_NAME="cwc-env"
SYSTEM_PROMPT="You help me navigate Code w/ Claude 2026 — sessions, schedule, venue, and where to find resources."

echo "› Agent"
AGENT=$(ant beta:agents list --format jsonl --max-items -1 \
  | jq -r --arg n "$AGENT_NAME" 'select(.name==$n) | .id' | head -1)
if [[ -z "$AGENT" ]]; then
  AGENT=$(ant beta:agents create --name "$AGENT_NAME" --model '{"id":"claude-opus-4-7"}' \
    --tool '{"type":"agent_toolset_20260401"}' \
    --system "$SYSTEM_PROMPT" --format json | jq -r .id)
  echo "  created: $AGENT"
else
  echo "  reusing: $AGENT"
fi

echo "› Environment"
ENV=$(ant beta:environments list --format jsonl --max-items -1 \
  | jq -r --arg n "$ENV_NAME" 'select(.name==$n) | .id' | head -1)
if [[ -z "$ENV" ]]; then
  ENV=$(ant beta:environments create --name "$ENV_NAME" \
    --config '{"type":"cloud"}' --format json | jq -r .id)
  echo "  created: $ENV"
else
  echo "  reusing: $ENV"
fi

wait_idle() {
  local ses="$1"
  for _ in $(seq 1 60); do
    [[ "$(ant beta:sessions retrieve --session-id "$ses" --format json | jq -r .status)" == "idle" ]] && return 0
    sleep 2
  done
  echo "  ! timed out waiting for $ses to go idle; continuing anyway" >&2
}

seed_session() {
  local title="$1"; shift
  local ses
  ses=$(ant beta:sessions create --agent "$AGENT" --environment-id "$ENV" \
    --title "$title" --format json | jq -r .id)
  echo "  $ses  ($title)" >&2
  for msg in "$@"; do
    ant beta:sessions:events send --session-id "$ses" \
      --event "$(jq -nc --arg t "$msg" '{type:"user.message",content:[{type:"text",text:$t}]}')" >/dev/null
    wait_idle "$ses"
  done
  echo "$ses"
}

echo "› Seeding historical sessions (this takes a minute — the agent replies to each turn)"
HIST1=$(seed_session "Day 1 keynote notes" \
  "Saw the 9am opening keynote on the main stage — Ami Vora, Dianne Penn, Angela Jiang, Katelyn Lesse, Cat Wu, Boris Cherny. Big theme was agentic platforms. I've added my notes to https://example.com/notes/keynote." \
  "Angela and Katelyn focused on the Developer Platform, and Cat and Boris on Claude Code. If I can catch them at CwC I'll know where to direct my questions." \
  "Also caught 10.30 What's new on the Claude Platform session with Mahesh after.")
HIST2=$(seed_session "Ship your first Managed Agent" \
  "Just finished the 11am Ship your first Managed Agent workshop with Gagan Bhat. Put my notes at https://example.com/notes/ship-first-agent." \
  "I learned that agents are templates that define model and prompt configurataion, and environments are templates that define container configuration." \
  "Also learned that I can add MCP integrations and define client-side tools if I wish.")
HIST3=$(seed_session "Schedule" \
  "Full schedule is at claude.com/code-with-claude/san-francisco for Day 1 and claude.com/code-with-claude/san-francisco-extended for today." \
  "I'm attending Agents that Remember with Tina." \
  "My afternoon plan is the 1pm Eval-driven agent development with Felix, then the 2pm Skills and MCP workshop with Tanveer. Might skip one to catch the 3pm Agent Battle with Matt Roknich — that sounds fun.")

cat > .bootstrap-vars <<EOF
export ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"
export PATH="$PWD:\$PATH"
export AGENT="$AGENT"
export ENV="$ENV"
export HIST1="$HIST1"
export HIST2="$HIST2"
export HIST3="$HIST3"
EOF

echo
echo "✓ Bootstrap complete — wrote .bootstrap-vars"
echo
sed 's/^/  /; s/\(ANTHROPIC_API_KEY="sk-ant-[^-]*-\).\{8\}.*"/\1…<redacted>"/' .bootstrap-vars
echo
echo "Load them into your shell, then continue from §1 of the README:"
echo
echo "  source .bootstrap-vars"
