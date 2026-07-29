# Implementation Plan: AI inbox reliability and resource limits

## Overview

Fix retry state accuracy, preserve primary capture context, bound multimodal memory, index AI job events, and reduce unbounded state hydration.

## Architecture decisions

- A retried job keeps its capture in `processing`; only terminal failures expose `failed`.
- The original capture receives a reserved prompt budget; attachments share only the remainder.
- Bulk state returns bounded summaries; detailed notes remain lazy-loaded.
- Database indexing changes use an immutable migration.

## Task list

### Phase 1: AI job correctness

- [x] Task 1: Preserve processing state during transient retries.
- [x] Task 2: Reserve capture prompt budget before attachments.
- [x] Task 3: Reject oversized multimodal inputs before base64 allocation.

### Checkpoint: AI processing

- [ ] Backend focused tests pass.

### Phase 2: Scale paths

- [x] Task 4: Index job-event streaming queries.
- [ ] Task 5: Bound bulk state hydration and browser persistence (deferred: requires paginated replacement APIs so existing pages do not lose older records).

### Checkpoint: Complete

- [ ] Unit tests and production build pass.
- [ ] Capture create → retry → review flow remains functional.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Prompt truncation changes AI output | Test capture priority and report truncation. |
| State summaries break pages | Preserve existing fields used by the shell and lazy-load details. |
| Migration is irreversible | Add only an index. |
