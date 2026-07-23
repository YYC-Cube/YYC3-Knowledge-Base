// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

// POST /api/achievement — receives bot.js webhook fires.
//
// Body: {participant, kind: "milestone"|"quest", id, ts}
// Auth: shared-secret header `x-workshop-key` (set WORKSHOP_KEY env var).
//       No JWT — the bot reports, not the participant's browser.
//
// Looks up (or creates) the participant by name within WORKSHOP_ID, then
// upserts a task_completions row with the point value from TASK_POINTS.
// Idempotent: re-firing the same achievement is a no-op (UNIQUE constraint).

import { createClient } from '@supabase/supabase-js';
import { authWebhook, checkSessionOpen } from './_auth.mjs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

const WORKSHOP_ID = process.env.WORKSHOP_ID;

// Keep in sync with public/js/tasks-data.js — duplicated because Netlify
// functions can't import from public/ at runtime.
const TASK_POINTS = {
  wooden_pickaxe: 200, stone_pickaxe: 200, furnace: 200, iron_ingot: 400,
  iron_pickaxe: 200, diamond: 200,
  first_block: 100, chat_to_player: 100, meet_a_friend: 100,
  home_builder: 100, light_it_up: 100, deep_diver: 100,
};

// Agent Battle: per-pickup diamond IDs (diamond_1, diamond_2, …) carry
// zero points — ranking is by count of diamond_* rows, not point total.
const DIAMOND_RE = /^diamond_\d+$/;
function pointsFor(id) {
  if (TASK_POINTS[id] !== undefined) return TASK_POINTS[id];
  if (DIAMOND_RE.test(id)) return 0;
  return undefined;
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const { participant, id, meta = {} } = await req.json().catch(() => ({}));
  if (!participant || !id) {
    return json({ error: 'participant and id required' }, 400);
  }

  const auth = authWebhook(req, participant);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const sess = await checkSessionOpen(supabase);
  if (!sess.open) return json({ error: sess.error }, 403);

  const points = pointsFor(id);
  if (points === undefined) {
    return json({ error: `unknown achievement: ${id}` }, 400);
  }

  // Find-or-create participant by name.
  let { data: p } = await supabase
    .from('participants')
    .select('id')
    .eq('name', participant)
    .eq('workshop_id', WORKSHOP_ID)
    .maybeSingle();

  if (!p) {
    const { data, error } = await supabase
      .from('participants')
      .insert({ name: participant, workshop_id: WORKSHOP_ID })
      .select('id')
      .single();
    if (error) return json({ error: 'participant create failed' }, 500);
    p = data;
  }

  const { error } = await supabase
    .from('task_completions')
    .upsert(
      { participant_id: p.id, task_id: id, points, meta },
      { onConflict: 'participant_id,task_id' },
    );
  if (error) return json({ error: 'completion save failed' }, 500);

  return json({ ok: true, participant_id: p.id, task_id: id, points });
};

export const config = { path: '/api/achievement' };
