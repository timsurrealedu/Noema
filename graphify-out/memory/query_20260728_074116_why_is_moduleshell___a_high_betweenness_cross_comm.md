---
type: "query"
date: "2026-07-28T07:41:16.148408+00:00"
question: "Why is ModuleShell() a high-betweenness cross-community bridge?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["ModuleShell()", "ModuleShell.tsx", "page.tsx"]
---

# Q: Why is ModuleShell() a high-betweenness cross-community bridge?

## Answer

Expanded from original query via graph vocab: [module, shell, key, page, layout, google, calendar]. ModuleShell is a genuine UI bridge because at least ten route pages import the shared component, which centralizes navigation, search, notifications, theme, assistant, and responsive shell behavior. The inferred edges to backend key() and label() are false-positive identifier collisions: ModuleShell defines a local keyboard callback named key and destructures label in navigation mappings; it does not call server/google-calendar.mjs key().

## Outcome

- Signal: useful

## Source Nodes

- ModuleShell()
- ModuleShell.tsx
- page.tsx