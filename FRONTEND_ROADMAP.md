# LifeOS Frontend Roadmap

Frontend status is separate from backend integration. `Done` means the interaction is implemented in the browser. Remote actions must show the shared “Not connected yet” notice until their service exists.

## Frontend milestone

### Done

- [x] Responsive desktop shell and mobile navigation
- [x] Dark/light semantic themes with persisted preference
- [x] Today summary, timeline, attention, activity, and quick capture
- [x] Capture inbox, source/status states, review, retry, dismiss, and undo
- [x] Task creation, editing, recurrence fields, subtasks, completion, archive, and views
- [x] Calendar day, week, month, agenda, creation, and editing interfaces
- [x] Vault search, views, Markdown editor, split/read modes, import/export, properties, source, trash, and AI provenance
- [x] Study upload/camera, processing-result, source comparison, flashcard, quiz, and assignment interfaces
- [x] Handwriting and mathematical recognition through image upload
- [x] Project, repository, coding-agent, automation, and Canvas workspaces
- [x] Global navigation search, notifications, contextual AI panel, Activity, Settings, Help, and authentication surfaces
- [x] Shared accessible fallback for AI, authentication, server persistence, integrations, and remote execution
- [x] PWA manifest, service worker, offline shell, share target, update notice, and raster icons
- [x] Loading, empty, error, offline, retry, permission, and partial-success patterns
- [x] Visible focus, non-color states, reduced motion, mobile safe areas, and 44px primary targets

### Remaining verification

- [ ] Full browser interaction suite for primary desktop and mobile flows
- [ ] WCAG 2.2 AA screen-reader, focus-trap, zoom, and text-scaling audit
- [ ] Pixel baselines at 375, 768, 1024, and 1440px
- [ ] Installability verification on a supported mobile browser

## Backend integration backlog

- [~] Authentication, sessions, optional TOTP login, and revocation; in-app TOTP setup and recovery remain
- [x] Durable database persistence, synchronization, encrypted backup, and full workspace export
- [~] Codex interpretation service with review, approval, cancellation, and audit records; execution approval and streaming agent sessions remain
- [x] File/object storage, OCR, transcription, source preservation, and attachment retrieval
- [ ] Calendar and external-service synchronization
- [~] Notifications, automation execution, job logs, metrics, and schedules; streaming agent sessions remain
- [~] Global search, backlink indexing, and relationship persistence; semantic ranking remains
- [ ] Analytics implementation that excludes private note content

## MVP acceptance matrix

| # | Requirement | Frontend | Integration |
|---|---|---|---|
| 1 | Natural-language capture on desktop/mobile | Done | Server-backed; AI provider configuration required |
| 2 | Structured interpretation review | Done | Server apply done; AI provider configuration required |
| 3 | Create/edit tasks | Done | Synced + offline queue |
| 4 | Create/edit events | Done | Synced + offline queue |
| 5 | Tasks/events appear on Today | Done | Synced + offline queue |
| 6 | Create/edit/search notes | Done | Synced + offline queue |
| 7 | Markdown portability | Done | Local import/export |
| 8 | Original images remain linked | Done UI | Object storage + retrieval done |
| 9 | AI information identified | Done | Pending AI |
| 10 | AI actions can be undone | Done UI | Durable audit + undo done |
| 11 | Phone-sized usability | Done | Verification pending |
| 12 | Installable PWA | Done UI | Device verification pending |
| 13 | Loading/error states | Done | Remote errors pending |
| 14 | AI/system activity visible | Done | Audit and undo API wired |
| 15 | Automation status separated from Today | Done | Executor/API done; frontend wiring pending |
| 16 | Keyboard primary flows | Done | Formal audit pending |
| 17 | Light/dark modes | Done | Browser-local |
| 18 | Private notes excluded from analytics | Done policy | Analytics not implemented |
| 19 | Portable note export | Done | Local Markdown |
| 20 | Sensitive actions require confirmation | Done UI | Pending authorization service |

## Deferred beyond MVP

- [ ] Full mobile IDE
- [ ] Advanced automation builder
- [ ] Knowledge-graph visualization
- [ ] Multiplayer collaboration
- [ ] Financial execution controls
- [ ] Plugin marketplace
- [ ] Custom dashboard builder
