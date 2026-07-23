// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const DEFAULT_JWT_SECRET = 'workshop-secret-change-me';
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
const WORKSHOP_KEY = process.env.WORKSHOP_KEY || '';
const IS_PRODUCTION = process.env.NETLIFY === 'true' || process.env.CONTEXT === 'production';

// Verify either an admin JWT or the shared WORKSHOP_KEY. Used to gate the
// /participant-token route — participants must NOT be able to self-mint
// tokens for arbitrary names (that would reintroduce the original S1 bug).
function verifyFacilitator(req) {
  const auth = req.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
      if (decoded.admin === true) return true;
    } catch {
      // fall through
    }
  }
  if (WORKSHOP_KEY && req.headers.get('x-workshop-key') === WORKSHOP_KEY) {
    return true;
  }
  return false;
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  // POST /api/login/participant-token — mint a per-participant webhook token.
  // Caller must authenticate as a facilitator (admin JWT or WORKSHOP_KEY);
  // this endpoint is intended to be called during workshop setup, with the
  // resulting token distributed out-of-band to each participant.
  if (path.endsWith('/participant-token')) {
    if (IS_PRODUCTION && (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT_SECRET)) {
      return new Response(JSON.stringify({ error: 'JWT_SECRET not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (!verifyFacilitator(req)) {
      return new Response(JSON.stringify({ error: 'facilitator auth required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    let body;
    try { body = await req.json(); } catch { body = {}; }
    const participant = (body.participant || '').trim().slice(0, 50);
    if (!participant) {
      return new Response(JSON.stringify({ error: 'participant required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const token = jwt.sign(
      { participant, typ: 'participant' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    return new Response(JSON.stringify({ token, participant }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { name, workshop_alias } = await req.json();

    if (!name || !workshop_alias) {
      return new Response(JSON.stringify({ error: 'Name and workshop code are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const trimmedName = name.trim().slice(0, 50);
    const trimmedAlias = workshop_alias.trim().toLowerCase().slice(0, 100);

    // Lookup or auto-create workshop by alias
    let { data: workshop } = await supabase
      .from('workshops')
      .select('*')
      .eq('alias', trimmedAlias)
      .maybeSingle();

    if (!workshop) {
      const { data: newWorkshop, error: wsError } = await supabase
        .from('workshops')
        .insert({ alias: trimmedAlias })
        .select()
        .single();

      if (wsError) {
        // Race condition — try fetching again
        const { data: retryWs } = await supabase
          .from('workshops')
          .select('*')
          .eq('alias', trimmedAlias)
          .maybeSingle();

        if (retryWs) {
          workshop = retryWs;
        } else {
          return new Response(JSON.stringify({ error: 'Failed to create workshop.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } else {
        workshop = newWorkshop;
      }
    }

    // Upsert participant scoped to (name, workshop_id)
    let { data: participant } = await supabase
      .from('participants')
      .select('*')
      .eq('name', trimmedName)
      .eq('workshop_id', workshop.id)
      .maybeSingle();

    if (!participant) {
      const { data: newParticipant, error: insertError } = await supabase
        .from('participants')
        .insert({ name: trimmedName, workshop_id: workshop.id })
        .select()
        .single();

      if (insertError) {
        // Race condition — try fetching again
        const { data: retryData } = await supabase
          .from('participants')
          .select('*')
          .eq('name', trimmedName)
          .eq('workshop_id', workshop.id)
          .maybeSingle();

        if (retryData) {
          participant = retryData;
        } else {
          return new Response(JSON.stringify({ error: 'Failed to create participant. Try a different name.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } else {
        participant = newParticipant;
      }
    }

    const token = jwt.sign(
      { id: participant.id, name: participant.name, workshop_id: workshop.id, workshop_alias: trimmedAlias },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return new Response(JSON.stringify({
      token,
      name: participant.name,
      id: participant.id,
      workshop_alias: trimmedAlias
    }), {
      status: 200,
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
  path: ["/api/login", "/api/login/participant-token"]
};
