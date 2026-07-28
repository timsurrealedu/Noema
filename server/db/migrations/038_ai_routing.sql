ALTER TABLE jobs ADD COLUMN dedupe_key TEXT;
ALTER TABLE jobs ADD COLUMN next_attempt_at TEXT;
ALTER TABLE jobs ADD COLUMN profile TEXT NOT NULL DEFAULT 'fast';
CREATE UNIQUE INDEX jobs_active_dedupe ON jobs(dedupe_key) WHERE dedupe_key IS NOT NULL AND state IN ('queued','claimed','running');
CREATE INDEX jobs_due ON jobs(state,next_attempt_at,created_at);
CREATE TABLE ai_runs(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
  profile TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  duration_ms INTEGER NOT NULL,
  outcome TEXT NOT NULL,
  fallback_reason TEXT,
  truncated INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX ai_runs_job ON ai_runs(job_id,created_at);
