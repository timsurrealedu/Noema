---
type: "query"
date: "2026-08-25T16:19:39.252692+00:00"
question: "theres no annotations in the pdf still"
contributor: "graphify"
outcome: "corrected"
correction: "The handwriting was exported, but the full-page overlay was misclassified as inline content and placed on page 2; it must be composited onto page 1."
source_nodes: ["MixedNoteEditor.tsx", "Note"]
---

# Q: theres no annotations in the pdf still

## Answer

Expanded from original query via graph vocab: [handwriting, capture, note, ink, stroke, export, pdf, render, annotation]. Production inspection proved the PDF contained 19 ink paths, all on page 2 and none on page 1. MixedNoteEditor treats the last ink block as the full-page overlay, but note-pdf rendered it as an inline block after Markdown. Literal br tags and an empty image marker also consumed page space. The fix keeps earlier inline ink in flow, composites the last ink block over page 1 in document coordinates, renders single-point marks, skips empty images and HTML break artifacts, and avoids the duplicate H1.

## Outcome

- Signal: corrected
- Correction: The handwriting was exported, but the full-page overlay was misclassified as inline content and placed on page 2; it must be composited onto page 1.

## Source Nodes

- MixedNoteEditor.tsx
- Note