#!/usr/bin/env bash
# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

# Facilitator one-shot: start the shared leaderboard + wiki MCP,
# tunnel both, and print the env block participants paste.
#
#   ./host.sh           start everything; prints LEADERBOARD_URL etc.
#   ./host.sh --open    open the 30-min scoring window (run at GO)
#   ./host.sh --close   close the window early (board freezes)
#   ./host.sh --stop    tear down host services
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

KEY="${WORKSHOP_KEY:-devkey}"
DURATION="${DURATION:-1800}"
STATE_DIR="$(pwd)/.host-state"
mkdir -p "${STATE_DIR}"
URLFILE="${STATE_DIR}/host-urls.env"
ADMINFILE="${STATE_DIR}/admin-key"
export LB_SNAPSHOT="${STATE_DIR}/lb-snapshot.json"
# Facilitator-only key for /admin/session. Persisted so --open/--close
# work across invocations; never shared with participants.
[ -f "${ADMINFILE}" ] || python3 -c 'import secrets;print(secrets.token_hex(16))' > "${ADMINFILE}"
ADMIN_KEY="$(cat "${ADMINFILE}")"

say()  { printf "\033[1;36m▸\033[0m %s\n" "$*"; }
ok()   { printf "  \033[32m✓\033[0m %s\n" "$*"; }
die()  { printf "  \033[31m✗\033[0m %s\n" "$*"; exit 1; }

case "${1:-}" in
  --reset)
    say "resetting leaderboard (clears scores; tunnels + seed untouched)"
    rm -f "${LB_SNAPSHOT}"
    ps -eo pid,comm,args | awk '$2=="node" && index($0,"dev-server.mjs")>0 {print $1}' \
      | xargs -r kill 2>/dev/null
    sleep 1
    ( cd leaderboard && WORKSHOP_KEY="${KEY}" ADMIN_KEY="${ADMIN_KEY}" PORT=8888 \
        nohup node dev-server.mjs > /tmp/host-lb.log 2>&1 & )
    for _ in $(seq 1 10); do
      curl -fsS -m 2 http://localhost:8888/api/leaderboard >/dev/null 2>&1 && break
      sleep 1
    done
    ok "board cleared; tunnels + seed unchanged"
    [ -f "${URLFILE}" ] && { echo; echo "SHARE block (unchanged):"; cat "${URLFILE}"; }
    exit 0 ;;
  --stop)
    say "stopping host services..."
    pkill -f dev-server.mjs 2>/dev/null
    pkill -f wiki_mcp.py 2>/dev/null
    for p in 8888 8077; do
      ps -eo pid,args | grep "cloudflared.*:${p}\b" | grep -v grep \
        | awk '{print $1}' | xargs -r kill 2>/dev/null
    done
    rm -f "$URLFILE" /tmp/host-*.log
    ok "stopped"
    exit 0 ;;
  --open|--close)
    [ -f "$URLFILE" ] || die "no $URLFILE — run ./host.sh first"
    . "$URLFILE"
    action="${1#--}"
    say "${action} scoring window → ${LEADERBOARD_URL}/admin/session"
    body='{"action":"close"}'
    [ "$action" = "open" ] && body="{\"action\":\"open\",\"duration_seconds\":${DURATION}}"
    # Hit localhost directly (dev-server is on this machine) so a
    # flaky tunnel doesn't block the facilitator. Show errors.
    resp=$(curl -sS -m 10 -X POST "http://localhost:8888/api/admin/session" \
      -H "x-admin-key: ${ADMIN_KEY}" -H content-type:application/json \
      -d "$body" 2>&1) || die "request failed: $resp"
    echo "$resp" | python3 -m json.tool 2>/dev/null || echo "$resp"
    # Echo current window state via the public URL too (best-effort)
    curl -sS -m 5 "${LEADERBOARD_URL}/admin/session" 2>/dev/null \
      | python3 -m json.tool 2>/dev/null || true
    exit 0 ;;
esac

# ── cloudflared ─────────────────────────────────────────────────────
CF=$(command -v cloudflared || echo "${STATE_DIR}/cloudflared")
if [ ! -x "$CF" ]; then
  say "downloading cloudflared..."
  case "$(uname -s)-$(uname -m)" in
    Linux-x86_64)  asset=cloudflared-linux-amd64 ;;
    Linux-aarch64) asset=cloudflared-linux-arm64 ;;
    Darwin-arm64)  asset=cloudflared-darwin-arm64.tgz ;;
    Darwin-x86_64) asset=cloudflared-darwin-amd64.tgz ;;
    *) die "install cloudflared manually (brew install cloudflared)" ;;
  esac
  if [[ "$asset" == *.tgz ]]; then
    curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/${asset}" \
      | tar -xz -O cloudflared > "${STATE_DIR}/cloudflared"
  else
    curl -fsSL -o "${STATE_DIR}/cloudflared" \
      "https://github.com/cloudflare/cloudflared/releases/latest/download/${asset}"
  fi
  chmod +x "${STATE_DIR}/cloudflared"
  CF="${STATE_DIR}/cloudflared"
fi

# ── deps ────────────────────────────────────────────────────────────
[ -d leaderboard/node_modules ] || ( cd leaderboard && npm install --no-audit --no-fund --loglevel=error )
python3 -c "import mcp" 2>/dev/null || pip3 install -q -r requirements.txt

# ── leaderboard ─────────────────────────────────────────────────────
say "leaderboard"
if ! curl -fsS -m 2 http://localhost:8888/api/leaderboard >/dev/null 2>&1; then
  ( cd leaderboard && WORKSHOP_KEY="${KEY}" ADMIN_KEY="${ADMIN_KEY}" PORT=8888 \
      nohup node dev-server.mjs > /tmp/host-lb.log 2>&1 & )
  for _ in $(seq 1 10); do
    curl -fsS -m 2 http://localhost:8888/api/leaderboard >/dev/null 2>&1 && break; sleep 1
  done
fi
ok "dev-server :8888"
# Reuse an existing tunnel if one's already running for this port —
# spawning a duplicate gives a NEW URL and overwrites host-urls.env,
# diverging the SHARE block from what participants already have.
LB=""
if pgrep -f "cloudflared.*localhost:8888" >/dev/null 2>&1; then
  LB=$( { grep -ao 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/host-lb-tun.log 2>/dev/null || true; } | tail -1)
fi
if [ -z "$LB" ] || ! curl -fsS -m 5 "${LB}/api/leaderboard" >/dev/null 2>&1; then
  : > /tmp/host-lb-tun.log
  nohup "$CF" tunnel --url http://localhost:8888 > /tmp/host-lb-tun.log 2>&1 &
  for _ in $(seq 1 30); do
    LB=$( { grep -ao 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/host-lb-tun.log 2>/dev/null || true; } | tail -1)
    [ -n "$LB" ] && curl -fsS -m 5 "${LB}/api/leaderboard" >/dev/null 2>&1 && break
    sleep 2
  done
fi
[ -n "$LB" ] || die "leaderboard tunnel failed — see /tmp/host-lb-tun.log"
ok "tunnel ${LB}"

# ── wiki MCP ────────────────────────────────────────────────────────
say "wiki MCP"
if ! curl -fsS -m 2 http://localhost:8077/ >/dev/null 2>&1; then
  pkill -f wiki_mcp.py 2>/dev/null; sleep 1
  nohup python3 wiki_mcp.py > /tmp/host-wiki.log 2>&1 &
  sleep 2
fi
WIKI=""
if pgrep -f "cloudflared.*localhost:8077" >/dev/null 2>&1; then
  WIKI=$( { grep -ao 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/host-wiki-tun.log 2>/dev/null || true; } | tail -1)
fi
if [ -z "$WIKI" ]; then
  : > /tmp/host-wiki-tun.log
  nohup "$CF" tunnel --url http://localhost:8077 > /tmp/host-wiki-tun.log 2>&1 &
fi
for _ in $(seq 1 30); do
  WIKI=$( { grep -ao 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/host-wiki-tun.log 2>/dev/null || true; } | tail -1)
  if [ -n "$WIKI" ] && python3 -c "
from mcp.client.streamable_http import streamablehttp_client
from mcp import ClientSession
import asyncio
async def go():
    async with streamablehttp_client('${WIKI}/mcp') as (r,w,_):
        async with ClientSession(r,w) as s:
            await s.initialize()
asyncio.run(go())
" 2>/dev/null; then break; fi
  sleep 2
done
[ -n "$WIKI" ] || die "wiki tunnel failed — see /tmp/host-wiki-tun.log"
ok "tunnel ${WIKI}"

# ── seed ────────────────────────────────────────────────────────────
# Preserve the existing seed across re-runs so the SHARE block stays
# consistent. New seed only if MC_SEED is unset AND no prior URLFILE.
SEED="${MC_SEED:-}"
[ -z "$SEED" ] && [ -f "$URLFILE" ] && SEED="$(grep MC_SEED "$URLFILE" | sed -n "s/.*='\([^']*\)'.*/\1/p")"
[ -z "$SEED" ] && SEED="$(python3 -c 'import secrets; print(secrets.randbelow(10**18 - 10**17) + 10**17)')"

# ── persist + print ─────────────────────────────────────────────────
cat > "$URLFILE" <<EOF
export LEADERBOARD_URL='${LB}/api'
export LEADERBOARD_KEY='${KEY}'
export WIKI_MCP_URL='${WIKI}/mcp'
export MC_SEED='${SEED}'
EOF

echo
echo "════════════════════════════════════════════════════════════════"
echo " SHARE THIS WITH PARTICIPANTS ON OTHER MACHINES"
echo "════════════════════════════════════════════════════════════════"
cat "$URLFILE"
echo "════════════════════════════════════════════════════════════════"
echo
echo " If YOU are also a participant on THIS machine, use localhost"
echo " (your DNS may not resolve the tunnel from the host itself):"
echo "   export LEADERBOARD_URL='http://localhost:8888/api'"
echo "   export WIKI_MCP_URL='http://localhost:8077/mcp'"
echo "   export LEADERBOARD_KEY='${KEY}'"
echo "   export MC_SEED='${SEED}'"
echo
echo " Projector (open on shared screen): http://localhost:8888/?cast=1"
echo
echo " At GO:    ./host.sh --open      (opens ${DURATION}s scoring window)"
echo " To end:   ./host.sh --close     (freezes the board)"
echo " Cleanup:  ./host.sh --stop"
