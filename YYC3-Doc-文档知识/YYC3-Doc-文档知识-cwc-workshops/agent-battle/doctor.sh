#!/usr/bin/env bash
# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

# Pre-flight check for the Agent Battle workshop. Run this before the
# timer starts; fix any ✗ before running my_agent.py.
set -uo pipefail

ok=0; bad=0
pass() { printf "  ✓ %s\n" "$1"; ok=$((ok+1)); }
fail() { printf "  ✗ %s\n" "$1"; bad=$((bad+1)); }
note() { printf "    %s\n" "$1"; }

echo "── runtimes ──────────────────────────────────────────"
if command -v java >/dev/null 2>&1; then
  jv=$(java -version 2>&1 | head -1)
  major=$(java -version 2>&1 | grep -oE '"[0-9]+' | tr -d '"' | head -1)
  if [ "${major:-0}" -ge 17 ]; then pass "java ${jv}"
  else fail "java ${jv} — need 17+"; fi
else fail "java not found — install JDK 17+"; fi

if command -v node >/dev/null 2>&1; then
  nv=$(node --version)
  major=$(echo "$nv" | grep -oE 'v[0-9]+' | tr -d 'v')
  if [ "${major:-0}" -ge 18 ]; then pass "node ${nv}"
  else fail "node ${nv} — need 18+"; fi
else fail "node not found"; fi

if command -v python3 >/dev/null 2>&1; then
  pv=$(python3 --version 2>&1)
  pass "python ${pv}"
else fail "python3 not found"; fi

if python3 -c "import anthropic" 2>/dev/null; then
  av=$(python3 -c "import anthropic; print(anthropic.__version__)")
  pass "anthropic SDK ${av}"
else fail "anthropic SDK not installed — run: pip install -r requirements.txt"; fi

if [ -d bot/node_modules/mineflayer ]; then
  pass "bot deps installed (mineflayer present)"
else
  fail "bot deps missing — run: (cd bot && npm install)"
fi

echo
echo "── env vars ──────────────────────────────────────────"
[ -n "${ANTHROPIC_API_KEY:-}" ] && pass "ANTHROPIC_API_KEY set (${#ANTHROPIC_API_KEY} chars)" \
  || { fail "ANTHROPIC_API_KEY not set"; note "get one from console.anthropic.com → API Keys"; }
[ -n "${PARTICIPANT:-}" ] && pass "PARTICIPANT='${PARTICIPANT}'" \
  || fail "PARTICIPANT not set — your name on the leaderboard"
[ -n "${MC_SEED:-}" ] && pass "MC_SEED=${MC_SEED}" \
  || note "MC_SEED not set — facilitator announces at session start; server.sh uses pinned default until then"
[ -n "${LEADERBOARD_URL:-}" ] && pass "LEADERBOARD_URL=${LEADERBOARD_URL}" \
  || fail "LEADERBOARD_URL not set"
[ -n "${BOT_MCP_URL:-}" ] && pass "BOT_MCP_URL=${BOT_MCP_URL}" \
  || note "BOT_MCP_URL not set yet — run: eval \"\$(./bot/tunnel.sh)\" after the bot is up"

echo
echo "── env that can interfere ────────────────────────────"
npmreg=$(npm config get registry 2>/dev/null)
if [ -n "${npmreg}" ] && ! echo "${npmreg}" | grep -q "registry.npmjs.org"; then
  fail "npm registry is '${npmreg}' — bot/.npmrc should override, but if npm install fails, try: npm config set registry https://registry.npmjs.org"
fi
for v in HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ANTHROPIC_BASE_URL PIP_INDEX_URL; do
  if [ -n "${!v:-}" ]; then
    note "${v}=${!v} — may redirect traffic; unset if you hit auth/network errors"
  fi
done

echo
echo "── ports ─────────────────────────────────────────────"
for p in 25565 8088 3007; do
  if lsof -ti:"$p" -sTCP:LISTEN >/dev/null 2>&1; then
    pass "port :$p in use (expected if server/bot already running)"
  else
    note "port :$p free"
  fi
done

echo
echo "── services ──────────────────────────────────────────"
if curl -s -m 3 localhost:8088/state >/dev/null 2>&1; then
  state=$(curl -s -m 3 localhost:8088/state)
  if echo "$state" | grep -q "diamonds_collected"; then
    pass "bot on :8088 — responding, new code (diamonds_collected present)"
  else
    fail "bot on :8088 — OLD code (no diamonds_collected). Restart: ./bot/run.sh"
  fi
else
  note "bot not running yet — start with: ./bot/run.sh > /tmp/mc-bot.log 2>&1 &"
fi

if [ -n "${LEADERBOARD_URL:-}" ]; then
  if curl -s -m 5 "${LEADERBOARD_URL}/leaderboard" >/dev/null 2>&1; then
    pass "leaderboard reachable at ${LEADERBOARD_URL}"
  else
    fail "leaderboard NOT reachable at ${LEADERBOARD_URL}"
  fi
fi

if [ -n "${BOT_MCP_URL:-}" ]; then
  base="${BOT_MCP_URL%/mcp}"
  if curl -s -m 5 "${base}/state" >/dev/null 2>&1; then
    pass "tunnel reachable at ${base}"
  else
    fail "tunnel NOT reachable — re-run: eval \"\$(./bot/tunnel.sh)\""
  fi
fi

echo
echo "──────────────────────────────────────────────────────"
if [ "$bad" -eq 0 ]; then
  echo "✓ all checks passed (${ok} ok)"
  exit 0
else
  echo "✗ ${bad} check(s) failed, ${ok} ok — fix the ✗ items above before starting"
  exit 1
fi
