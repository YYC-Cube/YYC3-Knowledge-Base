#!/usr/bin/env python3
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

"""Workshop starter — Claude Managed Agents edition.

Anthropic runs the agent loop in the cloud. You point it at a Minecraft
bot exposed over MCP, give it a goal, and stream the events. Your job
is to *compose* the agent: choose what knowledge to attach, which model
to run, and what (if anything) to put in the prompt.

  python3 my_agent.py            5-min run, posts to the leaderboard
  python3 my_agent.py --eval     ~30-60s decision-probe scorecard

See README.md for context and harness/agent.py for a hand-rolled loop
that does the same thing without Managed Agents.
"""
import argparse
import atexit
import hashlib
import json
import os
import threading
import time
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import anthropic
import httpx

# Auto-load .env.setup (written by ./setup.sh) so `python3 my_agent.py`
# works straight after setup without an explicit `source .env.setup`.
# .env.setup is the source of truth for the *current* stack — its
# values OVERRIDE the shell env, because a stale BOT_MCP_URL from an
# earlier `source .env.setup` would otherwise pin a dead tunnel.
# INSTANCE=N reads .env.setup-N for a second/third stack on one machine.
_inst = os.environ.get("INSTANCE", "")
_env_file = Path(f".env.setup-{_inst}" if _inst else ".env.setup")
if _env_file.exists():
    for _line in _env_file.read_text().splitlines():
        _line = _line.removeprefix("export ").strip()
        if "=" in _line and not _line.startswith("#"):
            _k, _, _v = _line.partition("=")
            _v = _v.strip().strip("'\"")
            if _v:
                os.environ[_k.strip()] = _v

from harness.leaderboard import CostTracker, set_meta, report_narration  # noqa: E402
from harness.logging_ import RunLogger  # noqa: E402

# ── Facilitator-provided knowledge sources ──────────────────────────
# Real, working resources. INERT unless you reference them in your
# AGENT spec below. Each gives Claude Minecraft strategy a different
# way, at a different cost.
SKILL_MINING = "skills/mining"
#   ↑ A skill directory. Attaching it uploads the skill to YOUR
#     Anthropic account and bakes its content into the agent's
#     context every turn. Guaranteed to land; costs tokens every turn.
MCP_MINECRAFT_WIKI = {
    "type": "url", "name": "wiki",
    "url": os.environ.get("WIKI_MCP_URL", "http://localhost:8077/mcp"),
}
#   ↑ An MCP server with one tool: lookup(query) → fact. Attaching it
#     gives the agent the OPTION to look things up. Costs nothing
#     unless the agent calls it — which it may not, unless your
#     system prompt tells it the tool exists and is worth using.

# ====================== YOUR MANAGED AGENT ==========================
# This dict becomes the spec passed to client.beta.agents.create() —
# every key is a Managed Agents primitive. You're not configuring a
# script; you're configuring an agent that lives in your Anthropic
# account. See docs.anthropic.com/managed-agents.

AGENT: dict[str, Any] = dict(

    model = "claude-sonnet-4-6",     # try: claude-haiku-4-5, claude-opus-4-6

    system = "",                     # ← your agent's instructions go here

    skills = [
        # SKILL_MINING,              # ← uncomment to attach
    ],

    mcp_servers = [
        # MCP_MINECRAFT_WIKI,        # ← uncomment to attach
    ],

)

GOAL = "Mine as many diamonds as you can before the timer ends."
ALLOWED_TOOLS = None    # or a subset of the 9 bot actions to save tokens
MAX_TURNS = 200
# Coming soon: DREAMING = ...   (research-preview; facilitator will explain)
# ====================================================================


PARTICIPANT = os.environ.get("PARTICIPANT", "anon")
# Resolved inside main() so --dry-run works without a tunnel up. Matches
# the token bot/tunnel.sh mints + bot.js enforces; empty = dev mode.
BOT_MCP_URL = os.environ.get("BOT_MCP_URL", "")
BOT_TOKEN = os.environ.get("BOT_TOKEN", "")
TARGET = os.environ.get("TARGET", "diamond")
# Every run is exactly 5 minutes and posts to the leaderboard. There is
# no separate practice mode — best run counts, so iterate freely. The
# bot stamps run_elapsed_ms on every achievement and the leaderboard
# rejects anything past 305s, so changing this number locally only
# wastes your own time. Same for spawn depth/kit — fixed in bot.js.
RUN_SECONDS = 300

# Transport errors that warrant reopening the SSE event stream rather
# than aborting the run. The CMA session keeps running server-side
# regardless — the stream is just our window onto it.
_STREAM_RETRY = (
    httpx.RemoteProtocolError, httpx.ReadError, httpx.ReadTimeout,
    httpx.ConnectError, httpx.ConnectTimeout,
    anthropic.APIConnectionError,
)


_CACHE = Path(f".agent_cache-{_inst}.json" if _inst else ".agent_cache.json")


def _resolve_skills(client, cache, entries):
    """Turn AGENT['skills'] entries into CMA skill params. A string
    entry is a local skill directory — upload it once, cache the
    skill_id, reuse thereafter. A dict entry is passed through (e.g.
    an Anthropic-provided skill_id)."""
    out = []
    uploads = cache.setdefault("skills", {})
    for s in entries:
        if isinstance(s, dict):
            out.append(s)
            continue
        path = Path(s)
        files = sorted(p for p in path.rglob("*") if p.is_file())
        # API requires <dirname>/SKILL.md where <dirname> matches the
        # `name:` in SKILL.md's frontmatter; the local directory name
        # is the source of truth for both, so keep them in sync.
        payload = [(f"{path.name}/{f.relative_to(path)}", f.read_bytes())
                   for f in files]
        local_hash = hashlib.sha256(
            b"\0".join(name.encode() + b"\0" + body for name, body in payload)
        ).hexdigest()[:16]
        cached = uploads.get(str(path)) or {}
        if isinstance(cached, str):  # migrate old cache shape (bare id)
            cached = {"id": cached, "hash": None}
        sid = cached.get("id")
        if not sid:
            # display_title is unique per org. If a skill with this title
            # already exists (cache was wiped, or another process in the
            # same org uploaded it), reuse it instead of failing on create.
            existing = next((sk for sk in client.beta.skills.list()
                             if sk.display_title == path.name), None)
            if existing:
                sid = existing.id
            else:
                print(f"  uploading skill {path} ({len(files)} file(s))...", flush=True)
                sid = client.beta.skills.create(
                    display_title=path.name, files=payload
                ).id
                cached["hash"] = local_hash
        if cached.get("hash") != local_hash:
            print(f"  skill '{path.name}' content changed → new version", flush=True)
            client.beta.skills.versions.create(sid, files=payload)
            cached["hash"] = local_hash
        cached["id"] = sid
        uploads[str(path)] = cached
        out.append({"type": "custom", "skill_id": sid})
    return out


def _build_spec(client, cache):
    """Assemble the full CMA agent spec from the AGENT dict."""
    extra_mcp = list(AGENT.get("mcp_servers") or [])
    mcp_servers = [{"type": "url", "name": "minecraft", "url": BOT_MCP_URL}]
    mcp_servers.extend(extra_mcp)
    minecraft_toolset = {
        "type": "mcp_toolset",
        "mcp_server_name": "minecraft",
        "default_config": {"permission_policy": {"type": "always_allow"}},
    }
    if ALLOWED_TOOLS is not None:
        minecraft_toolset["allowed_tools"] = list(ALLOWED_TOOLS)
    tools = [minecraft_toolset] + [
        {
            "type": "mcp_toolset",
            "mcp_server_name": m["name"],
            "default_config": {"permission_policy": {"type": "always_allow"}},
        }
        for m in extra_mcp
    ]
    skills = _resolve_skills(client, cache, list(AGENT.get("skills") or []))
    spec = dict(
        model=AGENT["model"],
        system=AGENT.get("system", ""),
        mcp_servers=mcp_servers,
        tools=tools,
        # Always send skills (even []) — agents.update() is PATCH-style,
        # so omitting the key would leave a previously-attached skill in
        # place when the participant removes it from SKILLS.
        skills=skills,
    )
    if skills:
        # Skills are file-based; the agent needs the built-in `read`
        # tool to access them at runtime. Enable just that one.
        # always_allow is safe here: `read` runs in the ephemeral CMA
        # cloud environment (not the participant's machine), which
        # contains only the uploaded skill files. ask-mode would block
        # the autonomous run on requires_action for every skill read.
        tools.append({
            "type": "agent_toolset_20260401",
            "configs": [{
                "name": "read", "enabled": True,
                "permission_policy": {"type": "always_allow"},
            }],
        })
    return spec


def get_or_create(client):
    """Idempotent: one agent + environment per participant, reused across
    runs. IDs and a hash of the spec are cached in .agent_cache.json so
    re-runs skip the org-wide list() scan and only call update() when
    something in EDIT THESE actually changed."""
    agent_name = f"minecraft-{PARTICIPANT}"
    env_name = f"minecraft-env-{PARTICIPANT}"
    cache = json.loads(_CACHE.read_text()) if _CACHE.exists() else {}

    spec = _build_spec(client, cache)
    spec_hash = hashlib.sha256(
        json.dumps(spec, sort_keys=True, default=str).encode()
    ).hexdigest()[:16]

    agent_id = cache.get("agent_id")
    if agent_id and cache.get("spec_hash") == spec_hash:
        print(f"  reusing agent {agent_id} (config unchanged)", flush=True)
        agent = client.beta.agents.retrieve(agent_id)
    elif agent_id:
        print(f"  updating agent {agent_id} (config changed)", flush=True)
        cur = client.beta.agents.retrieve(agent_id)
        agent = client.beta.agents.update(agent_id, version=cur.version, **spec)
    else:
        # Cold path (no cache): just create. We used to scan
        # agents.list() for an existing match, but on a busy org that
        # linear scan can take minutes. Agent names aren't unique, so
        # a fresh create is fast and at worst leaves a stale duplicate
        # in the account from a prior clone — harmless.
        print(f"  creating agent '{agent_name}'...", flush=True)
        agent = client.beta.agents.create(name=agent_name, **spec)

    env_id = cache.get("env_id")
    if env_id:
        env = client.beta.environments.retrieve(env_id)
    else:
        print("  creating environment (container provision ~15-20s)...", flush=True)
        env = client.beta.environments.create(
            name=env_name,
            config={"type": "cloud", "networking": {"type": "unrestricted"}},
        )

    cache.update(agent_id=agent.id, env_id=env.id, spec_hash=spec_hash)
    _CACHE.write_text(json.dumps(cache, indent=2))
    return agent, env, spec


def _print_spec(agent, spec):
    """Show what the participant's AGENT dict became as a Managed
    Agent — the 'this is a real object in your account' moment."""
    sys = (spec.get("system") or "").strip()
    sys_preview = (sys.splitlines()[0][:60] + ("…" if len(sys) > 60 else "")
                   if sys else "(empty)")
    skills = spec.get("skills") or []
    mcps = spec.get("mcp_servers") or []
    print()
    print(f"  ┌─ Managed Agent: {agent.name}")
    print(f"  │  model        {spec['model']}")
    print(f"  │  system       {sys_preview!r}  ({len(sys)} chars)")
    print(f"  │  skills       {len(skills)} attached"
          + (f": {', '.join(s.get('skill_id','?')[:24] for s in skills)}"
             if skills else ""))
    print(f"  │  mcp_servers  " + ", ".join(
        f"{m['name']} → {m.get('url','')[:48]}…" for m in mcps))
    print(f"  │  tools        {sum(1 for t in spec['tools'] if t['type']=='mcp_toolset')} MCP toolset(s)"
          + (" + read (for skills)" if skills else ""))
    print(f"  └─ id: {agent.id}")
    print(f"     ↳ this agent now exists in your Anthropic account")
    print(f"       (console.anthropic.com → Agents → {agent.name})")
    print(flush=True)


def _log_turn(ctx, action_name, action_input, result_ok, result_body):
    """Emit a minimal `turn` event matching harness/logging_.py so
    harness/verify.py can consume this trace unchanged. We don't have a
    full GameState here; pass the MCP tool_result content as state.raw
    so at least inventory strings replay correctly."""
    if ctx.logger is None:
        return
    try:
        parsed = json.loads(result_body) if isinstance(result_body, str) else {}
    except Exception:
        parsed = {}
    state = parsed if isinstance(parsed, dict) else {}
    ctx.logger._write({
        "event": "turn",
        "ts": time.time(),
        "task": TARGET,
        "turn": ctx.cost.turns,
        "state": state,
        "action": {"name": action_name, "args": action_input or {}},
        "result": {"ok": bool(result_ok)},
        "inventory_delta": {},
    })
    ctx.logger.total_turns = ctx.cost.turns


def handle(event, ctx):
    """Process one SSE event. Returns True to keep streaming."""
    et = event.type
    if et == "agent.message":
        text = "".join(getattr(b, "text", "") for b in event.content)
        print(text, end="", flush=True)
        # Forward the agent's between-tool reasoning to the cast-view
        # chat ticker (kind='thought' renders dimmed). Fire-and-forget
        # so leaderboard latency never stalls the event stream.
        text = text.strip()
        if text:
            threading.Thread(
                target=report_narration, args=("thought", text[:280]),
                daemon=True,
            ).start()
    elif et == "agent.mcp_tool_use":
        ctx.cost.tick()  # one Minecraft action = one scored turn
        elapsed = int(time.monotonic() - (ctx.start_time or time.monotonic()))
        print(f"\n[{ctx.cost.turns}] {elapsed//60:02d}:{elapsed%60:02d}  "
              f"{event.name}({getattr(event, 'input', '')})")
        ctx.pending_tool = {"name": event.name, "input": getattr(event, "input", {})}
    elif et == "agent.mcp_tool_result":
        content = getattr(event, "content", None)
        body = getattr(content[0], "text", "") if isinstance(content, list) and content else str(content or "")
        ok = not getattr(event, "is_error", False)
        if ctx.pending_tool is not None:
            _log_turn(ctx, ctx.pending_tool["name"], ctx.pending_tool["input"], ok, body)
            ctx.pending_tool = None
        ctx.error_streak = 0 if ok else ctx.error_streak + 1
        if ctx.error_streak >= 8:
            ctx.done = (
                f"✗ {ctx.error_streak} consecutive tool errors — agent is stuck "
                f"or the bot/tunnel is unreachable. Check `curl localhost:8088/state`."
            )
    elif et == "span.model_request_end":
        usage = getattr(event, "model_usage", None)
        ctx.cost.note_usage(usage)
        if ctx.logger is not None:
            ctx.logger.note_usage(usage)
    elif et == "session.status_terminated":
        return False
    elif et == "session.status_idle":
        sr = getattr(getattr(event, "stop_reason", None), "type", None)
        return sr == "requires_action"
    # Deadline is primary; turn cap is a backstop so a runaway loop can't
    # burn tokens forever if the clock somehow drifts.
    if ctx.start_time is not None and time.monotonic() - ctx.start_time >= ctx.deadline:
        ctx.done = "⏰ time's up"
    elif ctx.cost.turns >= MAX_TURNS:
        ctx.done = f"✗ hit {MAX_TURNS}-turn cap"
    return not ctx.done


def main(dry_run=False, eval=False):
    global BOT_MCP_URL
    deadline = RUN_SECONDS
    mode = "EVAL" if eval else "RUN"
    model = AGENT["model"]
    set_meta(model=model, surface="managed-agents")
    logger = RunLogger.open("logs/cma", target=TARGET, model=model)
    ctx = SimpleNamespace(
        done=None, cost=CostTracker(), logger=logger,
        pending_tool=None, start_time=None, error_streak=0,
        deadline=deadline,
    )
    if dry_run:
        try:
            return _mock_stream(ctx)
        finally:
            _close_logger(ctx)

    if not BOT_MCP_URL:
        raise SystemExit(
            "BOT_MCP_URL is not set and no .env.setup found. "
            "Run `./setup.sh` first (it writes .env.setup with the tunnel URL)."
        )
    # Single-run lock: two my_agent.py against the same bot fight (the
    # second's reset_run TPs the first's bot back to y=-40 mid-run).
    # PID-based — stale lock from a crashed run is auto-cleared.
    lock = f".agent_running{('-' + os.environ['INSTANCE']) if os.environ.get('INSTANCE') else ''}.lock"
    try:
        old = int(open(lock).read().strip())
        os.kill(old, 0)  # raises if pid doesn't exist
        raise SystemExit(
            f"✗ another my_agent.py is already running (pid {old}).\n"
            f"  Ctrl-C it first, or wait for it to finish (~5 min).\n"
            f"  If you're sure it's dead: rm {lock}"
        )
    except (FileNotFoundError, ValueError, ProcessLookupError, PermissionError):
        pass
    with open(lock, "w") as f:
        f.write(str(os.getpid()))
    atexit.register(lambda: os.path.exists(lock) and os.remove(lock))
    # Preflight: verify the bot's MCP server is reachable AT THE TUNNEL
    # URL (not localhost). If CMA can't reach it, the agent silently gets
    # zero minecraft tools and replies "I can't play games". Quick-tunnels
    # die for many reasons (DNS lag, laptop sleep, VPN change, process
    # crash) — auto-recover by minting a fresh tunnel rather than failing.
    BOT_MCP_URL = _ensure_tunnel(BOT_MCP_URL)

    # Reset the bot for a fresh 5-min run: zero the diamond counter,
    # apply the fixed start_kit (TP to y=-40 lit room with iron_pickaxe
    # + spares), and stamp run_started_at so the leaderboard can reject
    # late achievements. Hit via localhost — tunnel DNS can lag and
    # reset_run must land before the agent's first turn.
    bot_base = os.environ.get("BOT_STATE_URL", "http://localhost:8088")
    h = {"Authorization": f"Bearer {BOT_TOKEN}"} if BOT_TOKEN else {}
    if not eval:
        _apply_reset(bot_base, h)

    print(f"participant: {PARTICIPANT}  mode: {mode}  deadline: {deadline}s",
          flush=True)
    print("connecting to Anthropic...", flush=True)
    client = anthropic.Anthropic(max_retries=10)
    print("registering Managed Agent (first run: ~30s, reruns: faster)...", flush=True)
    agent, env, spec = get_or_create(client)
    _print_spec(agent, spec)

    if eval:
        # Fast probe suite: synthetic game states → capture first action
        # → score against a rubric. ~60s, no real Minecraft run. Tests
        # whether the current config (prompt/skill/MCP/model) makes good
        # decisions, without 5 minutes of vein-luck noise.
        from harness import probes
        _close_logger(ctx)
        return probes.run(client, agent.id, env.id)

    print("starting session...", flush=True)
    session = client.beta.sessions.create(
        agent=agent.id, environment_id=env.id, title=f"{PARTICIPANT} → {TARGET}",
    )
    print(f"session: {session.id}  — streaming events (Ctrl-C to stop, deadline {deadline}s)\n", flush=True)
    # Stop the cloud-side session even if this process dies abruptly. CMA
    # keeps running independently of this stream; without an interrupt a
    # crashed client leaves the agent burning tokens until it idles.
    atexit.register(_stop_session, client, session.id)
    # Hard deadline: the per-event check in handle() only fires when an
    # event arrives, so a long tool call (e.g. go_near digging 80 blocks)
    # can overrun. This timer sends user.interrupt at deadline+5s, which
    # surfaces as a session event the stream loop sees and exits on.
    # Also halts whatever the BOT is doing (go_near can run minutes
    # past the deadline otherwise — harmless to scoring since the
    # leaderboard rejects late diamonds, but visually confusing).
    def _on_deadline():
        try:
            httpx.post(f"{bot_base}/action", json={"name": "stop"},
                       headers=h, timeout=3.0)
        except Exception:
            pass
        _stop_session(client, session.id)
    watchdog = threading.Timer(deadline + 5, _on_deadline)
    watchdog.daemon = True
    watchdog.start()
    ctx.start_time = time.monotonic()
    try:
        client.beta.sessions.events.send(
            session.id,
            events=[{"type": "user.message", "content": [{"type": "text", "text": GOAL}]}],
        )
        # The SSE stream can drop (proxy idle-timeout, wifi blip) while the
        # session keeps running server-side. Reconnect on transport errors
        # until handle() decides we're done or the deadline passes.
        while not ctx.done:
            try:
                with client.beta.sessions.events.stream(session.id) as stream:
                    for event in stream:
                        if not handle(event, ctx):
                            break
                    if ctx.done:
                        break
            except _STREAM_RETRY as e:
                if time.monotonic() - ctx.start_time >= ctx.deadline:
                    ctx.done = "⏰ time's up"
                    break
                print(f"\n[stream dropped: {type(e).__name__}; reconnecting…]", flush=True)
                time.sleep(2)
    except KeyboardInterrupt:
        ctx.done = "interrupted"
    finally:
        watchdog.cancel()
        ctx.cost.final()
        _stop_session(client, session.id)
        atexit.unregister(_stop_session)
        _close_logger(ctx)
        diamonds = _fetch_diamond_count()
        suffix = f" diamonds={diamonds}" if diamonds is not None else ""
        print(f"\n{ctx.done or 'session ended'}  turns={ctx.cost.turns} tokens={ctx.cost.tokens}{suffix}")


def _ensure_tunnel(url):
    """Return a BOT_MCP_URL that CMA can use. We deliberately do NOT
    test the public hostname from this machine — corp DNS / VPN / MDM
    on the participant's laptop often can't resolve *.trycloudflare.com
    even when the tunnel is fine globally. CMA connects from
    Anthropic's network, not here. What matters locally:
      (a) the bot is serving on localhost:HTTP_PORT
      (b) a cloudflared process is running for that port
      (c) the URL we hand CMA matches the running tunnel's log
    If any of those fail, re-run tunnel.sh to mint a fresh one."""
    import subprocess, re

    bot_local = os.environ.get("BOT_STATE_URL", "http://localhost:8088")
    http_port = bot_local.rsplit(":", 1)[-1]
    cflog = f"/tmp/cf-tunnel-{http_port}.log"

    def bot_up():
        try:
            r = httpx.get(f"{bot_local}/state", timeout=5.0)
            return r.status_code == 200 and "inventory" in r.text
        except Exception:
            return False

    def cloudflared_running():
        try:
            out = subprocess.run(["pgrep", "-fl", "cloudflared"],
                                 capture_output=True, text=True).stdout
            return f":{http_port}" in out
        except Exception:
            return False

    def url_in_log(u):
        try:
            host = u.rsplit("/mcp", 1)[0].split("://", 1)[-1]
            return host and host in open(cflog).read()
        except Exception:
            return False

    print("verifying bot + tunnel ...", flush=True)
    if not bot_up():
        raise SystemExit(
            f"✗ bot not responding at {bot_local}/state.\n"
            f"  Run: ./setup.sh --restart  (or /cwc-fix in Claude Code)"
        )
    print(f"  ✓ bot on {bot_local}", flush=True)

    if cloudflared_running() and url_in_log(url):
        print(f"  ✓ tunnel {url} (cloudflared running, URL matches log)",
              flush=True)
        return url

    print(f"  ↻ tunnel stale or not running — minting a fresh one",
          flush=True)
    try:
        out = subprocess.run(
            ["bash", "./bot/tunnel.sh"], capture_output=True, text=True,
            timeout=60, check=True,
        ).stdout
    except Exception as e:
        raise SystemExit(
            f"✗ could not start tunnel ({e}). Try: ./setup.sh --restart"
        )
    m = re.search(r"BOT_MCP_URL='([^']+)'", out)
    new = m.group(1) if m else ""
    if not new or not cloudflared_running():
        raise SystemExit(
            f"✗ tunnel.sh did not produce a running tunnel.\n"
            f"  Log: {cflog}\n  Try: ./setup.sh --restart"
        )
    print(f"  ✓ tunnel {new}", flush=True)
    # Wait briefly so Cloudflare's edge picks up the route before CMA
    # tries to connect. No local DNS check — see docstring.
    time.sleep(8)
    # Force re-registration with the new URL and persist it for next run.
    for p in (".agent_cache.json", f".agent_cache-{PARTICIPANT}.json"):
        try: os.remove(p)
        except FileNotFoundError: pass
    try:
        envfile = f".env.setup{('-' + os.environ['INSTANCE']) if os.environ.get('INSTANCE') else ''}"
        with open(envfile) as f:
            txt = f.read()
        with open(envfile, "w") as f:
            f.write(re.sub(r"BOT_MCP_URL='[^']*'", f"BOT_MCP_URL='{new}'", txt))
    except FileNotFoundError:
        pass
    return new


def _apply_reset(bot_base, headers):
    """Call reset_run and verify the start_kit landed (inventory has
    iron_pickaxe, position is at depth). Retries the whole thing —
    covers the bot reconnecting mid-call, transient op loss, or a
    /give that the server dropped."""
    last_err = ""
    for attempt in range(6):
        try:
            # 'stop' first to abort any in-flight/queued action (e.g. a
            # long go_near left over from --eval). Then reset_run.
            httpx.post(f"{bot_base}/action", json={"name": "stop"},
                       headers=headers, timeout=5.0)
            r = httpx.post(
                f"{bot_base}/action",
                json={"name": "reset_run", "args": {}},
                headers=headers, timeout=30.0,
            )
            r.raise_for_status()
            time.sleep(1.0)
            state = httpx.get(f"{bot_base}/state", headers=headers,
                              timeout=5.0).json()
            inv = {i.get("name") for i in state.get("inventory", [])}
            y = (state.get("position") or {}).get("y")
            kit_ok = {"iron_pickaxe", "iron_ingot", "crafting_table"} <= inv
            if kit_ok and y is not None and y < 0:
                return
            last_err = f"y={y}, kit={kit_ok}"
            print(f"  [start_kit] not applied yet ({last_err}); "
                  f"retrying…", flush=True)
        except Exception as e:  # noqa: BLE001
            last_err = str(e)
            print(f"  [start_kit] reset attempt {attempt+1} failed: {e}",
                  flush=True)
        time.sleep(2)
    if "timed out" in last_err.lower() or "timeout" in last_err.lower():
        raise SystemExit(
            "✗ reset_run timed out 6× — the bot is busy executing a "
            "long action (often a leftover from --eval).\n"
            "  Wait ~30s and retry, or: ./setup.sh --restart && rm -f .agent_cache.json"
        )
    raise SystemExit(
        "✗ start_kit did not apply after 6 retries — the bot's op "
        "commands (/tp, /give) are being rejected.\n"
        "  Cause: bot is not an operator (ops.json missing or wrong "
        "username).\n"
        "  Fix:  ./setup.sh --restart && rm -f .agent_cache.json\n"
        "  Then: ls bot/server*/ops.json   # should exist with your "
        "PARTICIPANT name"
    )


def _stop_session(client, session_id):
    """Interrupt then archive a CMA session. archive() rejects status=running,
    so send user.interrupt first. Idempotent and exception-safe — called from
    both the finally block and atexit (for crash paths)."""
    try:
        client.beta.sessions.events.send(
            session_id, events=[{"type": "user.interrupt"}]
        )
    except Exception:  # noqa: BLE001
        pass
    try:
        client.beta.sessions.archive(session_id)
    except Exception:  # noqa: BLE001
        pass


def _fetch_diamond_count():
    """GET the bot's /state and sum diamond counts in inventory.
    Returns None on any failure — this is pure feedback, not correctness."""
    base = os.environ.get("BOT_STATE_URL", "http://localhost:8088")
    headers = {}
    if BOT_TOKEN:
        headers["Authorization"] = f"Bearer {BOT_TOKEN}"
    try:
        r = httpx.get(f"{base}/state", headers=headers, timeout=5.0)
        r.raise_for_status()
        data = r.json()
    except Exception:  # noqa: BLE001 — best-effort feedback
        return None
    inv = data.get("inventory") if isinstance(data, dict) else None
    if not isinstance(inv, list):
        return None
    total = 0
    for item in inv:
        if isinstance(item, dict) and "diamond" in str(item.get("name", "")):
            total += int(item.get("count", 0) or 0)
    return total


def _close_logger(ctx):
    if ctx.logger is None:
        return
    try:
        # In Agent Battle mode the run always ends on timeout/cap, not on a
        # target-hit check — leave `reached` None and let verify.py/leaderboard
        # count diamond achievements from the logged turn stream.
        ctx.logger.run_end(SimpleNamespace(
            reached=None,
            failed_at=None, reason=str(ctx.done or "session ended"),
        ))
    finally:
        ctx.logger.close()
        ctx.logger = None


def _mock_stream(ctx):
    # Fresh start_time so the deadline check doesn't fire mid-loop; the mock
    # just plays a short fake stream and ends on session.status_idle.
    ctx.start_time = time.monotonic()
    fake = [
        SimpleNamespace(type="agent.message", content=[SimpleNamespace(text="planning…")]),
        SimpleNamespace(type="agent.mcp_tool_use", name="mine_block", input={"name": "oak_log"}),
        SimpleNamespace(type="span.model_request_end",
                        model_usage=SimpleNamespace(input_tokens=900, output_tokens=100)),
        SimpleNamespace(type="agent.mcp_tool_result",
                        content='{"inventory":[{"name":"oak_log","count":1}]}'),
        SimpleNamespace(type="session.status_idle",
                        stop_reason=SimpleNamespace(type="end_turn")),
    ]
    for ev in fake:
        if not handle(ev, ctx):
            break
    assert ctx.cost.turns == 1, ctx.cost.turns
    assert ctx.cost.tokens == 1000, ctx.cost.tokens
    # Deadline mode: no early-exit on inventory content, so ctx.done stays None
    # through the mock — the real run ends on timeout or turn cap.
    assert ctx.done is None, ctx.done
    print(f"\nmock ok: turns={ctx.cost.turns} tokens={ctx.cost.tokens}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--eval", action="store_true",
                    help="run the fast probe suite (~60s, 6 synthetic "
                         "scenarios) instead of a real Minecraft run. "
                         "Scores your current config's decision-making "
                         "without vein-luck noise.")
    main(**{k.replace("-", "_"): v for k, v in vars(ap.parse_args()).items()})
