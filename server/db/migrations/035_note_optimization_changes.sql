ALTER TABLE note_optimizations ADD COLUMN base_version INTEGER;
ALTER TABLE note_optimizations ADD COLUMN changes_json TEXT NOT NULL DEFAULT '[]';
