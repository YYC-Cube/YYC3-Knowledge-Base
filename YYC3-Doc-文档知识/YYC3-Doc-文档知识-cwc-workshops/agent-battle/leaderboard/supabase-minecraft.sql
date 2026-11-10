-- Minecraft workshop additions.
-- Run AFTER supabase-setup.sql (which creates workshops, participants,
-- task_completions, and the base leaderboard view).

-- Per-participant cost reporting from the agent harness.
CREATE TABLE run_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  run_id TEXT NOT NULL DEFAULT 'default',
  tokens INTEGER NOT NULL DEFAULT 0,
  turns INTEGER NOT NULL DEFAULT 0,
  meta JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, run_id)
);

-- Per-run diamond count, reported by the harness alongside tokens/turns.
-- This is now the authoritative scoring signal; diamond_N achievements
-- remain only for the narration ticker.
ALTER TABLE run_costs ADD COLUMN IF NOT EXISTS diamonds INTEGER NOT NULL DEFAULT 0;

-- task_completions comes from supabase-setup.sql; add the meta column here
-- so the achievement webhook can store {tick_rate, bot_hash} per fire.
ALTER TABLE task_completions ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;

-- Facilitator-controlled session window. One row per workshop event.
-- Achievement/cost POSTs are rejected outside [opened_at, closed_at) of
-- the latest row; closed_at defaults to opened_at + duration_seconds.
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 2700
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on sessions"
  ON sessions FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_run_costs_participant ON run_costs(participant_id);

ALTER TABLE run_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on run_costs"
  ON run_costs FOR ALL USING (true) WITH CHECK (true);

-- Live narration feed (bot chat lines + agent thoughts) for the cast-mode
-- Twitch-style ticker. Append-only; the cast view polls newest rows.
CREATE TABLE narrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  text TEXT NOT NULL,
  ts TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_narrations_ts ON narrations(ts DESC);

ALTER TABLE narrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on narrations"
  ON narrations FOR ALL USING (true) WITH CHECK (true);

-- Agent Battle leaderboard view — best-single-run scoring.
-- For each participant, pick the ONE run_costs row (within the latest
-- session window) with the most diamonds; tiebreak by fewest tokens.
-- That row's diamonds/tokens/turns become the participant's ranked stats.
-- Achievement columns are retained for audit/cast-view display only.
CREATE OR REPLACE VIEW leaderboard AS
WITH window AS (
  SELECT opened_at,
         COALESCE(closed_at, opened_at + make_interval(secs => duration_seconds)) AS closes_at
  FROM sessions ORDER BY opened_at DESC LIMIT 1
)
SELECT
  p.id,
  p.name,
  p.workshop_id,
  COALESCE(ach.achievement_points, 0) AS achievement_points,
  COALESCE(best.tokens, 0) AS tokens,
  COALESCE(best.turns, 0) AS turns,
  COALESCE(ach.milestones, 0) AS milestones,
  COALESCE(ach.quests, 0) AS quests,
  COALESCE(best.diamonds, 0) AS diamonds_count,
  best.run_id AS best_run_id,
  COALESCE(ach.completed_tasks, ARRAY[]::text[]) AS completed_tasks,
  ach.last_activity
FROM participants p
LEFT JOIN LATERAL (
  SELECT rc.run_id, rc.diamonds, rc.tokens, rc.turns
  FROM run_costs rc, window w
  WHERE rc.participant_id = p.id
    AND rc.updated_at >= w.opened_at
    AND rc.updated_at <= w.closes_at
  ORDER BY rc.diamonds DESC, rc.tokens ASC
  LIMIT 1
) best ON true
LEFT JOIN LATERAL (
  SELECT
    SUM(tc.points) AS achievement_points,
    COUNT(*) FILTER (WHERE tc.task_id IN
      ('wooden_pickaxe','stone_pickaxe','furnace','iron_ingot','iron_pickaxe','diamond')
    ) AS milestones,
    COUNT(*) FILTER (WHERE tc.task_id IN
      ('first_block','chat_to_player','meet_a_friend','home_builder','light_it_up','deep_diver')
    ) AS quests,
    array_agg(tc.task_id) AS completed_tasks,
    MAX(tc.completed_at) AS last_activity
  FROM task_completions tc WHERE tc.participant_id = p.id
) ach ON true
ORDER BY diamonds_count DESC, tokens ASC, last_activity ASC;
