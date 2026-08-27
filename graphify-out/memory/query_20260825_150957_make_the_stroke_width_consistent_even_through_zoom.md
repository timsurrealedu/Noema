---
type: "query"
date: "2026-08-25T15:09:57.490697+00:00"
question: "make the stroke width consistent even through zoom in and out. Then fix the download as pdf function. Also how do i upload pdf and annotate on it?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["MixedNoteEditor.tsx", "InkEditor.tsx", "AnnotatePdfPage"]
---

# Q: make the stroke width consistent even through zoom in and out. Then fix the download as pdf function. Also how do i upload pdf and annotate on it?

## Answer

Expanded from original query via graph vocab: [ink, stroke, strokes, scale, viewport, pdf, export, asset, annotate, annotation, canvas, mixed]. MixedNoteEditor divided document-space brush width by zoom after SVG inverse mapping; remove that second scale. notePdf received an undefined database from the route and dereferenced it; default to getDatabase. Uploaded PDF assets are available in Capture; expose the existing /assets/{id}/annotate workspace there.

## Outcome

- Signal: useful

## Source Nodes

- MixedNoteEditor.tsx
- InkEditor.tsx
- AnnotatePdfPage