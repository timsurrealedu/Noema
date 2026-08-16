CREATE TABLE handwriting_intakes(
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  capture_id TEXT NOT NULL UNIQUE REFERENCES captures(id) ON DELETE CASCADE,
  vault_source_id TEXT NOT NULL REFERENCES vault_sources(id) ON DELETE CASCADE,
  original_path TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('quick','folder')),
  draft INTEGER NOT NULL DEFAULT 1,
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','queued','processing','done','failed','review')),
  ink_block_id TEXT REFERENCES note_ink_blocks(block_id) ON DELETE SET NULL,
  generated_block_id TEXT REFERENCES note_blocks(id) ON DELETE SET NULL,
  original_blocks_json TEXT NOT NULL DEFAULT '[]', result_json TEXT, error TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX handwriting_intakes_state ON handwriting_intakes(workspace_id,state,created_at);
