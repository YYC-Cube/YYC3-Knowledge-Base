// Copyright 2026 Anthropic PBC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Local dev server — serves static files + Netlify Functions without Netlify CLI.
 * Usage: node dev-server.mjs
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import jwt from 'jsonwebtoken';

config(); // load .env

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC = join(__dirname, 'public');
const BASE_PORT = parseInt(process.env.PORT || '3000', 10);
const IN_MEMORY = !process.env.SUPABASE_URL;
const WORKSHOP_KEY = process.env.WORKSHOP_KEY || '';
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const JWT_SECRET = process.env.JWT_SECRET || 'workshop-secret-change-me';

function findAvailablePort(start) {
  return new Promise((resolve, reject) => {
    const try_ = (port) => {
      const probe = createServer();
      probe.once('error', (err) => {
        if (err.code === 'EADDRINUSE') try_(port + 10);
        else reject(err);
      });
      probe.once('listening', () => probe.close(() => resolve(port)));
      probe.listen(port);
    };
    try_(start);
  });
}

const PORT = await findAvailablePort(BASE_PORT);

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon',
};

// Dynamically import function handlers — only when Supabase is configured,
// since each module calls createClient(SUPABASE_URL, …) at import time.
let fns = null;
if (!IN_MEMORY) {
  fns = {
    login: (await import('./netlify/functions/login.mjs')).default,
    tasks: (await import('./netlify/functions/tasks.mjs')).default,
    leaderboard: (await import('./netlify/functions/leaderboard.mjs')).default,
    admin: (await import('./netlify/functions/admin.mjs')).default,
    achievement: (await import('./netlify/functions/achievement.mjs')).default,
    cost: (await import('./netlify/functions/cost.mjs')).default,
    narration: (await import('./netlify/functions/narration.mjs')).default,
  };
}

// ─── In-memory mode ─────────────────────────────────────────────────────────
// Lets the cast view run without Supabase. State lives in this process.
const TASK_POINTS = {
  wooden_pickaxe: 200, stone_pickaxe: 200, furnace: 200, iron_ingot: 400,
  iron_pickaxe: 200, diamond: 200,
  first_block: 100, chat_to_player: 100, meet_a_friend: 100,
  home_builder: 100, light_it_up: 100, deep_diver: 100,
};
const MILESTONE_IDS = new Set(['wooden_pickaxe', 'stone_pickaxe', 'furnace', 'iron_ingot', 'iron_pickaxe', 'diamond']);

// Agent Battle: diamond_N IDs (N = 1, 2, …) are accepted dynamically with
// points=0. They carry no score weight — leaderboard sorts by the count
// of diamond_* rows desc, with tokens asc as the tiebreaker.
const DIAMOND_RE = /^diamond_\d+$/;
function pointsFor(id) {
  if (TASK_POINTS[id] !== undefined) return TASK_POINTS[id];
  if (DIAMOND_RE.test(id)) return 0;
  return undefined; // unknown → rejected
}

const MAX_RUN_MS = 305_000;  // 5 min + 5s grace; bot.js stamps run_elapsed_ms
// Persistent path (repo dir, not /tmp — tmpfs is wiped on reboot).
const SNAPSHOT = process.env.LB_SNAPSHOT
  || new URL('../.host-state/lb-snapshot.json', import.meta.url).pathname;

const mem = {
  participants: new Map(), // name -> {id, name, completed_tasks:Set, runs:Map, last_activity}
  narrations: [],          // {participant, kind, text, ts}
  session: null,           // {opened_at, closed_at, duration_seconds} — latest only
};

// Persist mem to disk so a host process restart doesn't wipe the
// board mid-session. Best-effort — load on boot, save on each write.
import { readFileSync, writeFileSync } from 'node:fs';
try {
  const s = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
  for (const p of s.participants || []) {
    // Snapshot may have completed_tasks as an array (old Set) or
    // an object (new Map id→ts). Hydrate either; old entries get a
    // null ts which inWindow() treats as out-of-window once a
    // session is opened — safe (those scores are pre-snapshot-format
    // and would predate any new window anyway).
    const ct = Array.isArray(p.completed_tasks)
      ? new Map(p.completed_tasks.map((id) => [id, null]))
      : new Map(Object.entries(p.completed_tasks || {}));
    mem.participants.set(p.name, {
      ...p,
      completed_tasks: ct,
      runs: new Map(Object.entries(p.runs || {})),
    });
  }
  mem.narrations = s.narrations || [];
  mem.session = s.session || null;
  console.log(`[snapshot] restored ${mem.participants.size} participants from ${SNAPSHOT}`);
} catch { /* no snapshot yet */ }

let _saveT = null;
function saveSnapshot() {
  if (_saveT) return;
  _saveT = setTimeout(() => {
    _saveT = null;
    try {
      writeFileSync(SNAPSHOT, JSON.stringify({
        participants: [...mem.participants.values()].map((p) => ({
          ...p,
          completed_tasks: Object.fromEntries(p.completed_tasks),
          runs: Object.fromEntries(p.runs),
        })),
        narrations: mem.narrations.slice(-200),
        session: mem.session,
      }));
    } catch (e) { console.log('[snapshot] save failed:', e.message); }
  }, 500);
}

// Dev convenience: if no session has ever been opened, treat the window
// as always-open so local testing works without admin steps. Once a
// session is opened, the window is enforced strictly.
function sessionWindow() {
  const s = mem.session;
  if (!s) return { open: true, devAlwaysOpen: true };
  const opened = new Date(s.opened_at).getTime();
  const closes = s.closed_at
    ? new Date(s.closed_at).getTime()
    : opened + (s.duration_seconds || 2700) * 1000;
  const now = Date.now();
  const open = now >= opened && now <= closes;
  return {
    open, opened_at: s.opened_at,
    closes_at: new Date(closes).toISOString(),
    remaining_seconds: open ? Math.max(0, Math.floor((closes - now) / 1000)) : 0,
  };
}

function memParticipant(name) {
  if (!mem.participants.has(name)) {
    mem.participants.set(name, {
      // id -> ISO timestamp of first achievement. Timestamped so the
      // leaderboard can filter by session window — a re-`--open`
      // (e.g. reboot recovery) moves opened_at and stale pre-window
      // achievements must drop out, same as p.runs already does.
      id: name, name, completed_tasks: new Map(),
      // run_id -> {tokens, turns, diamonds, updated_at}
      runs: new Map(),
      last_activity: null,
    });
  }
  return mem.participants.get(name);
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// Mirrors netlify/functions/_auth.mjs. Accepts Bearer participant JWT
// (with participant claim matching body.participant), Bearer admin JWT,
// or the legacy x-workshop-key shared secret. In local dev with no
// WORKSHOP_KEY and no JWT_SECRET override, allows everything.
function authWebhookMem(req, bodyParticipant) {
  const auth = req.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) {
    let claims;
    try { claims = jwt.verify(auth.slice(7), JWT_SECRET); }
    catch { return { ok: false, status: 401, error: 'invalid token' }; }
    if (claims.admin === true) return { ok: true };
    if (claims.typ !== 'participant' || !claims.participant) {
      return { ok: false, status: 401, error: 'not a participant token' };
    }
    if (bodyParticipant && bodyParticipant !== claims.participant) {
      return { ok: false, status: 401, error: 'participant mismatch' };
    }
    return { ok: true };
  }
  if (WORKSHOP_KEY) {
    return req.headers.get('x-workshop-key') === WORKSHOP_KEY
      ? { ok: true }
      : { ok: false, status: 401, error: 'unauthorized' };
  }
  return { ok: true }; // pure local dev, no secrets configured
}

function verifyFacilitatorMem(req) {
  const auth = req.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) {
    try {
      const d = jwt.verify(auth.slice(7), JWT_SECRET);
      if (d.admin === true) return true;
    } catch { /* fall through */ }
  }
  // Admin actions (open/close/reset window) require ADMIN_KEY, which is
  // NOT shared with participants. WORKSHOP_KEY (= participant LEADERBOARD_KEY)
  // is write-auth for achievement/cost only. If ADMIN_KEY is unset, fall
  // back to WORKSHOP_KEY for solo-dev convenience — host.sh always sets it.
  const need = ADMIN_KEY || WORKSHOP_KEY;
  if (need && req.headers.get('x-admin-key') === need) return true;
  if (!need) return true;
  return false;
}

const memHandlers = {
  async achievement(req) {
    if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
    const { participant, id, run_elapsed_ms } = await req.json().catch(() => ({}));
    if (!participant || !id) return json({ error: 'participant and id required' }, 400);
    const a = authWebhookMem(req, participant);
    if (!a.ok) return json({ error: a.error }, a.status);
    if (!sessionWindow().open) return json({ error: 'session not open' }, 403);
    // Hard 5-min run cap, enforced server-side. bot.js stamps elapsed
    // since reset_run; anything past 305s is from an over-long run.
    // null/missing = old bot; reject so participants must update.
    if (typeof run_elapsed_ms !== 'number' || run_elapsed_ms > MAX_RUN_MS) {
      return json({ error: `run_elapsed_ms ${run_elapsed_ms} outside 0..${MAX_RUN_MS}` }, 403);
    }
    const points = pointsFor(id);
    if (points === undefined) return json({ error: `unknown achievement: ${id}` }, 400);
    const p = memParticipant(participant);
    p.completed_tasks.set(id, new Date().toISOString());
    p.last_activity = new Date().toISOString();
    // Track the live run's clock so the cast view can show
    // per-participant time remaining (computed from server-side
    // wall time minus stored remaining-at-last-achievement).
    p.live_run = { at: Date.now(), remaining_ms: MAX_RUN_MS - run_elapsed_ms };
    saveSnapshot();
    return json({ ok: true, participant_id: p.id, task_id: id, points });
  },

  async cost(req) {
    if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
    const { participant, tokens, turns, diamonds = 0, run_id } = await req.json().catch(() => ({}));
    if (!participant || tokens === undefined || turns === undefined) {
      return json({ error: 'participant, tokens, turns required' }, 400);
    }
    const a = authWebhookMem(req, participant);
    if (!a.ok) return json({ error: a.error }, a.status);
    if (!sessionWindow().open) return json({ error: 'session not open' }, 403);
    const p = memParticipant(participant);
    // Mark live on /cost too — achievements only fire on diamond pickup,
    // so a participant who's running but hasn't found one yet would
    // otherwise show as idle on the cast view.
    p.last_activity = new Date().toISOString();
    const rid = run_id || 'default';
    // diamonds is self-reported (participant owns the bot AND the harness;
    // there is no trusted source). Real integrity = top-3 verify.py replay
    // + live re-run. This monotonic clamp just makes the trivial curl cheat
    // show as a slow climb on the projector instead of an instant spike.
    const prev = p.runs.get(rid);
    const prevD = prev?.diamonds ?? 0;
    const reqD = Math.max(0, Math.round(diamonds));
    const clampedD = Math.max(prevD, Math.min(reqD, prevD + 10));
    p.runs.set(rid, {
      tokens: Math.round(tokens), turns: Math.round(turns),
      diamonds: clampedD,
      updated_at: new Date().toISOString(),
    });
    saveSnapshot();
    return json({ ok: true, diamonds: clampedD, clamped: clampedD !== reqD });
  },

  async session(req) {
    if (req.method === 'GET') return json(sessionWindow());
    if (req.method !== 'POST') return json({ error: 'POST or GET only' }, 405);
    if (!verifyFacilitatorMem(req)) return json({ error: 'facilitator auth required' }, 401);
    const { action, duration, duration_seconds } = await req.json().catch(() => ({}));
    if (action === 'open') {
      mem.session = {
        opened_at: new Date().toISOString(),
        closed_at: null,
        duration_seconds: Math.round(duration_seconds ?? duration) || 1800,
      };
      saveSnapshot();
      return json({ ok: true, session: mem.session });
    }
    if (action === 'close') {
      if (!mem.session || mem.session.closed_at) return json({ error: 'no open session' }, 400);
      mem.session.closed_at = new Date().toISOString();
      saveSnapshot();
      return json({ ok: true });
    }
    return json({ error: 'action must be "open" or "close"' }, 400);
  },

  async narration(req) {
    const url = new URL(req.url);
    if (req.method === 'GET') {
      const since = parseInt(url.searchParams.get('since') || '0', 10);
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '200', 10), 500);
      const rows = mem.narrations.filter((n) => n.ts > since).slice(-limit);
      return json({ narrations: rows });
    }
    if (req.method !== 'POST') return json({ error: 'POST or GET only' }, 405);
    const { participant, kind, text } = await req.json().catch(() => ({}));
    if (!participant || !text) return json({ error: 'participant and text required' }, 400);
    const a = authWebhookMem(req, participant);
    if (!a.ok) return json({ error: a.error }, a.status);
    memParticipant(participant);
    mem.narrations.push({
      participant, name: participant, kind: kind || 'chat',
      text: String(text).slice(0, 500), ts: Date.now(),
    });
    if (mem.narrations.length > 500) mem.narrations.splice(0, mem.narrations.length - 500);
    return json({ ok: true });
  },

  async leaderboard(req) {
    if (req.method !== 'GET') return json({ error: 'GET only' }, 405);
    const w = sessionWindow();
    const inWindow = (ts) => w.devAlwaysOpen
      || (ts && ts >= w.opened_at && ts <= w.closes_at);
    const rows = [...mem.participants.values()].map((p) => {
      const tasks = [...p.completed_tasks.entries()]
        .filter(([, ts]) => inWindow(ts))
        .map(([id]) => id);
      const pts = tasks.reduce((s, t) => s + (pointsFor(t) || 0), 0);
      // Best single run within the session window: max diamonds, then min tokens.
      let best = null;
      for (const [rid, r] of p.runs) {
        if (!inWindow(r.updated_at)) continue;
        if (!best
            || r.diamonds > best.diamonds
            || (r.diamonds === best.diamonds && r.tokens < best.tokens)) {
          best = { run_id: rid, ...r };
        }
      }
      // bot.js posts diamond_N achievements (N = per-run counter, reset
      // by reset_run). Across runs the Set accumulates diamond_1..max,
      // so max(N) is the best single run's count. Use that as the
      // primary signal — the cost-POST `diamonds` field is often 0
      // because the harness doesn't always include it.
      const diamondNs = tasks
        .map((t) => { const m = /^diamond_(\d+)$/.exec(t); return m ? +m[1] : 0; })
        .filter((n) => n > 0);
      // Only count server-gated achievements (each diamond_N POST is
      // rejected past run_elapsed_ms=305s). The /cost 'diamonds' field
      // is self-reported and NOT time-gated, so a run that overran the
      // watchdog could inflate it. Achievements are the source of truth.
      const diamondsCount = diamondNs.length ? Math.max(...diamondNs) : 0;
      return {
        id: p.id, name: p.name,
        achievement_points: pts,
        tokens: best?.tokens ?? 0,
        turns: best?.turns ?? 0,
        diamonds_count: diamondsCount,
        best_run_id: best?.run_id ?? null,
        runs: Object.fromEntries(p.runs),
        runs_count: p.runs.size,
        run_remaining_s: (() => {
          if (!p.live_run) return null;
          const left = Math.round((p.live_run.remaining_ms - (Date.now() - p.live_run.at)) / 1000);
          return left > 0 ? left : null;
        })(),
        milestones: tasks.filter((t) => MILESTONE_IDS.has(t)).length,
        quests: tasks.filter((t) => !MILESTONE_IDS.has(t) && !DIAMOND_RE.test(t)).length,
        completed_tasks: tasks,
        last_activity: p.last_activity,
      };
    }).sort((a, b) => {
      // Agent Battle: best-run diamonds desc, then that run's tokens asc.
      if (b.diamonds_count !== a.diamonds_count) return b.diamonds_count - a.diamonds_count;
      return a.tokens - b.tokens;
    });
    return json({ leaderboard: rows });
  },
};

function toRequest(req, body) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  return new Request(url.href, {
    method: req.method,
    headers: req.headers,
    body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? body : undefined,
  });
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString();
}

async function handleFunction(handler, req, res) {
  const body = await readBody(req);
  const request = toRequest(req, body);
  const response = await handler(request);
  res.writeHead(response.status || 200, Object.fromEntries(response.headers.entries()));
  res.end(await response.text());
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  try {
    // Route API calls to function handlers
    if (IN_MEMORY) {
      if (path === '/api/achievement') return handleFunction(memHandlers.achievement, req, res);
      if (path === '/api/cost') return handleFunction(memHandlers.cost, req, res);
      if (path === '/api/narration') return handleFunction(memHandlers.narration, req, res);
      if (path === '/api/leaderboard') return handleFunction(memHandlers.leaderboard, req, res);
      if (path === '/api/admin/session') return handleFunction(memHandlers.session, req, res);
      if (path === '/api/login/participant-token') return handleFunction(async (r) => {
        if (!verifyFacilitatorMem(r)) return json({ error: 'facilitator auth required' }, 401);
        const { participant = '' } = await r.json().catch(() => ({}));
        const name = String(participant).trim().slice(0, 50);
        if (!name) return json({ error: 'participant required' }, 400);
        const token = jwt.sign({ participant: name, typ: 'participant' }, JWT_SECRET, { expiresIn: '30d' });
        return json({ token, participant: name });
      }, req, res);
      if (path === '/api/login') return handleFunction(async (r) => {
        const { name = 'viewer', workshop_alias = 'live' } = await r.json().catch(() => ({}));
        return json({ token: 'dev', name, workshop_id: 'mem', workshop_alias });
      }, req, res);
      if (path === '/api/tasks') return handleFunction(async () => json({ tasks: [] }), req, res);
      if (path.startsWith('/api/')) return handleFunction(async () =>
        json({ error: 'in-memory mode: endpoint requires Supabase' }, 501), req, res);
    } else {
      if (path === '/api/login' || path === '/api/login/participant-token') return handleFunction(fns.login, req, res);
      if (path.startsWith('/api/tasks')) return handleFunction(fns.tasks, req, res);
      if (path === '/api/leaderboard') return handleFunction(fns.leaderboard, req, res);
      if (path.startsWith('/api/admin')) return handleFunction(fns.admin, req, res);
      if (path === '/api/achievement') return handleFunction(fns.achievement, req, res);
      if (path === '/api/cost') return handleFunction(fns.cost, req, res);
      if (path === '/api/narration') return handleFunction(fns.narration, req, res);
    }

    // Static files
    let filePath = join(PUBLIC, path === '/' ? 'index.html' : path);
    try {
      const s = await stat(filePath);
      if (s.isDirectory()) filePath = join(filePath, 'index.html');
    } catch {
      // SPA fallback
      filePath = join(PUBLIC, 'index.html');
    }

    const content = await readFile(filePath);
    const mime = MIME[extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(content);
  } catch (err) {
    console.error(err.message);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

server.listen(PORT, () => {
  if (PORT !== BASE_PORT) console.log(`\n  Port ${BASE_PORT} in use — using ${PORT} instead.`);
  console.log(`\n  Workshop dashboard running at: http://localhost:${PORT}\n`);
  if (IN_MEMORY) console.log(`  [dev-server] in-memory mode (no SUPABASE_URL)\n`);
  else console.log(`  Admin password:    ${process.env.ADMIN_PASSWORD}\n`);
});
