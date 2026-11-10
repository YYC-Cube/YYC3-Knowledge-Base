// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

// Shared webhook auth for /api/achievement, /api/cost, /api/narration.
//
// Accepts either:
//   1. Authorization: Bearer <jwt>  — per-participant token issued by
//      /api/login/participant-token. Caller body.participant must match
//      the token's `participant` claim.
//   2. x-workshop-key: <WORKSHOP_KEY>  — legacy shared secret used by the
//      facilitator (cast view, verify.py) and by dev-server local runs.
//      Acts as an admin bypass — any participant name in body is accepted.
//
// Returns { ok: true, admin, participant } on success, or { ok: false, status, error }
// on failure. Caller is responsible for producing the Response.
//
// Fail-closed behavior in production: if neither WORKSHOP_KEY nor JWT_SECRET
// is set (or JWT_SECRET is still the default), reject unless in local dev.

import jwt from 'jsonwebtoken';

const DEFAULT_JWT_SECRET = 'workshop-secret-change-me';
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
const WORKSHOP_KEY = process.env.WORKSHOP_KEY || '';
const IS_PRODUCTION = process.env.NETLIFY === 'true' || process.env.CONTEXT === 'production';

export function authWebhook(req, bodyParticipant) {
  // Production hardening: refuse to run with default JWT secret.
  if (IS_PRODUCTION && (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT_SECRET)) {
    return { ok: false, status: 500, error: 'JWT_SECRET not configured' };
  }

  const auth = req.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) {
    let claims;
    try {
      claims = jwt.verify(auth.slice(7), JWT_SECRET);
    } catch {
      return { ok: false, status: 401, error: 'invalid token' };
    }
    // Admin tokens (from /api/admin/login) bypass the participant check —
    // facilitator tooling can report on anyone's behalf.
    if (claims.admin === true) {
      return { ok: true, admin: true, participant: bodyParticipant || null };
    }
    if (claims.typ !== 'participant' || !claims.participant) {
      return { ok: false, status: 401, error: 'not a participant token' };
    }
    if (bodyParticipant && bodyParticipant !== claims.participant) {
      return { ok: false, status: 401, error: 'participant mismatch' };
    }
    return { ok: true, admin: false, participant: claims.participant };
  }

  // Legacy shared secret — facilitator/dev-mode path. Only honored when the
  // server actually has a WORKSHOP_KEY configured.
  if (WORKSHOP_KEY && req.headers.get('x-workshop-key') === WORKSHOP_KEY) {
    return { ok: true, admin: true, participant: bodyParticipant || null };
  }

  // No WORKSHOP_KEY set AND no Bearer token: allow only in non-production
  // local dev where neither secret is configured (matches old behavior).
  if (!WORKSHOP_KEY && !IS_PRODUCTION) {
    return { ok: true, admin: true, participant: bodyParticipant || null };
  }

  return { ok: false, status: 401, error: 'unauthorized' };
}

// Session-window guard shared by /api/cost and /api/achievement.
// Returns {open: true} if `now` falls inside the latest session's
// [opened_at, closed_at ?? opened_at+duration] window, else
// {open: false, error}. Caller should 403 when not open.
export async function checkSessionOpen(supabase) {
  const { data: s } = await supabase
    .from('sessions')
    .select('opened_at, closed_at, duration_seconds')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!s) return { open: false, error: 'session not open' };
  const opened = new Date(s.opened_at).getTime();
  const closes = s.closed_at
    ? new Date(s.closed_at).getTime()
    : opened + (s.duration_seconds || 2700) * 1000;
  const now = Date.now();
  if (now < opened || now > closes) return { open: false, error: 'session not open' };
  return { open: true };
}
