---
description: Figure out why the Agent Battle stack isn't working and fix it
---

Something broke mid-session. Diagnose and fix the infrastructure
without touching the participant's `AGENT` config.

## Health check (run all of these, then reason from the results)

```bash
echo "── processes ──"
ps -eo pid,comm,args | grep -E 'java.*server.jar|node.*bot.js|cloudflared|dev-server|wiki_mcp' | grep -v grep
echo "── bot state ──"
curl -fsS -m 3 http://localhost:8088/state 2>&1 | head -c 400 || echo "(unreachable)"
echo "── tunnel ──"
[ -f .env.setup ] && grep BOT_MCP_URL .env.setup
. .env.setup 2>/dev/null && curl -fsS -m 5 "${BOT_MCP_URL%/mcp}/state" 2>&1 | head -c 200 || echo "(unreachable)"
echo "── leaderboard ──"
curl -fsS -m 5 "${LEADERBOARD_URL:-http://localhost:8888/api}/leaderboard" 2>&1 | head -c 200 || echo "(unreachable)"
echo "── recent errors ──"
tail -20 /tmp/mc-server.log /tmp/mc-bot.log /tmp/cf-tunnel-8088.log 2>/dev/null
```

## Decision tree

- **No `java` process** → server died. `./setup.sh --restart`.
- **No `node bot.js` process** → bot died (often heap OOM after long
  runs, or kicked by server). `./setup.sh --restart`.
- **Bot state unreachable but process alive** → bot hung. Kill and
  restart: `./setup.sh --restart`.
- **Bot reachable locally, tunnel unreachable** → cloudflared died or
  DNS lag. `eval "$(./bot/tunnel.sh)"` to get a fresh tunnel; then
  `rm -f .agent_cache.json` so the next run picks up the new URL.
- **Leaderboard unreachable** → if `LEADERBOARD_URL` is a
  trycloudflare URL, the host's tunnel may be down — they need a new
  URL from the host. If it's `localhost:8888`, the participant is
  using the wrong block (localhost only works on the host's machine).
- **`my_agent.py` says "no tools"** or hangs at "looking for existing
  agent" forever → stale `.agent_cache.json` pointing at a dead agent
  or old tunnel. `rm -f .agent_cache.json` and retry.
- **Viewer at :8088/view is blank blue** → prismarine-viewer y<0 bug.
  `(cd bot && node patch-viewer.cjs) && ./setup.sh --restart`, then
  hard-refresh the browser (Cmd-Shift-R / Ctrl-Shift-R).

## When in doubt

```bash
./setup.sh --restart && rm -f .agent_cache.json
```

This is the universal fix: fresh world, fresh bot, fresh tunnel,
fresh agent. ~30s. Tell them to re-run `python3 my_agent.py`.

## Don't

- Don't touch `AGENT["system"]` or any participant-edited config —
  the problem is infrastructure, not their agent.
- Don't edit `bot/`, `harness/`, `setup.sh`, `host.sh` — workshop
  rules. If you find an actual bug in these, describe it; the
  facilitator can fix it upstream.
