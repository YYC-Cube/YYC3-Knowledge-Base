// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/* ═══════════════════════════════════════════
   WORKSHOP DASHBOARD — Main Application
   ═══════════════════════════════════════════ */

const API = {
  async post(endpoint, body) {
    const res = await fetch(`/api/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify(body)
    });
    return res.json();
  },
  async get(endpoint) {
    const res = await fetch(`/api/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      }
    });
    return res.json();
  }
};

const App = {
  currentView: 'workshop',
  user: null,
  completedTasks: new Set(),
  totalPoints: 0,
  adminToken: null,
  leaderboardInterval: null,
  narrationInterval: null,
  _narrationSince: null,
  _narrationLines: [],

  workshopAlias: null,

  // ─── CAST-VIEW HELPERS ───
  nameColor(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
    return `hsl(${((h % 360) + 360) % 360} 65% 60%)`;
  },

  formatTokens(n) {
    n = n || 0;
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
  },

  renderDiamondRow(p, rank) {
    return `
      <div class="diamond-row" style="--row-index:${rank}">
        <span class="rank-badge ${rank < 3 ? `rank-${rank + 1}` : 'rank-other'}">${rank + 1}</span>
        <div class="diamond-name" style="color:${this.nameColor(p.name)}">${this.escapeHtml(p.name)}</div>
        <div class="diamond-count"><span class="diamond-glyph">&#x1F48E;</span>${p.diamonds_count || 0}</div>
        <div class="diamond-tokens">${this.formatTokens(p.tokens)} tokens</div>
      </div>`;
  },

  // ─── INIT ───
  init() {
    this.setupLoginForm();
    this.setupMobile();
    // Single view: the leaderboard (formerly cast mode) is the only
    // page. The login/workshop/admin views inherited from the
    // upstream dashboard are vestigial — participants never log in;
    // they're rows on the board, posted by the bot. ?cast=1 still
    // works (back-compat) but is no longer required.
    const params = new URLSearchParams(location.search);
    this.workshopAlias = (params.get('workshop') || 'live').replace(/[^a-z0-9-]/gi, '').slice(0, 64);
    document.body.classList.add('cast-mode');
    this.showApp('leaderboard');
  },

  // ─── LOGIN ───
  showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-shell').classList.remove('active');
  },

  showApp(view = 'workshop') {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-shell').classList.add('active');
    if (this.user) {
      document.getElementById('user-name-display').textContent = this.user.name;
      document.getElementById('user-avatar').textContent = this.user.name.charAt(0).toUpperCase();
    }
    const workshopBadge = document.getElementById('workshop-alias-display');
    if (workshopBadge && this.workshopAlias) {
      workshopBadge.textContent = this.workshopAlias;
      workshopBadge.style.display = '';
    }
    this.navigate(view);
  },

  setupLoginForm() {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('login-name').value.trim();
      const workshop_alias = document.getElementById('login-workshop').value.trim();
      const btn = document.getElementById('login-btn');
      const error = document.getElementById('login-error');

      if (!name || !workshop_alias) return;

      btn.disabled = true;
      btn.innerHTML = '<div class="spinner"></div> Joining...';
      error.classList.remove('visible');

      try {
        const data = await API.post('login', { name, workshop_alias });
        if (data.error) {
          error.textContent = data.error;
          error.classList.add('visible');
        } else {
          localStorage.setItem('token', data.token);
          localStorage.setItem('userName', data.name);
          localStorage.setItem('workshopAlias', data.workshop_alias);
          this.user = { name: data.name, token: data.token };
          this.workshopAlias = data.workshop_alias;
          this.showApp();
          this.loadUserTasks();
        }
      } catch (err) {
        error.textContent = 'Connection error. Please try again.';
        error.classList.add('visible');
      }

      btn.disabled = false;
      btn.innerHTML = 'Enter Workshop';
    });
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    localStorage.removeItem('workshopAlias');
    localStorage.removeItem('currentView');
    localStorage.removeItem('castMode');
    this.user = null;
    this.workshopAlias = null;
    this.completedTasks.clear();
    this.totalPoints = 0;
    this.adminToken = null;
    if (this.leaderboardInterval) clearInterval(this.leaderboardInterval);
    document.body.classList.remove('cast-mode');
    this.showLogin();
  },

  // ─── NAVIGATION ───
  navigate(view) {
    this.currentView = view;
    localStorage.setItem('currentView', view);
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === view);
    });

    if (this.leaderboardInterval) {
      clearInterval(this.leaderboardInterval);
      this.leaderboardInterval = null;
    }
    if (this.narrationInterval) {
      clearInterval(this.narrationInterval);
      this.narrationInterval = null;
    }

    const main = document.getElementById('main-content');
    switch (view) {
      case 'workshop': this.renderWorkshop(main); break;
      case 'leaderboard': this.renderLeaderboard(main); break;
      case 'admin': this.renderAdmin(main); break;
    }

    // Close mobile menu
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('mobile-overlay').classList.remove('open');
  },

  // ─── LOAD USER TASKS ───
  async loadUserTasks() {
    try {
      const data = await API.get('tasks');
      if (data.tasks) {
        this.completedTasks = new Set(data.tasks.map(t => t.task_id));
        this.totalPoints = data.tasks.reduce((sum, t) => sum + t.points, 0);
        this.updatePointsDisplay();
        if (this.currentView === 'workshop') {
          this.renderWorkshop(document.getElementById('main-content'));
        }
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  },

  updatePointsDisplay() {
    const el = document.getElementById('user-points-display');
    if (el) el.textContent = `${this.totalPoints} pts`;
  },

  // ─── TOGGLE TASK ───
  async toggleTask(taskId) {
    const task = TASKS.find(t => t.id === taskId);
    if (!task) return;

    const wasCompleted = this.completedTasks.has(taskId);

    // Optimistic update
    if (wasCompleted) {
      this.completedTasks.delete(taskId);
      this.totalPoints -= task.points;
    } else {
      this.completedTasks.add(taskId);
      this.totalPoints += task.points;
    }
    this.updatePointsDisplay();

    try {
      const endpoint = wasCompleted ? 'tasks/uncomplete' : 'tasks/complete';
      await API.post(endpoint, { task_id: taskId, points: task.points });
    } catch (err) {
      // Revert on error
      if (wasCompleted) {
        this.completedTasks.add(taskId);
        this.totalPoints += task.points;
      } else {
        this.completedTasks.delete(taskId);
        this.totalPoints -= task.points;
      }
      this.updatePointsDisplay();
    }

    if (!wasCompleted) {
      this.showToast(`+${task.points} pts`, 'success');
    } else {
      this.showToast(`-${task.points} pts`, 'undo');
    }

    // Re-render to move completed tasks
    this.renderWorkshop(document.getElementById('main-content'));
  },


  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2600);
  },

  // ─── STEP GATING ───
  isTaskUnlocked(taskId) {
    const coreIndex = CORE_TASKS.findIndex(t => t.id === taskId);
    if (coreIndex >= 0) {
      // Step 1 is always unlocked; subsequent core steps require all previous core steps completed
      for (let i = 0; i < coreIndex; i++) {
        if (!this.completedTasks.has(CORE_TASKS[i].id)) return false;
      }
      return true;
    }
    const bonusIndex = BONUS_TASKS.findIndex(t => t.id === taskId);
    if (bonusIndex >= 0) {
      // All core steps must be completed first
      if (CORE_TASKS.some(t => !this.completedTasks.has(t.id))) return false;
      // Then sequential within bonus
      for (let i = 0; i < bonusIndex; i++) {
        if (!this.completedTasks.has(BONUS_TASKS[i].id)) return false;
      }
      return true;
    }
    return true;
  },

  // ─── EXPAND/COLLAPSE TASK ───
  toggleExpand(taskId) {
    if (!this.isTaskUnlocked(taskId)) {
      this.showToast('Complete the previous step first', 'undo');
      return;
    }
    const card = document.querySelector(`[data-task-id="${taskId}"]`);
    if (card) card.classList.toggle('expanded');
  },

  // ─── RENDER WORKSHOP ───
  renderWorkshop(container) {
    const completedCoreCount = CORE_TASKS.filter(t => this.completedTasks.has(t.id)).length;
    const totalCoreCount = CORE_TASKS.length;
    const completedBonusCount = BONUS_TASKS.filter(t => this.completedTasks.has(t.id)).length;
    const progressPct = totalCoreCount > 0 ? (completedCoreCount / totalCoreCount) * 100 : 0;

    // Keep tasks in original order (no reordering on completion)

    container.innerHTML = `
      <div class="page-header">
        <h1>Workshop Guide</h1>
        <p>A step-by-step Claude Code guide using a full-stack inventory management application</p>
      </div>
      <div class="page-body">
        <div class="prereqs-banner">
          <h3>Prerequisites</h3>
          <ul>
            <li>Claude Code installed and set up (<a href="https://docs.anthropic.com/en/docs/claude-code" target="_blank" style="color: var(--orange)">docs.anthropic.com</a>)</li>
            <li>Open up Terminal/Windows Powershell OR code editor (VS Code recommended)</li>
          </ul>
          <div class="permissions-note">
            <strong>Pro Tip:</strong> Claude Code will ask for permission when it needs to:
            <ul style="margin:0.5rem 0 0.75rem 1.25rem;list-style:disc;padding:0">
              <li style="padding:0.15rem 0;color:var(--light-gray)"><strong>Configs & Permission:</strong> supports fine-grained permissions to scope agents</li>
              <li style="padding:0.15rem 0;color:var(--light-gray)">Modify files in your project</li>
              <li style="padding:0.15rem 0;color:var(--light-gray)">Run bash commands</li>
              <li style="padding:0.15rem 0;color:var(--light-gray)">Install new tools (like the Playwright MCP in Step 9)</li>
            </ul>
            Press <strong>Enter</strong> when prompted to approve each action, or tell Claude what to do instead.
            (Advanced users can configure auto-approvals in <code>.claude/settings.json</code>)
            <br><br>This keeps you in control of what happens in your codebase.
          </div>
        </div>

        <div class="clawd-mascot">
          <span style="font-size:48px;line-height:1">💎</span>
          <div class="clawd-text"><strong>Welcome to the workshop!</strong>&nbsp; Expand each step, work through the instructions, then click the <strong>"I'm done"</strong> button to earn points and climb the leaderboard.</div>
        </div>

        <!-- Pinned Reference -->
        <div class="reference-card" id="reference-card">
          <div class="reference-header" onclick="document.getElementById('reference-card').classList.toggle('expanded')">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="8"/><path d="M10 6v4M10 14h.01"/></svg>
            <span>${REFERENCE_CONTENT.title}</span>
            <svg class="reference-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 10 13 14 9"/></svg>
          </div>
          <div class="reference-body">
            <div class="reference-body-inner">
              ${REFERENCE_CONTENT.content}
            </div>
          </div>
        </div>

        <div class="progress-section">
          <div class="progress-stats">
            <span class="completed-count">${completedCoreCount} of ${totalCoreCount} core steps${completedBonusCount > 0 ? ` + ${completedBonusCount} bonus` : ''}</span>
            <span class="points-total">${this.totalPoints} / ${TOTAL_POSSIBLE_POINTS} pts</span>
          </div>
          <div class="progress-bar-track">
            <div class="progress-bar-fill" style="width: ${progressPct}%"></div>
          </div>
        </div>

        <div class="tasks-section-label">Core Steps</div>
        <div class="task-list">
          ${CORE_TASKS.map(t => this.renderTaskCard(t)).join('')}
        </div>

        <div class="tasks-section-label">Expert Challenge</div>
        <div class="task-list">
          ${BONUS_TASKS.map(t => this.renderTaskCard(t)).join('')}
        </div>
      </div>
    `;

    this.addCopyButtons(container);
  },

  addCopyButtons(container) {
    container.querySelectorAll('pre').forEach(pre => {
      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.title = 'Copy to clipboard';
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
      btn.addEventListener('click', () => {
        const text = pre.querySelector('code')?.textContent || pre.textContent;
        navigator.clipboard.writeText(text).then(() => {
          btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
            btn.classList.remove('copied');
          }, 1500);
        });
      });
      pre.appendChild(btn);
    });
  },

  renderTaskCard(task) {
    const isCompleted = this.completedTasks.has(task.id);
    const isUnlocked = this.isTaskUnlocked(task.id);
    const cardClasses = [
      'task-card',
      isCompleted ? 'completed' : '',
      !isUnlocked ? 'locked' : ''
    ].filter(Boolean).join(' ');
    return `
      <div class="${cardClasses}" data-task-id="${task.id}">
        <div class="task-header" onclick="App.toggleExpand('${task.id}')">
          <div class="task-status-icon ${isCompleted ? 'done' : ''}">
            ${isCompleted
              ? '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 10 8 14 16 6"/></svg>'
              : !isUnlocked
                ? '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="9" width="8" height="7" rx="1"/><path d="M7 9V7a3 3 0 0 1 6 0v2"/></svg>'
                : '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 10 13 14 9"/></svg>'
            }
          </div>
          <div class="task-info">
            <div class="task-title">${task.title}</div>
            ${!isUnlocked
              ? '<div class="task-subtitle locked-hint">Complete the previous step to unlock</div>'
              : task.subtitle ? `<div class="task-subtitle">${task.subtitle}</div>` : ''
            }
          </div>
          <div class="task-meta">
            <span class="task-points ${task.category}">${task.points} pts</span>
          </div>
        </div>
        <div class="task-body">
          <div class="task-body-inner">
            ${task.content}
            <div class="task-done-bar">
              <button class="btn btn-done ${isCompleted ? 'is-completed' : ''}" onclick="event.stopPropagation(); App.toggleTask('${task.id}')">
                ${isCompleted
                  ? '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;margin-right:0.35rem"><polyline points="4 10 8 14 16 6"/></svg> Completed'
                  : "I'm done"
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ─── RENDER LEADERBOARD ───
  async renderLeaderboard(container) {
    if (this.leaderboardInterval) clearInterval(this.leaderboardInterval);
    if (this.narrationInterval) clearInterval(this.narrationInterval);
    const isCast = document.body.classList.contains('cast-mode');
    const alias = this.workshopAlias || '';

    container.innerHTML = `
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:${isCast ? 'center' : 'flex-start'};gap:1rem">
          <h1>Agent Battle &mdash; Diamond Leaderboard</h1>
          <span class="live-badge"><span class="live-dot"></span>Live</span>
          ${isCast ? '' : '<span id="session-countdown" style="font-family:ui-monospace,monospace;font-size:1.25rem;font-weight:700;margin-left:auto"></span>'}
        </div>
        ${isCast ? '<div id="session-countdown" style="font-family:ui-monospace,monospace;font-size:3.5rem;font-weight:800;text-align:center;margin:0.5rem 0;color:#fbbf24"></div>' : ''}
        <p>${alias ? `Workshop: <strong>${this.escapeHtml(alias)}</strong> — ` : ''}Best single run &middot; most diamonds wins, fewest tokens breaks ties</p>
      </div>
      <div class="page-body">
        <div class="leaderboard-wrapper">
          <div id="leaderboard-content">
            <div class="page-loading"><div class="spinner"></div> Loading leaderboard...</div>
          </div>
          <p style="color:#b0aea5;opacity:.7;font-size:.8em;margin-top:1.5rem;line-height:1.5">
            Not an official Minecraft event. Anthropic is not affiliated with,
            endorsed by, or sponsored by Microsoft / Mojang. The Minecraft
            trademarks, characters, and game are the property of Microsoft / Mojang.
          </p>
        </div>
        ${isCast ? `
          <aside class="chat-panel" id="chat-panel">
            <div class="chat-panel-header">Bot chat <span class="live-badge"><span class="live-dot"></span>Live</span></div>
            <div class="chat-panel-body" id="chat-panel-body"></div>
          </aside>` : ''}
      </div>
    `;

    this._leaderboardFirstLoad = true;
    this.refreshLeaderboard();
    this.leaderboardInterval = setInterval(() => this.refreshLeaderboard(), 10000);
    this.refreshSession();
    if (this.sessionInterval) clearInterval(this.sessionInterval);
    this.sessionInterval = setInterval(() => this.refreshSession(), 1000);
    if (isCast) {
      this._narrationSince = null;
      this._narrationLines = [];
      this.refreshNarrations();
      this.narrationInterval = setInterval(() => this.refreshNarrations(), 2000);
    }
  },

  async refreshNarrations() {
    const body = document.getElementById('chat-panel-body');
    if (!body) return;
    try {
      const alias = this.workshopAlias || '';
      const since = this._narrationSince ? `&since=${encodeURIComponent(this._narrationSince)}` : '';
      const data = await API.get(`narration?workshop=${encodeURIComponent(alias)}${since}`);
      const rows = data.narrations || [];
      if (rows.length === 0) return;
      this._narrationSince = rows[rows.length - 1].ts;
      this._narrationLines.push(...rows);
      if (this._narrationLines.length > 100) {
        this._narrationLines.splice(0, this._narrationLines.length - 100);
      }
      body.innerHTML = this._narrationLines.map((n) => `
        <div class="chat-line ${n.kind === 'thought' ? 'thought' : ''}">
          <span class="chat-name" style="color:${this.nameColor(n.name || '?')}">${this.escapeHtml(n.name || '?')}</span>
          <span class="chat-text">${this.escapeHtml(n.text)}</span>
        </div>`).join('');
      body.scrollTop = body.scrollHeight;
    } catch (err) {
      // Poll continues — Supabase realtime not required.
    }
  },

  _leaderboardFirstLoad: true,
  _showAllRows: false,

  toggleShowAll(ev) {
    if (ev) ev.preventDefault();
    this._showAllRows = !this._showAllRows;
    this.refreshLeaderboard();
  },

  async refreshLeaderboard() {
    try {
      const alias = this.workshopAlias || '';
      const data = await API.get(`leaderboard?workshop=${encodeURIComponent(alias)}`);
      const el = document.getElementById('leaderboard-content');
      if (!el) return;

      if (!data.leaderboard || data.leaderboard.length === 0) {
        el.innerHTML = `
          <div class="leaderboard-empty">
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 36V20M14 36V12M24 36V20M34 36V8M44 36V16"/></svg>
            <p>No participants yet. Complete some tasks to appear here!</p>
          </div>
        `;
        this._leaderboardFirstLoad = false;
        return;
      }

      const noAnim = !this._leaderboardFirstLoad;

      const total = data.leaderboard.length;
      const totalDiamonds = data.leaderboard.reduce((s, p) => s + (p.diamonds_count || 0), 0);
      const topDiamonds = data.leaderboard[0]?.diamonds_count || 0;
      const limit = this._showAllRows ? total : 20;
      const rows = data.leaderboard.slice(0, limit);

      const castStats = `
        <div class="cast-stats-bar">
          <div class="cast-stat">
            <div class="cast-stat-value">${total}</div>
            <div class="cast-stat-label">Agents</div>
          </div>
          <div class="cast-stat">
            <div class="cast-stat-value">&#x1F48E; ${totalDiamonds}</div>
            <div class="cast-stat-label">Diamonds Mined</div>
          </div>
          <div class="cast-stat">
            <div class="cast-stat-value">${topDiamonds}</div>
            <div class="cast-stat-label">Leader</div>
          </div>
        </div>
      `;

      const footer = total > 20 ? `
        <div class="diamond-footer">
          Showing ${rows.length} of ${total}
          &middot; <a href="#" onclick="App.toggleShowAll(event)">${this._showAllRows ? 'Show top 20' : 'Show all'}</a>
        </div>` : '';

      // Single column-table layout for all viewers (the old card
      // layout via renderDiamondRow is retired — it had no run-status
      // or time-remaining columns).
      {
        el.innerHTML = castStats + `
          <table class="leaderboard-table">
            <thead>
              <tr>
                <th style="width:56px">Rank</th>
                <th>Participant</th>
                <th style="width:80px">Status</th>
                <th style="width:100px">Run left</th>
                <th style="width:110px">&#x1F48E; This run</th>
                <th style="width:130px">&#x1F48E; Best run</th>
                <th style="width:100px">Tokens</th>
                <th style="width:70px">Runs</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((p, i) => {
                const ageS = p.last_activity
                  ? Math.round((Date.now() - new Date(p.last_activity).getTime()) / 1000)
                  : Infinity;
                const left = p.run_remaining_s;
                const live = left != null || ageS < 30;
                const ago = ageS < 60 ? `${ageS}s`
                          : ageS < 3600 ? `${Math.floor(ageS/60)}m`
                          : `${Math.floor(ageS/3600)}h`;
                const nRuns = p.runs ? Object.keys(p.runs).length
                            : (p.best_run_id ? 1 : 0);
                // "This run" = the most-recently-updated run's diamond
                // count (the bot's live counter, reported via /cost).
                // Shown only while a run is in progress; otherwise the
                // best-run column already covers it.
                const latest = Object.values(p.runs || {})
                  .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))[0];
                const thisRun = (live && latest)
                  ? `<span style="opacity:.85">&#x1F48E; ${latest.diamonds ?? 0}</span>`
                  : '<span style="opacity:.3">—</span>';
                const status = live
                  ? '<span style="color:#22c55e;font-size:1.2em" title="active now">● live</span>'
                  : `<span style="opacity:.45;font-size:.85em" title="last activity ${ago} ago">${ago} ago</span>`;
                const runLeft = left != null
                  ? `<span style="font-family:ui-monospace,monospace;font-weight:600;color:${left<60?'#ef4444':'#fbbf24'}">${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}</span>`
                  : '<span style="opacity:.3">—</span>';
                return `
                <tr style="--row-index:${i}${noAnim ? ';animation:none' : ''}">
                  <td><span class="rank-badge ${i < 3 ? `rank-${i + 1}` : 'rank-other'}">${i + 1}</span></td>
                  <td class="leaderboard-name" style="color:${this.nameColor(p.name)}">${this.escapeHtml(p.name)}</td>
                  <td>${status}</td>
                  <td>${runLeft}</td>
                  <td>${thisRun}</td>
                  <td class="leaderboard-points">&#x1F48E; ${p.diamonds_count || 0}</td>
                  <td class="leaderboard-tasks">${this.formatTokens(p.tokens)}</td>
                  <td style="opacity:.6">${nRuns || '—'}</td>
                </tr>
              `;}).join('')}
            </tbody>
          </table>
        ` + footer;
      }
      this._leaderboardFirstLoad = false;
    } catch (err) {
      console.error('Leaderboard error:', err);
    }
  },

  // Session countdown. Polls /api/admin/session (GET is public) once a
  // second; locally counts down between polls. When the window closes,
  // shows TIME'S UP and freezes the board so post-buzzer activity isn't
  // misread as scored.
  _sessionClosesAt: null,
  async refreshSession() {
    const el = document.getElementById('session-countdown');
    if (!el) return;
    // Re-fetch every 5s; tick locally in between.
    const due = !this._sessionFetchedAt || Date.now() - this._sessionFetchedAt > 5000;
    if (due) {
      try {
        const r = await fetch('/api/admin/session');
        const s = await r.json();
        this._sessionFetchedAt = Date.now();
        this._sessionClosesAt = s.open && s.closes_at ? new Date(s.closes_at).getTime() : null;
        if (!s.open && s.opened_at) this._sessionClosesAt = 0; // explicitly closed
      } catch { /* keep last known */ }
    }
    if (this._sessionClosesAt === null) {
      el.textContent = '';
      return;
    }
    const remaining = Math.max(0, Math.floor((this._sessionClosesAt - Date.now()) / 1000));
    if (remaining === 0) {
      el.textContent = "TIME'S UP";
      el.style.color = '#ef4444';
      if (this.leaderboardInterval) {
        clearInterval(this.leaderboardInterval);
        this.leaderboardInterval = null;
      }
      return;
    }
    const h = Math.floor(remaining / 3600);
    const mm = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');
    el.textContent = `⏱ ${h > 0 ? h + ':' : ''}${mm}:${ss}`;
    el.style.color = remaining < 300 ? '#ef4444' : '#fbbf24';
    el.style.display = 'inline-block';
  },

  toggleCastMode() {
    document.body.classList.toggle('cast-mode');
    localStorage.setItem('castMode', document.body.classList.contains('cast-mode'));
    if (this.currentView === 'leaderboard') {
      this.renderLeaderboard(document.getElementById('main-content'));
    }
  },

  // ─── RENDER ADMIN ───
  renderAdmin(container) {
    if (!this.adminToken) {
      container.innerHTML = `
        <div class="page-header">
          <h1>Admin Panel</h1>
          <p>Internal participant tracker</p>
        </div>
        <div class="page-body">
          <div class="admin-login-card">
            <h2>Admin Authentication</h2>
            <form id="admin-login-form">
              <div class="form-group">
                <label>Admin Password</label>
                <input type="password" id="admin-password" placeholder="Enter admin password" required>
              </div>
              <div class="login-error" id="admin-error"></div>
              <button type="submit" class="btn btn-primary">Authenticate</button>
            </form>
          </div>
        </div>
      `;

      document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const pw = document.getElementById('admin-password').value;
        const err = document.getElementById('admin-error');
        try {
          const data = await API.post('admin/login', { password: pw });
          if (data.error) {
            err.textContent = data.error;
            err.classList.add('visible');
          } else {
            this.adminToken = data.token;
            this.renderAdmin(container);
          }
        } catch (e) {
          err.textContent = 'Connection error.';
          err.classList.add('visible');
        }
      });
      return;
    }

    container.innerHTML = `
      <div class="page-header">
        <h1>Admin Panel</h1>
        <p>All participants and their progress</p>
      </div>
      <div class="page-body">
        <div class="admin-controls" style="margin-bottom:1rem">
          <select id="admin-workshop-filter" class="admin-search" style="min-width:200px">
            <option value="">All Workshops</option>
          </select>
          <input type="text" class="admin-search" id="admin-search" placeholder="Search participants...">
          <button class="btn btn-secondary" onclick="App.refreshAdmin()">Refresh</button>
          <button class="btn btn-ghost" onclick="App.exportAdminCSV()">Export CSV</button>
        </div>
        <div id="admin-stats" class="admin-stat-cards"></div>
        <div id="admin-histogram" class="admin-histogram-card"></div>
        <div id="admin-completion" class="admin-completion-card"></div>
        <div id="admin-table-area">
          <div class="page-loading"><div class="spinner"></div> Loading participants...</div>
        </div>
      </div>
    `;

    document.getElementById('admin-search').addEventListener('input', (e) => {
      this._adminSearchFilter = e.target.value.toLowerCase();
      this.renderAdminTable();
    });

    document.getElementById('admin-workshop-filter').addEventListener('change', (e) => {
      this._adminWorkshopFilter = e.target.value;
      // Update URL to reflect selected workshop
      const url = new URL(window.location);
      if (e.target.value) {
        url.searchParams.set('workshop', e.target.value);
      } else {
        url.searchParams.delete('workshop');
      }
      history.replaceState(null, '', url);
      this.refreshAdmin();
    });

    // Check URL for ?workshop= pre-filter
    const urlParams = new URLSearchParams(window.location.search);
    const workshopParam = urlParams.get('workshop');
    this._adminWorkshopFilter = workshopParam || '';
    this.loadAdminWorkshops(workshopParam);
    this.refreshAdmin();
  },

  _adminData: [],
  _adminSearchFilter: '',
  _adminWorkshopFilter: '',
  _adminWorkshops: [],

  async loadAdminWorkshops(preselect) {
    try {
      const res = await fetch('/api/admin/workshops', {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });
      const data = await res.json();
      this._adminWorkshops = data.workshops || [];

      const select = document.getElementById('admin-workshop-filter');
      if (!select) return;
      const current = preselect || select.value;
      select.innerHTML = '<option value="">All Workshops</option>' +
        this._adminWorkshops.map(ws =>
          `<option value="${this.escapeHtml(ws.alias)}">${this.escapeHtml(ws.alias)} (${ws.participant_count})</option>`
        ).join('');
      select.value = current;
    } catch (err) {
      console.error('Failed to load workshops:', err);
    }
  },

  async refreshAdmin() {
    try {
      const workshopParam = this._adminWorkshopFilter ? `?workshop=${encodeURIComponent(this._adminWorkshopFilter)}` : '';
      const res = await fetch(`/api/admin/participants${workshopParam}`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });
      const data = await res.json();

      if (data.error) {
        this.adminToken = null;
        this.renderAdmin(document.getElementById('main-content'));
        return;
      }

      this._adminData = data.participants || [];
      this.renderAdminStats();
      this.renderAdminTable();
    } catch (err) {
      console.error('Admin error:', err);
    }
  },

  getCurrentStage(completedTaskIds) {
    const completed = new Set(completedTaskIds || []);
    const nextCore = CORE_TASKS.find(t => !completed.has(t.id));
    if (nextCore) return { stage: nextCore.title.replace(/^Step \d+:\s*/, ''), done: false };
    const nextBonus = BONUS_TASKS.find(t => !completed.has(t.id));
    if (nextBonus) return { stage: nextBonus.title.replace(/^Bonus:\s*/, ''), done: true };
    return { stage: 'All complete', done: true };
  },

  getCoreProgress(completedTaskIds) {
    const completed = new Set(completedTaskIds || []);
    const coreDone = CORE_TASKS.filter(t => completed.has(t.id)).length;
    return Math.round((coreDone / CORE_TASKS.length) * 100);
  },

  getBonusStage(completedTaskIds) {
    const completed = new Set(completedTaskIds || []);
    const bonusDone = BONUS_TASKS.filter(t => completed.has(t.id)).length;
    if (bonusDone === 0) return null;
    if (bonusDone === BONUS_TASKS.length) return 'All bonus complete';
    const next = BONUS_TASKS.find(t => !completed.has(t.id));
    return next ? next.title.replace(/^Bonus:\s*/, '') : null;
  },

  renderAdminStats() {
    const p = this._adminData;
    const totalParticipants = p.length;
    const coreTaskCount = CORE_TASKS.length;
    const avgCoreDone = totalParticipants > 0
      ? (p.reduce((s, x) => {
          const completed = new Set(x.completed_task_ids || []);
          return s + CORE_TASKS.filter(t => completed.has(t.id)).length;
        }, 0) / totalParticipants).toFixed(1)
      : 0;
    const completedCore = p.filter(x => this.getCoreProgress(x.completed_task_ids) === 100).length;
    const doingBonus = p.filter(x => {
      const completed = new Set(x.completed_task_ids || []);
      return BONUS_TASKS.some(t => completed.has(t.id));
    }).length;

    const workshopCount = this._adminWorkshops.length;

    document.getElementById('admin-stats').innerHTML = `
      <div class="admin-stat-card">
        <div class="stat-label">Workshops</div>
        <div class="stat-value">${workshopCount}</div>
      </div>
      <div class="admin-stat-card">
        <div class="stat-label">Participants</div>
        <div class="stat-value">${totalParticipants}</div>
      </div>
      <div class="admin-stat-card">
        <div class="stat-label">Avg Step</div>
        <div class="stat-value orange">${avgCoreDone}<span style="font-size:0.9rem;font-weight:500;color:var(--mid-gray)"> / ${coreTaskCount}</span></div>
      </div>
      <div class="admin-stat-card">
        <div class="stat-label">Core Complete</div>
        <div class="stat-value green">${completedCore}</div>
      </div>
      <div class="admin-stat-card">
        <div class="stat-label">Doing Bonus</div>
        <div class="stat-value blue">${doingBonus}</div>
      </div>
    `;

    // Histogram: participants at each step
    const stepCounts = TASKS.map(task => {
      return {
        id: task.id,
        label: task.title.replace(/^(Step \d+):.*/, '$1').replace(/^Expert Challenge:.*/, 'Expert'),
        sublabel: task.title.replace(/^Step \d+:\s*/, '').replace(/^Expert Challenge:\s*/, 'Bug Bounty'),
        count: p.filter(x => (x.completed_task_ids || []).includes(task.id)).length
      };
    });
    const maxCount = Math.max(...stepCounts.map(s => s.count), 1);
    const barColors = [
      '#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#10b981',
      '#84cc16', '#eab308', '#f59e0b', '#ef4444', '#22c55e',
      '#14b8a6', '#8b5cf6'
    ];

    document.getElementById('admin-histogram').innerHTML = `
      <div class="admin-card-header">Participants at Each Step</div>
      <div class="admin-histogram">
        ${stepCounts.map((s, i) => `
          <div class="histogram-col">
            <div class="histogram-count">${s.count}</div>
            <div class="histogram-bar-wrapper">
              <div class="histogram-bar" style="height:${maxCount > 0 ? (s.count / maxCount) * 100 : 0}%;background:${barColors[i % barColors.length]}"></div>
            </div>
            <div class="histogram-label">${s.label}</div>
            <div class="histogram-sublabel">${s.sublabel}</div>
          </div>
        `).join('')}
      </div>
    `;

    // Overall workshop completion
    const avgProgress = totalParticipants > 0
      ? Math.round(p.reduce((sum, x) => {
          const completed = new Set(x.completed_task_ids || []);
          const done = CORE_TASKS.filter(t => completed.has(t.id)).length;
          return sum + (done / coreTaskCount) * 100;
        }, 0) / totalParticipants)
      : 0;

    document.getElementById('admin-completion').innerHTML = `
      <div class="admin-card-header">Overall Workshop Completion</div>
      <div class="admin-completion-bar-wrapper">
        <div class="admin-completion-track">
          <div class="admin-completion-fill" style="width:${avgProgress}%"></div>
        </div>
        <div class="admin-completion-pct">${avgProgress}%</div>
      </div>
    `;
  },

  renderAdminTable() {
    const filtered = this._adminSearchFilter
      ? this._adminData.filter(p => p.name.toLowerCase().includes(this._adminSearchFilter))
      : this._adminData;

    // Sort by points desc
    filtered.sort((a, b) => (b.score ?? b.total_points ?? 0) - (a.score ?? a.total_points ?? 0));

    const area = document.getElementById('admin-table-area');
    if (!area) return;

    if (filtered.length === 0) {
      area.innerHTML = '<div class="leaderboard-empty"><p>No participants found.</p></div>';
      return;
    }

    const anyAtFull = filtered.some(p => this.getCoreProgress(p.completed_task_ids) === 100);

    area.innerHTML = `
      <div class="admin-table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Points</th>
              <th>Progress</th>
              <th>Current Stage</th>
              ${anyAtFull ? '<th>Bonus Stage</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${filtered.map((p, i) => {
              const progress = this.getCoreProgress(p.completed_task_ids);
              const stage = this.getCurrentStage(p.completed_task_ids);
              const bonus = this.getBonusStage(p.completed_task_ids);
              return `
              <tr>
                <td>${i + 1}</td>
                <td style="font-family:'Inter',-apple-system,sans-serif;font-weight:600">${this.escapeHtml(p.name)}</td>
                <td class="leaderboard-points">${Math.round(p.score ?? p.total_points ?? 0)}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:0.6rem">
                    <div class="leaderboard-bar" style="width:80px">
                      <div class="leaderboard-bar-fill" style="width:${progress}%"></div>
                    </div>
                    <span style="font-family:'Inter',-apple-system,sans-serif;font-size:0.82rem;font-weight:600;color:${progress === 100 ? 'var(--green)' : 'var(--dark)'}">${progress}%</span>
                  </div>
                </td>
                <td style="font-size:0.85rem;color:${stage.done ? 'var(--green)' : 'var(--dark)'}">${stage.done ? '&#10003; Core complete' : stage.stage}</td>
                ${anyAtFull ? `<td style="font-size:0.85rem;color:${bonus ? 'var(--blue)' : 'var(--mid-gray)'}">${progress === 100 ? (bonus || '—') : '—'}</td>` : ''}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  exportAdminCSV() {
    const rows = [['Rank', 'Name', 'Points', 'Progress', 'Current Stage', 'Bonus Stage']];
    const sorted = [...this._adminData].sort((a, b) => (b.score ?? b.total_points ?? 0) - (a.score ?? a.total_points ?? 0));
    sorted.forEach((p, i) => {
      const progress = this.getCoreProgress(p.completed_task_ids);
      const stage = this.getCurrentStage(p.completed_task_ids);
      const bonus = this.getBonusStage(p.completed_task_ids);
      rows.push([
        i + 1,
        p.name,
        Math.round(p.score ?? p.total_points ?? 0),
        progress + '%',
        stage.done ? 'Core complete' : stage.stage,
        progress === 100 ? (bonus || '') : ''
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workshop-participants-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // ─── MOBILE ───
  setupMobile() {
    document.getElementById('mobile-menu-btn').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
      document.getElementById('mobile-overlay').classList.toggle('open');
    });
    document.getElementById('mobile-overlay').addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('mobile-overlay').classList.remove('open');
    });
  },

  // ─── HELPERS ───
  escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
