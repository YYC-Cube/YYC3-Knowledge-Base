// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Keep weak defaults for local dev-server; refuse them in production below.
const DEFAULT_JWT_SECRET = 'workshop-secret-change-me';
const DEFAULT_ADMIN_PASSWORD = 'admin-secret';
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
const IS_PRODUCTION = process.env.NETLIFY === 'true' || process.env.CONTEXT === 'production';

function verifyAdminToken(req) {
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return false;
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
    return decoded.admin === true;
  } catch {
    return false;
  }
}

export default async (req) => {
  const url = new URL(req.url);
  const path = url.pathname.replace('/.netlify/functions/admin', '').replace('/api/admin', '');

  // Refuse to serve in production if either secret is unset or still the hardcoded default.
  if (IS_PRODUCTION && (
    !process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT_SECRET ||
    !process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === DEFAULT_ADMIN_PASSWORD
  )) {
    return new Response(JSON.stringify({ error: 'admin secrets not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // POST /api/admin/login
  if (req.method === 'POST' && path === '/login') {
    const { password } = await req.json();

    if (password !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Invalid admin password.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '12h' });

    return new Response(JSON.stringify({ token }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // /api/admin/session — facilitator-controlled 45-min scoring window.
  // GET: public (no admin token) so the cast view can render the countdown.
  // POST {action: "open", duration?} / {action: "close"}: requires admin.
  if (path === '/session') {
    if (req.method === 'GET') {
      const { data: s } = await supabase
        .from('sessions')
        .select('opened_at, closed_at, duration_seconds')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!s) {
        return new Response(JSON.stringify({ open: false }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      const opened = new Date(s.opened_at).getTime();
      const closes = s.closed_at
        ? new Date(s.closed_at).getTime()
        : opened + (s.duration_seconds || 2700) * 1000;
      const now = Date.now();
      const open = now >= opened && now <= closes;
      return new Response(JSON.stringify({
        open,
        opened_at: s.opened_at,
        closes_at: new Date(closes).toISOString(),
        remaining_seconds: open ? Math.max(0, Math.floor((closes - now) / 1000)) : 0,
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (req.method === 'POST') {
      if (!verifyAdminToken(req)) {
        return new Response(JSON.stringify({ error: 'Admin access required.' }), {
          status: 403, headers: { 'Content-Type': 'application/json' }
        });
      }
      const { action, duration } = await req.json().catch(() => ({}));
      if (action === 'open') {
        const { data, error } = await supabase
          .from('sessions')
          .insert({ duration_seconds: Math.round(duration) || 2700 })
          .select()
          .single();
        if (error) {
          return new Response(JSON.stringify({ error: 'session open failed' }), {
            status: 500, headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify({ ok: true, session: data }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (action === 'close') {
        const { data: s } = await supabase
          .from('sessions')
          .select('id')
          .is('closed_at', null)
          .order('opened_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!s) {
          return new Response(JSON.stringify({ error: 'no open session' }), {
            status: 400, headers: { 'Content-Type': 'application/json' }
          });
        }
        const { error } = await supabase
          .from('sessions')
          .update({ closed_at: new Date().toISOString() })
          .eq('id', s.id);
        if (error) {
          return new Response(JSON.stringify({ error: 'session close failed' }), {
            status: 500, headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ error: 'action must be "open" or "close"' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // GET /api/admin/workshops — list all workshops with participant counts
  if (req.method === 'GET' && path === '/workshops') {
    if (!verifyAdminToken(req)) {
      return new Response(JSON.stringify({ error: 'Admin access required.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      const { data: workshops, error: wsError } = await supabase
        .from('workshops')
        .select('id, alias, created_at')
        .order('created_at', { ascending: false });

      if (wsError) throw wsError;

      const { data: participants, error: pError } = await supabase
        .from('participants')
        .select('workshop_id');

      if (pError) throw pError;

      const result = (workshops || []).map(ws => ({
        id: ws.id,
        alias: ws.alias,
        created_at: ws.created_at,
        participant_count: (participants || []).filter(p => p.workshop_id === ws.id).length
      }));

      return new Response(JSON.stringify({ workshops: result }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Failed to load workshops.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // GET /api/admin/participants
  if (req.method === 'GET' && path === '/participants') {
    if (!verifyAdminToken(req)) {
      return new Response(JSON.stringify({ error: 'Admin access required.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      const workshopAlias = url.searchParams.get('workshop');
      let workshopId = null;

      if (workshopAlias) {
        const { data: workshop } = await supabase
          .from('workshops')
          .select('id')
          .eq('alias', workshopAlias)
          .maybeSingle();

        if (!workshop) {
          return new Response(JSON.stringify({ participants: [] }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        workshopId = workshop.id;
      }

      // Get participants (optionally filtered by workshop)
      let query = supabase
        .from('participants')
        .select('id, name, workshop_id, created_at')
        .order('created_at', { ascending: true });

      if (workshopId) {
        query = query.eq('workshop_id', workshopId);
      }

      const { data: participants, error: pError } = await query;
      if (pError) throw pError;

      const participantIds = (participants || []).map(p => p.id);

      let completions = [];
      if (participantIds.length > 0) {
        const { data: cData, error: cError } = await supabase
          .from('task_completions')
          .select('participant_id, task_id, points, completed_at')
          .in('participant_id', participantIds);

        if (cError) throw cError;
        completions = cData || [];
      }

      // Get workshop aliases for display
      const workshopIds = [...new Set((participants || []).map(p => p.workshop_id).filter(Boolean))];
      let workshopMap = {};
      if (workshopIds.length > 0) {
        const { data: workshops } = await supabase
          .from('workshops')
          .select('id, alias')
          .in('id', workshopIds);

        (workshops || []).forEach(ws => { workshopMap[ws.id] = ws.alias; });
      }

      // Build participant summaries
      const result = (participants || []).map(p => {
        const pCompletions = completions.filter(c => c.participant_id === p.id);
        const totalPoints = pCompletions.reduce((s, c) => s + c.points, 0);
        const lastActivity = pCompletions.length > 0
          ? pCompletions.reduce((max, c) => c.completed_at > max ? c.completed_at : max, '')
          : null;

        return {
          id: p.id,
          name: p.name,
          workshop_alias: workshopMap[p.workshop_id] || null,
          total_points: totalPoints,
          tasks_completed: pCompletions.length,
          last_activity: lastActivity,
          completed_task_ids: pCompletions.map(c => c.task_id).sort(),
          created_at: p.created_at
        };
      });

      return new Response(JSON.stringify({ participants: result }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Failed to load participants.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const config = {
  path: ["/api/admin/*"]
};
