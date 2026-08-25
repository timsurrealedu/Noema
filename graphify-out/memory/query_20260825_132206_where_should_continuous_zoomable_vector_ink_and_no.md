---
type: "query"
date: "2026-08-25T13:22:06.355367+00:00"
question: "Where should continuous zoomable vector ink and note creation live after Infinite Canvas is discontinued?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["VaultOrganizer.tsx", "MixedNoteEditor.tsx", "InkEditor.tsx", "InfiniteCanvas.tsx"]
---

# Q: Where should continuous zoomable vector ink and note creation live after Infinite Canvas is discontinued?

## Answer

VaultOrganizer owns the shared typed or handwritten New note flow. MixedNoteEditor owns continuous Vault-page zoom and zoom-aware ink precision. app/lib/ink.ts and server/vault.mjs keep strokes as smooth vector paths. InfiniteCanvas remains legacy-only and Canvas is removed from active discovery.

## Outcome

- Signal: useful

## Source Nodes

- VaultOrganizer.tsx
- MixedNoteEditor.tsx
- InkEditor.tsx
- InfiniteCanvas.tsx