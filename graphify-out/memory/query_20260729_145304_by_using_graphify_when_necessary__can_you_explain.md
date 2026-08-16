---
type: "query"
date: "2026-07-29T14:53:04.363924+00:00"
question: "by using graphify when necessary, can you explain how this works? the vault, vault's contents, notes, management, the study, tasks, calendar, coding and how AI works in each of those elements?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["vault.mjs", "runAI", "StudyPage", "TasksPage", "CalendarPage", "CodingPage"]
---

# Q: by using graphify when necessary, can you explain how this works? the vault, vault's contents, notes, management, the study, tasks, calendar, coding and how AI works in each of those elements?

## Answer

Expanded from graph vocab: [vault, notes, management, study, tasks, calendar, coding, ai, capture, jobs, search, sync]. The graph connects AppState and ModuleShell to feature pages and API routes; SQLite core stores notes/tasks/events; vault maintains markdown projections and block/ink data, with sync/conflict handling. Capture and OCR queue jobs; workers invoke runAI and validate/save proposed actions. Study invokes runTutor through the skills API. Calendar uses a Google pull/push conflict-aware sync module. Coding is a ModuleShell page; runtime AI agent profiles are persisted separately. Sources: server/vault.mjs, server/core.mjs, server/ai.mjs, server/skills.mjs, server/calendar-sync.mjs, app components/pages.

## Outcome

- Signal: useful

## Source Nodes

- vault.mjs
- runAI
- StudyPage
- TasksPage
- CalendarPage
- CodingPage