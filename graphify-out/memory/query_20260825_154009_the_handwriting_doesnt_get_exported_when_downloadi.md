---
type: "query"
date: "2026-08-25T15:40:09.101759+00:00"
question: "the handwriting doesnt get exported when downloading as a pdf"
contributor: "graphify"
outcome: "useful"
source_nodes: ["MixedNoteEditor.tsx", "Note"]
---

# Q: the handwriting doesnt get exported when downloading as a pdf

## Answer

Expanded from original query via graph vocab: [mixed, note, handwriting, ink, stroke, export, pdf, render, canvas, annotation]. MixedNoteEditor stores handwriting in ordered note_blocks and note_ink_blocks. The PDF renderer instead discovered ink only through markers in flattened notes.content; a later note save could remove those markers while authoritative ink remained. The fix builds mixed-note export input from ordered blocks and reads stroke geometry from note_ink_blocks, so saved handwriting is rendered even when flattened content is stale.

## Outcome

- Signal: useful

## Source Nodes

- MixedNoteEditor.tsx
- Note