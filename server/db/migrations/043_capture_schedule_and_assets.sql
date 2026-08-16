ALTER TABLE tasks ADD COLUMN event_id TEXT REFERENCES events(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL;
CREATE INDEX tasks_event_id ON tasks(event_id);
CREATE INDEX events_task_id ON events(task_id);
CREATE TABLE event_reminders(
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  offset_minutes INTEGER NOT NULL CHECK(offset_minutes >= 0 AND offset_minutes <= 525600),
  reminder_at TEXT NOT NULL,
  sent_at TEXT,
  PRIMARY KEY(event_id,offset_minutes)
);
CREATE INDEX event_reminders_due ON event_reminders(reminder_at,sent_at);
CREATE TABLE note_assets(
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  relative_path TEXT NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  PRIMARY KEY(note_id,asset_id)
);
