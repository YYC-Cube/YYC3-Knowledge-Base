// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async (req) => {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(req.url);
    const workshopAlias = url.searchParams.get('workshop');

    if (!workshopAlias) {
      return new Response(JSON.stringify({ error: 'Workshop parameter is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Lookup workshop by alias
    const { data: workshop } = await supabase
      .from('workshops')
      .select('id')
      .eq('alias', workshopAlias)
      .maybeSingle();

    if (!workshop) {
      return new Response(JSON.stringify({ leaderboard: [] }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Query the leaderboard view filtered by workshop_id, limit to top 15.
    // Agent Battle: rank by diamonds_count desc, tokens asc (tiebreaker).
    // The view already ORDER BYs the same way; explicit order here is a
    // belt-and-suspenders guard for clients that ignore the view ordering.
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('workshop_id', workshop.id)
      .order('diamonds_count', { ascending: false })
      .order('tokens', { ascending: true })
      .limit(15);

    if (error) {
      return new Response(JSON.stringify({ error: 'Failed to load leaderboard.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ leaderboard: data || [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = {
  path: "/api/leaderboard"
};
