// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const JWT_SECRET = process.env.JWT_SECRET || 'workshop-secret-change-me';

function verifyToken(req) {
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.slice(7), JWT_SECRET);
  } catch {
    return null;
  }
}

export default async (req) => {
  const user = verifyToken(req);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/.netlify/functions/tasks', '').replace('/api/tasks', '');

  // GET /api/tasks — list completed tasks for this user
  if (req.method === 'GET' && (path === '' || path === '/')) {
    const { data, error } = await supabase
      .from('task_completions')
      .select('task_id, points, completed_at')
      .eq('participant_id', user.id)
      .order('completed_at', { ascending: true });

    return new Response(JSON.stringify({ tasks: data || [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // POST /api/tasks/complete
  if (req.method === 'POST' && path === '/complete') {
    const { task_id, points } = await req.json();
    if (!task_id || points === undefined) {
      return new Response(JSON.stringify({ error: 'task_id and points required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { error } = await supabase
      .from('task_completions')
      .upsert({
        participant_id: user.id,
        task_id,
        points
      }, { onConflict: 'participant_id,task_id' });

    if (error) {
      return new Response(JSON.stringify({ error: 'Failed to save.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // POST /api/tasks/uncomplete
  if (req.method === 'POST' && path === '/uncomplete') {
    const { task_id } = await req.json();
    if (!task_id) {
      return new Response(JSON.stringify({ error: 'task_id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await supabase
      .from('task_completions')
      .delete()
      .eq('participant_id', user.id)
      .eq('task_id', task_id);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const config = {
  path: ["/api/tasks", "/api/tasks/*"]
};
