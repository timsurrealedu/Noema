---
type: "query"
date: "2026-08-25T13:50:38.970006+00:00"
question: "it said expected version 3 when i was in the middle of annotating zooming zoom out. address and fix that. also new note shouldnt need to open a chooser if its basically the same file. Remove that. then deploy again"
contributor: "graphify"
outcome: "corrected"
correction: "Vault New note creates one mixed note directly with no typed/handwritten chooser; all Vault ink save callers refresh the authoritative block version and retry exact optimistic-version conflicts."
source_nodes: ["saveInkBlock", "InkEditor", "MixedNoteEditor", "VaultOrganizer"]
---

# Q: it said expected version 3 when i was in the middle of annotating zooming zoom out. address and fix that. also new note shouldnt need to open a chooser if its basically the same file. Remove that. then deploy again

## Answer

Expanded from original query via graph vocab: [ink, version, save, sync, conflict, stroke, vault, note, block, editor, create, modal]. saveInkBlock enforces optimistic ink versions; InkEditor reused its original version while OCR or another editor could advance the row, and MixedNoteEditor maintained separate retry logic. The fix centralizes exact Expected version conflict refresh/retry in saveInkWithRetry for both editors. VaultOrganizer now sends New note directly to the one mixed-note creation form; handwriting shortcuts only choose the initial editor mode. Infinite Canvas remains discontinued.

## Outcome

- Signal: corrected
- Correction: Vault New note creates one mixed note directly with no typed/handwritten chooser; all Vault ink save callers refresh the authoritative block version and retry exact optimistic-version conflicts.

## Source Nodes

- saveInkBlock
- InkEditor
- MixedNoteEditor
- VaultOrganizer