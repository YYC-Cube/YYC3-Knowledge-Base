#!/usr/bin/env bash
# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

# Expose the bot's HTTP/MCP seam over a public cloudflared quick-tunnel
# so a cloud-side Managed Agent can reach it. Prints BOT_MCP_URL on
# success. Idempotent — reuses an existing tunnel if /tmp/cf-tunnel.log
# already has a live URL.
#
# Usage:
#   ./bot/tunnel.sh                  # prints BOT_MCP_URL=https://...
#   eval "$(./bot/tunnel.sh)"        # exports BOT_MCP_URL into your shell
#   ./bot/tunnel.sh --stop
set -euo pipefail

HTTP_PORT="${HTTP_PORT:-8088}"
LOG="/tmp/cf-tunnel-${HTTP_PORT}.log"
BIN="${CLOUDFLARED:-/tmp/cloudflared}"

if [ "${1:-}" = "--stop" ]; then
  pkill -x cloudflared 2>/dev/null || true
  rm -f "${LOG}"
  echo "[tunnel] stopped"
  exit 0
fi

if [ ! -x "${BIN}" ] && ! command -v cloudflared >/dev/null 2>&1; then
  case "$(uname -s)-$(uname -m)" in
    Linux-x86_64)   asset=cloudflared-linux-amd64 ;;
    Linux-aarch64)  asset=cloudflared-linux-arm64 ;;
    Darwin-arm64)   asset=cloudflared-darwin-arm64.tgz ;;
    Darwin-x86_64)  asset=cloudflared-darwin-amd64.tgz ;;
    *) echo "[tunnel] no prebuilt cloudflared for $(uname -s)-$(uname -m); install it yourself (e.g. brew install cloudflared)" >&2; exit 1 ;;
  esac
  echo "[tunnel] downloading cloudflared (${asset})..." >&2
  if [[ "${asset}" == *.tgz ]]; then
    curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/${asset}" \
      | tar -xz -O cloudflared > "${BIN}"
  else
    curl -fsSL -o "${BIN}" \
      "https://github.com/cloudflare/cloudflared/releases/latest/download/${asset}"
  fi
  chmod +x "${BIN}"
fi
[ -x "${BIN}" ] || BIN="$(command -v cloudflared)"

url="$(grep -ao 'https://[a-z0-9-]*\.trycloudflare\.com' "${LOG}" 2>/dev/null | tail -1 || true)"
if [ -z "${url}" ] || ! curl -fsS -m 5 "${url}/state" -o /dev/null 2>/dev/null; then
  echo "[tunnel] starting cloudflared for :${HTTP_PORT}..." >&2
  pkill -f "cloudflared tunnel --url http://localhost:${HTTP_PORT}" 2>/dev/null || true
  : > "${LOG}"
  nohup "${BIN}" tunnel --url "http://localhost:${HTTP_PORT}" > "${LOG}" 2>&1 &
  url=""
  for _ in $(seq 1 20); do
    sleep 1
    url="$(grep -ao 'https://[a-z0-9-]*\.trycloudflare\.com' "${LOG}" 2>/dev/null | tail -1 || true)"
    [ -n "${url}" ] && break
  done
fi

if [ -z "${url}" ]; then
  echo "[tunnel] failed — see ${LOG}" >&2
  exit 1
fi

# CMA's mcp_servers schema has no auth field, so the workshop runs the bot
# in dev mode (BOT_TOKEN unset → bot.js requireAuth is a no-op). The
# cloudflared subdomain itself is the effective access token — don't
# screen-share it. Pass through a caller-set BOT_TOKEN for non-CMA use.
BOT_TOKEN="${BOT_TOKEN:-}"

echo "export BOT_MCP_URL='${url}/mcp'"
if [ -n "${BOT_TOKEN}" ]; then
  echo "export BOT_TOKEN='${BOT_TOKEN}'"
  echo "[tunnel] ${url}/mcp (token: ${BOT_TOKEN:0:6}…)" >&2
else
  echo "[tunnel] ${url}/mcp (no BOT_TOKEN — bot in dev mode)" >&2
fi
