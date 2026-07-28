CREATE TABLE vault_sources(
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL, root_path TEXT NOT NULL, task_folders_json TEXT NOT NULL DEFAULT '["TODO/"]',
  state TEXT NOT NULL DEFAULT 'connected', last_sync_at TEXT, last_result_json TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(workspace_id,root_path)
);
CREATE TABLE vault_entries(
  id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES vault_sources(id) ON DELETE CASCADE,
  relative_path TEXT NOT NULL, parent_path TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'note',
  note_id TEXT REFERENCES notes(id) ON DELETE SET NULL, vault_hash TEXT, noema_hash TEXT,
  last_common_content TEXT, sync_state TEXT NOT NULL DEFAULT 'synced', deleted_at TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(source_id,relative_path)
);
CREATE TABLE vault_conflicts(
  id TEXT PRIMARY KEY, entry_id TEXT NOT NULL REFERENCES vault_entries(id) ON DELETE CASCADE,
  vault_content TEXT NOT NULL, noema_content TEXT NOT NULL, base_content TEXT,
  state TEXT NOT NULL DEFAULT 'open', resolution TEXT, created_at TEXT NOT NULL, resolved_at TEXT
);
CREATE TABLE vault_sync_manifests(
  source_id TEXT NOT NULL REFERENCES vault_sources(id) ON DELETE CASCADE,
  relative_path TEXT NOT NULL, sha256 TEXT NOT NULL, scanned_at TEXT NOT NULL,
  PRIMARY KEY(source_id,relative_path)
);
CREATE TABLE vault_task_links(
  source_id TEXT NOT NULL REFERENCES vault_sources(id) ON DELETE CASCADE,
  relative_path TEXT NOT NULL, block_id TEXT NOT NULL, task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  source_fingerprint TEXT NOT NULL, last_representation TEXT NOT NULL, line_number INTEGER NOT NULL,
  updated_at TEXT NOT NULL, PRIMARY KEY(source_id,relative_path,block_id), UNIQUE(task_id)
);
CREATE TABLE note_blocks(
  id TEXT PRIMARY KEY, note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL, kind TEXT NOT NULL, markdown TEXT NOT NULL DEFAULT '', version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(note_id,position), CHECK(kind IN ('markdown','ink'))
);
CREATE TABLE note_ink_blocks(
  block_id TEXT PRIMARY KEY REFERENCES note_blocks(id) ON DELETE CASCADE,
  width REAL NOT NULL, height REAL NOT NULL, strokes_json TEXT NOT NULL, transcript TEXT NOT NULL DEFAULT '',
  equations_json TEXT NOT NULL DEFAULT '[]', ocr_status TEXT NOT NULL DEFAULT 'pending',
  svg_path TEXT, json_path TEXT, stroke_hash TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL
);
CREATE INDEX vault_entries_note ON vault_entries(note_id);
CREATE INDEX vault_entries_parent ON vault_entries(source_id,parent_path);
CREATE INDEX vault_conflicts_state ON vault_conflicts(state,created_at);
CREATE INDEX vault_task_links_task ON vault_task_links(task_id);
CREATE INDEX note_blocks_note ON note_blocks(note_id,position);
