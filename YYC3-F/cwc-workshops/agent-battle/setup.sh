#!/usr/bin/env bash
# Copyright 2026 Anthropic PBC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# One-shot setup for the Agent Battle workshop. Idempotent — safe to
# re-run; detects what's already up and skips it.
#
#   ./setup.sh              install deps, start bot stack, export env
#   ./setup.sh --stop       tear down everything this script started
#   ./setup.sh --restart    --stop then start fresh (new world)
#
# After it finishes:  python3 my_agent.py
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

say()  { printf "\033[1;32m▸\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m!\033[0m %s\n" "$*"; }
die()  { printf "\033[1;31m✗\033[0m %s\n" "$*"; exit 1; }
ok()   { printf "  \033[32m✓\033[0m %s\n" "$*"; }

# INSTANCE=N runs a second/third stack on offset ports (25565+N,
# 8088+N, 3007+N) with a separate world dir, .env.setup-N, and
# pidfile — for testing multiple participants on one machine.
INSTANCE="${INSTANCE:-}"
SUFFIX="${INSTANCE:+-${INSTANCE}}"
OFFSET="${INSTANCE:-0}"
export MC_PORT=$((25565 + OFFSET))
export HTTP_PORT=$((8088 + OFFSET))
export VIEWER_PORT=$((3007 + OFFSET))
ENVFILE=".env.setup${SUFFIX}"
PIDFILE="/tmp/agent-battle${SUFFIX}.pids"
# If LEADERBOARD_URL is already set to a non-localhost host (e.g. the
# facilitator's shared tunnel), use it and skip starting a local one.
# Otherwise default to a local in-memory dev-server.
if [ -n "${LEADERBOARD_URL:-}" ] && ! echo "${LEADERBOARD_URL}" | grep -qE 'localhost|127\.0\.0\.1'; then
  LOCAL_LB=0
  say "using shared leaderboard at ${LEADERBOARD_URL}"
else
  LOCAL_LB=1
fi

for arg in "$@"; do
  case "$arg" in
    --stop)
      say "stopping${INSTANCE:+ instance ${INSTANCE}}..."
      [ -f "$PIDFILE" ] && xargs -r kill 2>/dev/null < "$PIDFILE"
      # Belt-and-suspenders: kill THIS instance's processes by the
      # ports they listen on. Never touch dev-server.mjs, wiki_mcp.py,
      # or cloudflared on :8888/:8077 — those belong to host.sh and
      # killing them changes the room-wide URLs. Port-scoped so
      # INSTANCE=N never crosses over to other instances.
      lsof -ti:"${MC_PORT}" -sTCP:LISTEN 2>/dev/null | xargs -r kill -9 2>/dev/null
      lsof -ti:"${HTTP_PORT}" -sTCP:LISTEN 2>/dev/null | xargs -r kill 2>/dev/null
      lsof -ti:"${VIEWER_PORT}" -sTCP:LISTEN 2>/dev/null | xargs -r kill 2>/dev/null
      ps -eo pid,args | awk -v p=":${HTTP_PORT}" 'index($0,"cloudflared")>0 && index($0,p)>0 {print $1}' \
        | xargs -r kill 2>/dev/null
      ps -eo pid,comm,args | awk '$2~/^python/ && index($0,"my_agent.py")>0 {print $1}' | xargs -r kill 2>/dev/null
      rm -f "/tmp/cf-tunnel-${HTTP_PORT}.log"
      sleep 2
      [ -f "$PIDFILE" ] && xargs -r kill -9 2>/dev/null < "$PIDFILE"
      rm -f "$PIDFILE"
      ok "stopped"
      exit 0
      ;;
    --restart)
      # Restart server+bot but KEEP the cloudflared tunnel. At venues
      # where many participants share one NAT'd IP, every tunnel kill
      # + recreate counts against Cloudflare's per-IP quick-tunnel
      # quota; preserving it across --restart means each participant
      # creates exactly one tunnel for the whole session.
      say "restarting${INSTANCE:+ instance ${INSTANCE}} (server+bot; tunnel kept)..."
      lsof -ti:"${MC_PORT}" -sTCP:LISTEN 2>/dev/null | xargs -r kill -9 2>/dev/null
      lsof -ti:"${HTTP_PORT}" -sTCP:LISTEN 2>/dev/null | xargs -r kill 2>/dev/null
      lsof -ti:"${VIEWER_PORT}" -sTCP:LISTEN 2>/dev/null | xargs -r kill 2>/dev/null
      ps -eo pid,comm,args | awk '$2~/^python/ && index($0,"my_agent.py")>0 {print $1}' | xargs -r kill 2>/dev/null
      sleep 2
      sdir="bot/server${INSTANCE:+-i${INSTANCE}}"
      rm -rf "${sdir}/world" "${sdir}/server.properties" "${sdir}/ops.json"
      [ -f "$PIDFILE" ] && rm -f "$PIDFILE"
      shift
      ;;
    --no-leaderboard) LOCAL_LB=0 ;;
  esac
done

: > "$PIDFILE"

# ── 1. runtimes ──────────────────────────────────────────────────────
say "checking runtimes"
command -v java    >/dev/null || die "java not found — install JDK 17+ (mac: brew install openjdk@21, then symlink per README)"
command -v node    >/dev/null || die "node not found — install Node 18+"
command -v python3 >/dev/null || die "python3 not found"
ok "java $(java -version 2>&1 | head -1 | grep -oE '[0-9]+' | head -1), node $(node -v), python $(python3 --version 2>&1 | cut -d' ' -f2)"

# ── 2. deps (skip if already present) ───────────────────────────────
say "installing deps"
if ! python3 -c "import anthropic, httpx, mcp" 2>/dev/null; then
  # PEP 668 (externally-managed-environment) blocks bare pip on
  # Homebrew/Debian python. Try plain, then --user, then a venv.
  if ! pip3 install -q -r requirements.txt 2>/tmp/pip-err.log; then
    if grep -q "externally-managed-environment" /tmp/pip-err.log 2>/dev/null; then
      warn "system python is externally-managed — creating .venv/"
      python3 -m venv .venv
      ./.venv/bin/pip install -q -r requirements.txt || die "pip install (venv) failed"
      export PATH="${SCRIPT_DIR}/.venv/bin:${PATH}"
      ok "python deps (.venv — run 'source .venv/bin/activate' in new shells)"
    elif pip3 install -q --user -r requirements.txt 2>/dev/null; then
      ok "python deps (--user)"
    else
      cat /tmp/pip-err.log; die "pip install failed"
    fi
  else
    ok "python deps"
  fi
else
  ok "python deps"
fi
if [ ! -d bot/node_modules/mineflayer ]; then
  ( cd bot && npm install --no-audit --no-fund --loglevel=error ) || die "npm install (bot) failed — see error above"
fi
ok "bot deps"
if [ "$LOCAL_LB" = 1 ] && [ ! -d leaderboard/node_modules ]; then
  ( cd leaderboard && npm install --no-audit --no-fund --loglevel=error ) || die "npm install (leaderboard) failed — see error above"
fi

# ── 3. env ───────────────────────────────────────────────────────────
say "checking env"
# Event-day defaults: the facilitator commits live URLs/seed here
# so participants only export ANTHROPIC_API_KEY + PARTICIPANT +
# MINECRAFT_EULA. Shell exports take precedence so a re-share via
# Slack still works without a repo push.
_from_event() {
  [ -f .env.event ] || return 0
  local v; v=$(grep "^$1=" .env.event | head -1 | cut -d= -f2- | tr -d "'\"")
  [ -n "$v" ] && export "$1=$v" && echo "    $1 ← .env.event"
}
[ -z "${LEADERBOARD_URL:-}" ] && _from_event LEADERBOARD_URL
[ -z "${LEADERBOARD_KEY:-}" ] && _from_event LEADERBOARD_KEY
[ -z "${WIKI_MCP_URL:-}" ]    && _from_event WIKI_MCP_URL
[ -z "${MC_SEED:-}" ]         && _from_event MC_SEED
[ -n "${ANTHROPIC_API_KEY:-}" ] || die "ANTHROPIC_API_KEY not set — get one from console.anthropic.com → API Keys"
# Minecraft EULA — the user must accept it explicitly; we don't
# auto-accept on their behalf (LEGAL-6615). Honor a pre-set env
# var (so /cwc-setup and CI work) or prompt interactively.
if [ "${MINECRAFT_EULA:-}" != "accept" ]; then
  echo
  echo "  This workshop runs a local Minecraft server, which requires"
  echo "  agreeing to the Minecraft End User License Agreement:"
  echo "    https://www.minecraft.net/eula"
  if [ -t 0 ]; then
    printf "  Have you read and do you agree to the Minecraft EULA? [y/N] "
    read -r ans
    case "${ans}" in [yY]|[yY][eE][sS]) export MINECRAFT_EULA=accept;; esac
  fi
  [ "${MINECRAFT_EULA:-}" = "accept" ] || die "Minecraft EULA not accepted — set MINECRAFT_EULA=accept after reading https://www.minecraft.net/eula"
fi
[ -n "${PARTICIPANT:-}" ] || warn "PARTICIPANT not set — defaulting to '$(whoami)${SUFFIX}'"
export PARTICIPANT="${PARTICIPANT:-$(whoami)${SUFFIX}}"
export BOT_STATE_URL="http://localhost:${HTTP_PORT}"
# Minecraft login: ≤16 chars, [A-Za-z0-9_] only — anything else and the
# server fails to decode the hello packet. PARTICIPANT is the leaderboard
# display name (free-form); MC_USERNAME is what the bot actually logs in
# as. Sanitize so a long/punctuated PARTICIPANT doesn't break login.
_mcu="$(printf '%s' "${MC_USERNAME:-${PARTICIPANT}}" | tr -c 'A-Za-z0-9_' '_')"
export MC_USERNAME="${_mcu:0:16}"
[ -n "${MC_USERNAME}" ] || export MC_USERNAME="claude"
ok "ANTHROPIC_API_KEY set (${#ANTHROPIC_API_KEY} chars), PARTICIPANT='${PARTICIPANT}', mc_username='${MC_USERNAME}'"

# ── 4. local leaderboard (self-contained test) ──────────────────────
if [ "$LOCAL_LB" = 1 ]; then
  if curl -fsS -m 2 http://localhost:8888/api/leaderboard >/dev/null 2>&1; then
    ok "leaderboard already on :8888"
  else
    say "starting local leaderboard on :8888"
    ( cd leaderboard && WORKSHOP_KEY=devkey PORT=8888 \
        nohup node dev-server.mjs > /tmp/lb-dev.log 2>&1 & echo $! >> "$PIDFILE" )
    for _ in $(seq 1 10); do
      curl -fsS -m 2 http://localhost:8888/api/leaderboard >/dev/null 2>&1 && break
      sleep 1
    done
    ok "leaderboard :8888"
  fi
  export LEADERBOARD_URL="${LEADERBOARD_URL:-http://localhost:8888/api}"
  export LEADERBOARD_KEY="${LEADERBOARD_KEY:-devkey}"
fi

# ── 5. minecraft server ──────────────────────────────────────────────
# Check the bot is current code (has /view), not just any bot. A stale
# bot from a previous clone holding :HTTP_PORT serves /state but 404s
# on /view → users see "Cannot GET /view" and assume setup is broken.
if curl -fsS -m 2 "${BOT_STATE_URL}/state" 2>/dev/null | grep -q '"connected":true' \
   && curl -fsS -m 2 -o /dev/null -w '%{http_code}' "${BOT_STATE_URL}/view" 2>/dev/null | grep -q '^200$'; then
  ok "bot already running and connected"
else
  if lsof -ti:"${HTTP_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
    warn "stale process on :${HTTP_PORT} — killing and restarting"
    lsof -ti:"${HTTP_PORT}" -sTCP:LISTEN 2>/dev/null | xargs -r kill 2>/dev/null
    sleep 2
  fi
  SLOG="/tmp/mc-server${SUFFIX}.log"; BLOG="/tmp/mc-bot${SUFFIX}.log"
  sdir="bot/server${INSTANCE:+-i${INSTANCE}}"
  # If a server is already on the port but its ops.json doesn't match
  # the (sanitized) MC_USERNAME — wrong/old name, or the dir was wiped
  # while java kept running — kill it so server.sh regenerates ops.json.
  # Otherwise the bot logs in as a non-op and start_kit silently fails.
  if lsof -ti:"${MC_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
    if ! grep -q "\"name\": *\"${MC_USERNAME}\"" "${sdir}/ops.json" 2>/dev/null; then
      warn "server on :${MC_PORT} has stale ops (not '${MC_USERNAME}') — restarting it"
      lsof -ti:"${MC_PORT}" -sTCP:LISTEN 2>/dev/null | xargs -r kill -9 2>/dev/null
      for _ in $(seq 1 10); do
        lsof -ti:"${MC_PORT}" -sTCP:LISTEN >/dev/null 2>&1 || break; sleep 1
      done
    fi
  fi
  if ! lsof -ti:"${MC_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
    say "starting Minecraft server on :${MC_PORT} (first run downloads ~50MB jar)"
    nohup ./bot/server.sh ${INSTANCE:+--instance "i${INSTANCE}"} --port "${MC_PORT}" \
      > "${SLOG}" 2>&1 & echo $! >> "$PIDFILE"
    for _ in $(seq 1 90); do
      grep -q 'Done (' "${SLOG}" 2>/dev/null && break; sleep 1
    done
    grep -q 'Done (' "${SLOG}" 2>/dev/null || die "server failed — see ${SLOG}"
  fi
  # Verify ops.json names the current bot user — checked whether we
  # started the server or found it running.
  if ! grep -q "\"name\": *\"${MC_USERNAME}\"" "${sdir}/ops.json" 2>/dev/null; then
    die "ops.json missing or wrong user in ${sdir}/ — bot won't be op'd. Run: ./setup.sh --restart"
  fi
  ok "minecraft server :${MC_PORT} (op: ${MC_USERNAME})"

  # ── 6. bot ─────────────────────────────────────────────────────────
  say "starting bot on :${HTTP_PORT}"
  PARTICIPANT="${PARTICIPANT}" LEADERBOARD_URL="${LEADERBOARD_URL:-}" \
    LEADERBOARD_KEY="${LEADERBOARD_KEY:-}" \
    nohup ./bot/run.sh > "${BLOG}" 2>&1 & echo $! >> "$PIDFILE"
  for _ in $(seq 1 30); do
    grep -q 'spawned at' "${BLOG}" 2>/dev/null && break; sleep 1
  done
  grep -q 'spawned at' "${BLOG}" 2>/dev/null || die "bot failed — see ${BLOG}"
  ok "bot :${HTTP_PORT}, viewer :${VIEWER_PORT}"
fi

# ── 7. tunnel ────────────────────────────────────────────────────────
say "opening tunnel for CMA"
eval "$(./bot/tunnel.sh 2>/dev/null)" || die "tunnel failed — see /tmp/cf-tunnel-${HTTP_PORT}.log"
[ -n "${BOT_MCP_URL:-}" ] || die "tunnel did not export BOT_MCP_URL"
for _ in $(seq 1 20); do
  curl -fsS -m 5 "${BOT_MCP_URL%/mcp}/state" >/dev/null 2>&1 && break; sleep 2
done
ok "tunnel ${BOT_MCP_URL}"

# ── 8. write env for the agent ───────────────────────────────────────
rm -f "${ENVFILE}"
cat > "${ENVFILE}" <<EOF
export PARTICIPANT='${PARTICIPANT}'
export BOT_MCP_URL='${BOT_MCP_URL}'
export BOT_STATE_URL='${BOT_STATE_URL}'
export LEADERBOARD_URL='${LEADERBOARD_URL:-}'
export LEADERBOARD_KEY='${LEADERBOARD_KEY:-}'
export WIKI_MCP_URL='${WIKI_MCP_URL:-}'
export INSTANCE='${INSTANCE}'
EOF

echo
say "ready${INSTANCE:+ (instance ${INSTANCE})}"
echo
echo "  ┌─────────────────────────────────────────────────────────┐"
echo "  │ OPEN THIS IN YOUR BROWSER:                              │"
echo "  │   http://localhost:${HTTP_PORT}/view                            │"
echo "  │ (your bot's camera + diamond counter + inventory)       │"
echo "  └─────────────────────────────────────────────────────────┘"
echo
[ -n "${INSTANCE}" ] && echo "  INSTANCE=${INSTANCE} python3 my_agent.py    # 5-min run (this instance)" \
                     || echo "  python3 my_agent.py            # 5-min run — every run posts; best counts"
echo "  python3 my_agent.py --eval     # ~30-60s decision-probe scorecard (no run)"
[ "$LOCAL_LB" = 1 ] && echo "  open http://localhost:8888    (leaderboard)"
echo
echo "  ./setup.sh --restart           # fresh world + clean restart"
echo "  ./setup.sh --stop              # tear down"
