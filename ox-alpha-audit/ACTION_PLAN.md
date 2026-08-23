# Noema Action Plan — Fix, Enhance, Extend

- **Date:** 2026-08-23 · Baseline commit `ee9f0f8`
- **Sources:** `AUDIT_REPORT.md`, `COMPARISON_WITH_DEEPSEEK_AUDIT.md`, `../deepseek-audit/*`
- **Owner model:** Solo developer (assumed). Effort sizes: **S** <0.5d · **M** 0.5–2d · **L** 2–5d · **XL** 5–10d. Add 20–30% buffer.
- **Method:** Phased/milestone hybrid — each phase ends in a demo-able gate tied to one of Timmy's real scenarios. Dependencies explicit; Phases 0→1→3 are the critical path.
- **Progress (2026-08-24):**
  - ✅ Phase 0 complete — all behavioral P0s green (G0)
  - ✅ Phase 1 complete — shared ink viewport helpers (`lib/ink.ts`), dynamic touch-action, in-flow ink blocks w/ handles, mode ergonomics, PDF annotator pointer grammar (F1.3 shipped as block-level flow anchoring per mitigation plan; pixel-level stroke anchoring deferred)
  - ✅ Phase 2 complete — OCR surfacing panel, `continue-math` job + review card, structured image extraction (Gemini vision), camera batch capture, optimize mode picker + per-op diffs + no draft flip, AI opt-out toggle, process-inbox wiring (G2 paths in place)
  - ✅ Phase 3 complete — DOCX→PDF conversion, annotator eraser/colors/edit/delete/page-guard, export fidelity via shared style constants, rich note-PDF renderer + CJK font path, backup tables + sidecar import, magic-byte sniffing (G3)
  - ✅ Phase 4 complete — durable chunked recorder w/ recovery, `transcribe-audio` job (ffmpeg chunking, Gemini→Groq Whisper→whisper.cpp), transcript panel w/ synced player + summarize-to-study-note, honest voice tagging (G4)
  - ✅ Phase 5 mostly complete — dual-create + symmetric linking + eval script, reminder presets (env+settings), auto-apply trusted captures, real `/tasks` page (+SW precache), editor depth (monthly/weekdays/interval repeat, tz combobox, minutes-before presets), recurring task regeneration, Google sync worker interval. ⚠️ F5.5 remainder: Month "+N more" popover & multi-day spanning deferred
  - ✅ Phase 6 complete — parallel multi-provider compare mode, provenance-labeled inserts, vault-safe block-API inserts, math sessions on Quality profile
  - Next: Phase 7 (Binusmaya import-first), then P8/P9

## North star: ten scenarios that define done

| # | Scenario |
|---|---|
| S1 | Jot "meeting tomorrow 1pm" → confirm once → event + task exist, pushes arrive at T-60m and T-30m |
| S2 | Record lecture → chunked upload survives navigation → transcript + AI study note linked to the course |
| S3 | Photograph whiteboard/PPT → structured note with LaTeX equations and tables, photo preserved |
| S4 | Lazy bullet dump → tap Optimize (study mode) → detailed explained note; original versioned |
| S5 | Import lecturer PDF **or DOCX** → annotate by hand → export flattened PDF, submit |
| S6 | Half-finished handwritten formula → AI proposes LaTeX continuation as reviewable block; strokes untouched |
| S7 | Tablet: pinch-zoom + pan while handwriting over typed text; annotations stay put when typing above |
| S8 | Ask 2–3 AIs side-by-side → insert the explanation that clicked, tagged with provider+question |
| S9 | Open coding page on phone → run multi-file C program → see output |
| S10 | Import binusmaya data → calendar/tasks auto-populated per mata kuliah + session & semester overviews |

---

## Phase 0 — Stop the bleeding (behavioral P0s) · ~1 week

Everything else inherits these failures. No new features until green.

| ID | Item | Size | Files | Acceptance |
|---|---|---|---|---|
| F0.1 | Fix SW precache: remove `/tasks` from shell for now (F5.4 re-adds properly) | S | `public/sw.js` | SW installs offline; PWA installable |
| F0.2 | Deliver `event_reminders`: sweep `reminder_at<=now AND sent_at IS NULL`, mark sent | M | `server/modules.mjs` | Linked-event reminders fire at offsets; test asserts deliveries |
| F0.3 | Stop reminder erasure on task toggle (preserve null-vs-cleared semantics) | S | `app/components/AppState.tsx` | Toggle twice → reminder intact |
| F0.4 | Run worker in dev (`npm run dev` = next + worker concurrently); loud log when absent | S | `package.json` | Fresh clone interprets captures w/o manual worker |
| F0.5 | Route typed captures through offline queue; replay on reconnect | M | `AppState.tsx`, `offlineQueue.ts` | Offline capture survives reload+reconnect |
| F0.6 | PDF export hardening: clamp annotation pages to real count; skip bad rows; charset try/catch → 422 | M | `server/pdf-export.mjs`, `server/annotations.mjs` | Poisoned annotation no longer 500s exports |
| F0.7 | Fix ContextualAssistant Plan endpoint (`/api/v1/captures`) + guard non-project recommendations | S | `ContextualAssistant.tsx`, `recommendations.mjs` | Plan works from Home/Study |
| F0.8 | Persist Crepe images: Milkdown `onUpload` → assets API → stable URL | S | `LiveMarkdownEditor.tsx` | Inserted image renders after reload |
| F0.9 | Silent-failure switches: visible job status chips + retry (OCR/transcribe/interpret); real notifications popover replaces Home bell stub | M | editor, Home, shared hook | No background job can fail invisibly |

**Gate G0:** S1 works end-to-end incl. push; PWA installs; zero silent failures.

---

## Phase 1 — Tablet ink experience (the core ask) · ~2 weeks

| ID | Item | Size | Files | Acceptance |
|---|---|---|---|---|
| F1.1 | Extract shared ink viewport (`InkView`: pinch 0.25-4x at gesture center, two-finger pan, ctrl-wheel zoom, finger=scroll / pen=draw) from `InkEditor.tsx` into `lib/ink.ts` | L | `lib/ink.ts`, `InkEditor.tsx` | One tested implementation |
| F1.2 | Adopt `InkView` in note overlay; replace blanket `touch-action:none` with dynamic mode | L | `MixedNoteEditor.tsx`, `globals.css` | S7 passes on iPad/Android tablet |
| F1.3 | Content-anchored strokes: anchor `{blockId, offset}` per stroke bbox; remap on layout change; rescale legacy via stored width/height | XL | overlay renderer, `server/vault.mjs` | Type above annotation -> stroke tracks; rotation no skew |
| F1.4 | Render ALL ink blocks at their positions (kill `.find()` first-only); block handles: insert/move/delete ink (wire existing dead APIs) | M | `MixedNoteEditor.tsx` | Mid-document ink visible + insertable |
| F1.5 | Mode ergonomics: Edit default on desktop / last-used on mobile; pen-near = ink, finger = scroll, explicit toggle as fallback | M | `MixedNoteEditor.tsx` | Pen pickup draws immediately; put-down scrolls |
| F1.6 | Same pointer grammar in PDF annotator (`InkView` + palm rejection) | M | `assets/[id]/annotate/page.tsx` | Identical gestures across surfaces |

**Gate G1:** S7 passes; 5-minute handwriting-over-typing session survives reload losslessly.

---

## Phase 2 — Visible, controllable AI (OCR -> math continuation) · ~2 weeks

Depends on F1.3/F1.4.

| ID | Item | Size | Files | Acceptance |
|---|---|---|---|---|
| F2.1 | Ink OCR surfacing: status chip -> panel (transcript + equations + confidence); Edit (existing PATCH), Insert-as-markdown, Dismiss; poll jobs | M | `MixedNoteEditor.tsx` | Handwritten math visibly becomes editable LaTeX |
| F2.2 | Math continuation: new `continue-math` worker job (claim array + dispatch); input = trailing blocks' markdown + transcripts + rasterized strokes; schema `{analysis, continuation(LaTeX), confidence, assumptions}`; workload `"handwritten-math"`; result = proposed markdown block behind diff-review | XL | new handler/route/UI | S6 passes; strokes never modified |
| F2.3 | Structured image extraction `{text, equations[{latex,confidence}], tables[{markdown}]}`; interpreter sees pixels not just text | M | `extract.mjs`, `interpret-capture.mjs` | S3: whiteboard photo yields rendered equations |
| F2.4 | Camera quick-action (`capture="environment"`) + multi-photo batch merged into one interpretation | M | composer, captures API | 3 photos -> 1 proposal set |
| F2.5 | Optimize UI for vault notes: mode picker (light/organize/study/technical/voice), inline op diffs w/ reasons, no forced-draft flip | M | `vault/page.tsx`, editor | S4 passes on Obsidian-backed note |
| F2.6 | Pre-AI opt-out toggle per capture + settings default; skipped captures stay raw inbox items | S | composer, route | Toggle off -> no job enqueued |
| F2.7 | Wire `process-pending` into inbox UI (button + auto-run on open) | S | `capture/page.tsx` | Pending handwriting enriches in seconds |

**Gate G2:** S3, S4, S6 demo end-to-end.

---

## Phase 3 — Submission loop (import -> annotate -> export) · ~2 weeks

| ID | Item | Size | Files | Acceptance |
|---|---|---|---|---|
| F3.1 | DOCX->PDF conversion at upload (LibreOffice headless behind env flag, graceful skip); then annotatable like any PDF | L | ingest, converter module | S5 works for .docx |
| F3.2 | Annotator completeness: eraser, edit/delete UI (existing PATCH/DELETE), color picker, page-count guard on save | M | annotate page | Mistakes correctable in-app |
| F3.3 | Export fidelity: comments drawn, stored colors honored, stroke smoothing/width, text sizing; preview matches output via shared style constants | M | `pdf-export.mjs` | Screenshot vs export ~= identical |
| F3.4 | Note->PDF v2: real markdown rendering (KaTeX, GFM tables, images, ink SVG embeds) + embedded CJK-safe font subset | XL | rewrite `note-pdf.mjs` | Rich note exports submission-worthy |
| F3.5 | Backup/export completeness: include `pdf_annotations`, `note_blocks`, `note_ink_blocks`; JSON-sidecar import endpoint | M | `ops.mjs`, annotations routes | Round-trip preserves everything |
| F3.6 | Magic-byte MIME sniffing + friendly 415 guidance | S | `objects.mjs` | octet-stream PDFs upload |

**Gate G3:** S5 passes for PDF and DOCX.

---

## Phase 4 — Audio lectures · ~1.5 weeks

| ID | Item | Size | Acceptance |
|---|---|---|---|
| F4.1 | Durable recorder: pause/resume, chunked webm persisted to IndexedDB blob store (reuse offline queue), survives navigation/tab-close | L | Kill tab mid-recording -> audio recoverable |
| F4.2 | Dedicated `transcribe-audio` job; server-side chunking (ffmpeg segments) beats 10MB cap; chain Gemini -> Groq Whisper -> local whisper.cpp optional | L | 60-min lecture transcribes fully |
| F4.3 | Transcript block kind: timestamped segments + synced inline player; "Summarize into note" chains optimize(study) | L | S2 passes; click line seeks audio |
| F4.4 | Honest `source:"voice"` tagging + mic button on Capture page visible at all widths | S | Inbox filters voice memos |

**Gate G4:** S2 passes.

---

## Phase 5 — Deterministic scheduling & calendar feel · ~1.5 weeks

| ID | Item | Size | Acceptance |
|---|---|---|---|
| F5.1 | Interpret prompt requires dual-create when both implied; apply links symmetrically (event.create also spawns task option) | M | S1 deterministic across 10 phrasings (eval script) |
| F5.2 | Reminder presets configurable (default [60,30]) in Settings + env override; dedupe hardcoded copies | S | Changed preset applies to next captures |
| F5.3 | Optional auto-apply mode for trusted patterns; undo toast retained | M | "Jot and go" under 3 taps |
| F5.4 | Real `/tasks` page: checkbox groups, checkable subtasks (promote `parentTaskId`), quick-add; SW precache re-adds it | M | Matches Timmy's checkbox mental model |
| F5.5 | Calendar parity: click-slot create everywhere, Month "+N more" popover, multi-day spanning, Day-view interactions, drag undo toast | M | GCal-like one-handed use |
| F5.6 | Editor depth: Monthly/Weekdays/Custom-lite repeat, timezone combobox, "N minutes before" presets, full-week dropdown | M | Common recurrences without RRULE knowledge |
| F5.7 | Recurring task regeneration engine | M | Daily chore recurs on completion |
| F5.8 | Google sync automation via worker interval; fix-or-implement task sync tooltip | M | Syncs without button press |

**Gate G5:** S1 rock-solid.

---

## Phase 6 — Tutor that captures the "click" · ~1 week

| ID | Item | Size | Acceptance |
|---|---|---|---|
| F6.1 | Parallel multi-provider ask (up to N enabled agents, tabbed answers, pick-to-insert) | L | S8 part 1 |
| F6.2 | Provenance-labeled inserts (question excerpt + provider + date); caret/block-position targeting, not EOF | M | S8 part 2 |
| F6.3 | Vault-safe insert via block API (not whole-note saveNote); in-place refresh; kill double-insert path | M | No stale-editor divergence |
| F6.4 | Math sessions route to Quality profile, not Fast | S | Deeper math answers |

---

## Phase 7 — Binusmaya & study intelligence · ~2 weeks (import-first)

| ID | Item | Size | Acceptance |
|---|---|---|---|
| F7.1 | CSV/JSON import wizard -> courses/schedules/assignments using unused `source:"binusmaya"` + `external_id` columns; idempotent re-import | L | Paste CSV -> courses appear; re-import dedupes |
| F7.2 | Schedule materializer: meeting patterns -> recurring events + pre-class reminder tasks | M | Calendar fills itself from import |
| F7.3 | Assignment sync -> due tasks + T-72h/T-24h reminders; status write-back UI | M | Deadlines never missed |
| F7.4 | Study CRUD completion (assignments/cards/quizzes UI); fix "Capture lecture" stub to attach files | M | Module usable without curl |
| F7.5 | Overview generator: per-course session-per-session + semester overview note from uploaded materials; dashboard widget | XL | S10 complete |
| F7.6 | Study recommendations rule-first (due-soon, weak retention, stale course) proposing calendar/task actions; weekly digest notification | L | One-tap accepts |
| F7.7 | Binusmaya scraper exploration - deferred behind experimental flag (ToS/brittleness risk) | XL | Only after F7.1 proves value |

**Gate G7:** S10 passes import-first.

---

## Phase 8 — Coding from the pocket · ~3 days

| ID | Item | Size |
|---|---|---|
| F8.1 | Multi-file runs: stage selected saved files beside main.<ext> so gcc sees siblings | M |
| F8.2 | Server-side kill IPC for Stop (PID tracking + kill endpoint); client abort stays secondary | M |
| F8.3 | Languages endpoint reflects real toolchain+bwrap availability | S |
| F8.4 | Coding in mobile More nav + file download/export button | S |

**Gate G8:** S9 passes.

---

## Phase 9 — Design system, a11y & navigation polish · ~1.5 weeks

Merged deepseek REMEDIATION_PLAN minus stale items already fixed at HEAD (their P6-1 pen-gating, P5-2/M13 calendar-touch).

| Batch | Items |
|---|---|
| 9a Tokens/a11y-critical | sidebar tone distinct from surface · code tone distinct · --faint WCAG AA · light-theme AA recalc · login minLength hint + fix `.env.example` password · create `/graph` stub mounting KnowledgeGraphView · skip-link renders in DOM |
| 9b Navigation | Canvas/Notifications/Activity into moreNav + active indicators · Settings single-entry · z-index scale tokens · analytics allowed-set update |
| 9c Keyboard/locale | compiler h1 · Cmd/Ctrl-K platform detect · autoFocus desktop-only hook · locale-aware time format · read/unread visual distinction |
| 9d Performance/CSS | transition:all purge · split 257KB globals.css · FOUC/theme-color meta verify · unified scrollbar system |
| 9e Compiler island | focus-within outline · syntax colors -> Gruvbox tokens · light overrides verify |
| 9f Polish | humanized delivery statuses + OCR enums + env-var labels · global-error.tsx · skeleton loaders · list virtualization · URL state persistence |

---

## Cross-cutting workstreams (continuous)

1. **Dead-code harvest:** orphaned features get *wired or deleted* in the phase owning them (ink-insert controls P1, transcript correction P2, voice/link sources P4, sidecar import P3, optimize modes P2). Rule: no UI-invokable code ships without an entry point.
2. **Silent-failure policy:** every background job exposes {queued/running/done/error} + retry where it was spawned (from F0.9 onward).
3. **Docs truthfulness:** smoke-test asserts documented routes/features exist (`docs-claims.test.js`) so README/PROJECT.md cannot drift again.
4. **Gate e2e tests:** one Playwright spec per scenario S1-S10, run pre-merge.

## Dependency map (critical path)

```
P0 -> P1 -> P2          (anchors before OCR surfacing/continuation)
P0 -> P3                (export hardening before fidelity work)
P0 -> P4                (offline queue reuse for recorder)
P5 independent of P1-P4 (calendar/tasks track)
P7 depends on P5        (reminders/presets must work first)
P6, P8, P9 fully parallel fillers
```

## Top risks & mitigations

| Risk | Prob | Impact | Mitigation |
|---|---|---|---|
| Content-anchored ink (F1.3) harder than estimated | High | High | Ship block-level anchoring first (good enough), page-level fallback; feature-flag |
| Gemini caps/pricing squeeze audio+vision | Med | High | Provider chain + chunking (F4.2); keep originals authoritative so re-processing possible |
| LibreOffice dependency heavy on host | Med | Med | Env-flag optional service; DOCX annotates only when available, else clear guidance |
| Scope creep / perfectionism stalls gates | High | High | Gates are demo-able, not perfect; cut list per phase defined by smallest scenario contribution |
| Binusmaya ToS/brittleness if scraping | Med | High | Import-first strategy (F7.1) delivers value with zero ToS exposure |

## Sequenced milestone summary

| Milestone | Contains | Cumulative effort (rough) |
|---|---|---|
| M1 = G0 | All behavioral P0s green | ~1 week |
| M2 = G1 | Tablet ink feels like paper | ~3 weeks |
| M3 = G2+G3 | AI visible/controllable; submission loop closes | ~7 weeks |
| M4 = G4+G5 | Lecture pipeline; deterministic scheduling | ~10 weeks |
| M5 = G7+G8 (+P6 done) | Study intelligence; pocket coding; tutor click-capture | ~13 weeks |
| M6 = P9 complete | Design/a11y polish merged throughout | continuous filler |

Plan detail is deliberately deepest for Phases 0-3 (highest certainty) and lighter for 6-9; refine each phase at its start.
