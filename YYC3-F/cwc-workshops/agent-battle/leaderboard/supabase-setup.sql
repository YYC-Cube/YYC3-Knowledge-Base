-- Run this in your Supabase SQL Editor to set up the database

-- Workshops table
CREATE TABLE workshops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alias TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participants table
CREATE TABLE participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  workshop_id UUID REFERENCES workshops(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, workshop_id)
);

-- Task completions table
CREATE TABLE task_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  points INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, task_id)
);

-- Index for fast leaderboard queries
CREATE INDEX idx_task_completions_participant ON task_completions(participant_id);

-- Enable Row Level Security
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- Allow all operations via service role on workshops
CREATE POLICY "Service role full access on workshops"
  ON workshops FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow all operations via service role (used by Netlify functions)
CREATE POLICY "Service role full access on participants"
  ON participants FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on task_completions"
  ON task_completions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Leaderboard view for fast queries
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  p.id,
  p.name,
  p.workshop_id,
  COALESCE(SUM(tc.points), 0) AS total_points,
  COUNT(tc.id) AS tasks_completed,
  MAX(tc.completed_at) AS last_activity
FROM participants p
LEFT JOIN task_completions tc ON p.id = tc.participant_id
GROUP BY p.id, p.name, p.workshop_id
ORDER BY total_points DESC, last_activity ASC;
