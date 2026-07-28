---
type: "query"
date: "2026-07-26T16:08:16.097165+00:00"
question: "Compare the current product with overallPRD.md: differences, missing capabilities, and recommended next steps"
contributor: "graphify"
outcome: "useful"
source_nodes: ["searchAll()", "ModuleShell.tsx", "AutomationsPage()", "StudyPage()", "CodingPage()", "backup"]
---

# Q: Compare the current product with overallPRD.md: differences, missing capabilities, and recommended next steps

## Answer

Expanded from original query via graph vocab: [capture, calendar, tasks, vault, study, tutor, coding, projects, search, automations, audit, backup]. The backend covers most MVP foundations and passes 48 tests. The largest gap is integration: global search, notifications, assistant, settings, automations, study, canvas, and coding-agent surfaces contain fixtures or partial wiring. Missing PRD MVP behavior includes durable reminders, draft state and reviewable optimization diffs, charts and Mermaid, PDF annotation and persistent canvas-region links, event search, production Google Calendar sync, and verified browser/accessibility/PWA/deployment acceptance. Prioritize vertical integration and acceptance evidence before adding breadth.

## Outcome

- Signal: useful

## Source Nodes

- searchAll()
- ModuleShell.tsx
- AutomationsPage()
- StudyPage()
- CodingPage()
- backup