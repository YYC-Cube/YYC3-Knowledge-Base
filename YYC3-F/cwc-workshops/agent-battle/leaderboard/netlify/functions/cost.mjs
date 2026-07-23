// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

// POST /api/cost — receives token/turn counts from the agent harness.
//
// Body: {participant, tokens, turns, run_id?}
// Auth: same x-workshop-key shared secret as /api/achievement.
//
// Upserts run_costs keyed by participant. The leaderboard view subtracts
// (tokens/100 + turns*2) from the achievement-points sum. Harnesses should
// POST this periodically (e.g. every 5 turns) so the live board reflects
// running cost, and once more at run end.

import { createClient } from '@supabase/supabase-js';
import { authWebhook, checkSessionOpen } from './_auth.mjs';

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

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const body = await req.json().catch(() => ({}));
  const { participant, tokens, turns, diamonds = 0, run_id, meta = {} } = body;
  if (!participant || tokens === undefined || turns === undefined) {
    return json({ error: 'participant, tokens, turns required' }, 400);
  }

  const auth = authWebhook(req, participant);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const sess = await checkSessionOpen(supabase);
  if (!sess.open) return json({ error: sess.error }, 403);

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

  // diamonds is self-reported (participant owns bot + harness; no trusted
  // source exists). Real integrity = top-3 verify.py replay + live re-run.
  // This monotonic clamp makes the trivial curl cheat climb slowly on the
  // projector instead of spiking, so it's socially visible.
  const rid = run_id || 'default';
  const { data: prev } = await supabase
    .from('run_costs').select('diamonds')
    .eq('participant_id', p.id).eq('run_id', rid).maybeSingle();
  const prevD = prev?.diamonds ?? 0;
  const reqD = Math.max(0, Math.round(diamonds));
  const clampedD = Math.max(prevD, Math.min(reqD, prevD + 10));

  const { error } = await supabase
    .from('run_costs')
    .upsert(
      {
        participant_id: p.id,
        run_id: rid,
        tokens: Math.round(tokens),
        turns: Math.round(turns),
        diamonds: clampedD,
        meta,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'participant_id,run_id' },
    );
  if (error) return json({ error: 'cost save failed' }, 500);

  return json({ ok: true, diamonds: clampedD, clamped: clampedD !== reqD });
};

export const config = { path: '/api/cost' };
