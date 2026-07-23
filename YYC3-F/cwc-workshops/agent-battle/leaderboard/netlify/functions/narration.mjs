// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

// /api/narration — Twitch-style live feed of bot chat + agent thoughts.
//
// POST {participant, kind: "chat"|"thought", text, ts?}
//   Auth: x-workshop-key shared secret (same as /achievement, /cost).
//   Inserts one row into narrations. Fire-and-forget from bot/harness.
//
// GET ?workshop=<alias>&since=<iso-ts>&limit=<n>
//   No auth (read-only public feed). Returns rows newer than `since`,
//   oldest first, so the cast-view chat panel can append in order.

import { createClient } from '@supabase/supabase-js';
import { authWebhook } from './_auth.mjs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

const WORKSHOP_ID = process.env.WORKSHOP_ID;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

async function findOrCreateParticipant(name) {
  let { data: p } = await supabase
    .from('participants')
    .select('id')
    .eq('name', name)
    .eq('workshop_id', WORKSHOP_ID)
    .maybeSingle();
  if (p) return p;
  const { data, error } = await supabase
    .from('participants')
    .insert({ name, workshop_id: WORKSHOP_ID })
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

export default async (req) => {
  if (req.method === 'POST') {
    const { participant, kind, text } = await req.json().catch(() => ({}));
    if (!participant || !kind || !text) {
      return json({ error: 'participant, kind, text required' }, 400);
    }
    const auth = authWebhook(req, participant);
    if (!auth.ok) return json({ error: auth.error }, auth.status);
    let p;
    try {
      p = await findOrCreateParticipant(participant);
    } catch {
      return json({ error: 'participant create failed' }, 500);
    }
    const { error } = await supabase
      .from('narrations')
      .insert({ participant_id: p.id, kind, text: String(text).slice(0, 500) });
    if (error) return json({ error: 'narration save failed' }, 500);
    return json({ ok: true });
  }

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const workshopAlias = url.searchParams.get('workshop');
    const since = url.searchParams.get('since');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 200);
    if (!workshopAlias) return json({ error: 'workshop required' }, 400);

    const { data: workshop } = await supabase
      .from('workshops')
      .select('id')
      .eq('alias', workshopAlias)
      .maybeSingle();
    if (!workshop) return json({ narrations: [] });

    let q = supabase
      .from('narrations')
      .select('id, kind, text, ts, participants!inner(name, workshop_id)')
      .eq('participants.workshop_id', workshop.id)
      .order('ts', { ascending: false })
      .limit(limit);
    if (since) q = q.gt('ts', since);

    const { data, error } = await q;
    if (error) return json({ error: 'fetch failed' }, 500);

    const narrations = (data || [])
      .map((r) => ({
        id: r.id,
        name: r.participants?.name,
        kind: r.kind,
        text: r.text,
        ts: r.ts,
      }))
      .reverse();
    return json({ narrations });
  }

  return json({ error: 'method not allowed' }, 405);
};

export const config = { path: '/api/narration' };
