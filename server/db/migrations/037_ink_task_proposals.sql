CREATE TABLE ink_task_proposals(
  id TEXT PRIMARY KEY,
  block_id TEXT NOT NULL REFERENCES note_ink_blocks(block_id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'review',
  created_at TEXT NOT NULL,
  reviewed_at TEXT,
  UNIQUE(block_id,text),
  CHECK(state IN ('review','accepted','dismissed'))
);
CREATE INDEX ink_task_proposals_review ON ink_task_proposals(state,created_at);
