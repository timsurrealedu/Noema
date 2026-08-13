CREATE TABLE event_occurrences(
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  original_start_at TEXT NOT NULL,
  start_at TEXT,
  end_at TEXT,
  all_day INTEGER,
  cancelled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(event_id,original_start_at)
);
CREATE INDEX event_occurrences_start ON event_occurrences(event_id,start_at);
