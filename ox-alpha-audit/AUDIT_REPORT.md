# Noema × Timmy — Gap & Weakness Audit

- **Date:** 2026-08-23
- **Audited commit:** `ee9f0f8` (feat(notes): export presentation PDFs)
- **Method:** Parallel deep-dive agents over editor/annotation, PDF/docx import-export, capture/AI pipeline, calendar/tasks/reminders, tutor/study/coding modules; all load-bearing claims spot-checked against source at HEAD.

## Verdict

Noema's architecture is genuinely close to Timmy's vision (mixed ink+markdown blocks, capture→AI→review pipeline, real web-push reminders, bwrap-sandboxed C runner, two-way Google sync). But the **last mile is broken in almost every flow he'd use daily**, several flagship features are dead code, and his biggest asks (binusmaya, audio lectures, math continuation) don't exist yet.

---

## 🔴 P0 — Broken today (breaks daily use)

| # | Issue | Evidence |
|---|---|---|
| 1 | **Service worker install fails → offline PWA shell broken.** `sw.js` precaches `/tasks`, which 404s (verified live). `cache.addAll` rejects on any failure | `public/sw.js:2` |
| 2 | **Capture-created reminders are written but never fire.** Linked events get `event_reminders` rows [30/10/0 min] but `deliverDueReminders` only reads `events.reminder_at` / `tasks.reminder_at`; linked events get `reminder_at = NULL`, capture tasks force `reminderAt: null`. Dead data in DB | `server/core.mjs:196-197`, `server/modules.mjs:33-35` |
| 3 | **Toggling a task erases its reminder** (serialized null defeats auto-reminder) | `app/components/AppState.tsx:120` + `core.mjs:36` |
| 4 | **Images inserted via the mixed editor's toolbar don't persist** — Milkdown Crepe has no `onUpload` configured; falls back to blob URLs that die on reload | `app/components/LiveMarkdownEditor.tsx:20-37` |
| 5 | **ContextualAssistant "Plan" button posts to `/api/v1/capture`** — route doesn't exist (`/api/v1/captures`). Always fails | `app/components/ContextualAssistant.tsx:100` |
| 6 | **Offline typed captures are lost**: composer calls `api()` directly instead of the offline queue; next `/state` merge wipes them | `AppState.tsx:97,60` |
| 7 | **Worker is a separate process** — bare `npm run dev` processes no AI jobs, no reminders, no OCR. Everything appears silently stuck | `package.json` scripts vs `ops/noema-worker.service` |
| 8 | **Flattened PDF export can permanently 500** if one annotation references a page beyond page count (pdf-lib throws; guard unreachable) | `server/pdf-export.mjs:11`, `server/annotations.mjs:7` |
| 9 | **Study "Capture lecture" input silently discards files** (`onChange={()=>setWorkspace("dashboard")}`) — the exact button Timmy would press | `app/study/page.tsx:31` |
| 10 | **Tutor insert-into-note desyncs vault notes**: server appends text but the open MixedNoteEditor never reloads → stale blocks + version divergence; plain notes risk double-insertion | `app/vault/page.tsx:237,280`, `server/skills.mjs:39` |

---

## 🟠 Timmy-need gaps by feature

### Handwriting over notes (his core ask)

- **No pinch-zoom while inking in notes.** The overlay sets `touch-action:none`, ignores two-finger gestures, rejects finger input entirely (pen-only) — on a tablet in ink mode you cannot scroll or zoom. The working pinch implementation exists in `InkEditor.tsx:336-361` but is only mounted in the capture modal, never in notes.
- **Annotations detach from content**: strokes stored in raw page pixels; typing above reflows text but ink doesn't move. Stored block width/height unused. Rotation skews strokes.
- **Only the first ink block ever renders** (`blocks.find(...)`, `MixedNoteEditor.tsx:418`); mid-note ink insertion + block add/move/delete exist in code with zero UI triggers.
- Editor always opens in **Preview** — one wasted click every time (`MixedNoteEditor.tsx:352-357`).
- Ink requires a vault-connected note (409 otherwise); every block save renames the projected `.md` from its H1 (`server/vault.mjs:94,99`).

### OCR / math understanding (his linear algebra question)

- Real OCR→LaTeX pipeline exists per ink block (Gemini vision, `{text, equations:[{latex, confidence}]}`), **but results are never shown in the editor** — transcript/equations loaded, never rendered; correction UI gated behind a prop nothing passes (`InkEditor.tsx:850`).
- **Math continuation doesn't exist** — though the repo literally pre-reserved an OpenAI `"handwritten-math"` workload hook (`server/ai.mjs:21`) that no caller uses. All primitives (ordered blocks + transcripts + stroke rasterizer + diff-review pattern) are ready; it's a missing worker handler + route.
- Answering Timmy directly: today AI would *not* see mid-note partial formulas across blocks; continuation would land as **LaTeX markdown block** (KaTeX renders it), not annotation — and strokes stay authoritative either way. Tables are invisible to both OCR schemas (`handwriting-ocr.mjs`, `extract.mjs`).

### Import/export (submission workflow)

- **DOCX cannot be annotated** — hard MIME gate on `application/pdf`; no docx→pdf converter anywhere (admitted open in `ISSUE_RESOLUTION_PLAN.md`). `server/annotations.mjs:7`.
- Note import is markdown-text-only; posting a .docx/.pdf yields mojibake. Import UI helper is dead code (no file input renders it). `app/vault/page.tsx:201`.
- Note→PDF export is a naive plain-text dump: no images, math, tables, or styling; code fences printed literally; ink blocks surface as raw `![[...]]` markers. Not submission-worthy. `server/note-pdf.mjs:10`.
- Annotator workspace: 3 tools (highlight rect/freehand/text), no eraser, no edit/delete UI despite APIs existing, no pinch-zoom, no palm rejection, color field never settable (always yellow).
- Workspace tar backup drops `pdf_annotations` + note ink blocks entirely (`server/ops.mjs:20`).

### Lazy capture → AI notes

- Flow is solid (interpret→preview→apply, transactional, reversible) **but there is no opt-out before AI runs**; keep-as-is only after the fact.
- Optimize-note supports modes `light|organize|study|technical|voice` server-side, UI hardcodes "organize" — and **vault/Obsidian notes get no optimize affordance at all**, so his actual notes can't be expanded from lazy bullets. `app/vault/page.tsx:203,214-240`.
- Photo-of-whiteboard extraction prompt is plain-text-only ("Extract all visible text") — no LaTeX, no structure, no confidence; the good math extractor (`extractHandwriting`) is quarantined in a Study toy that writes nowhere.
- No camera button (`capture="environment"`) anywhere; multi-photo batching absent.
- Handwriting intake enrichment pipeline has **no UI trigger** (`process-pending` fetched by nothing in `app/`) — pending handwriting captures sit forever.

### Audio lectures

- Minimal recorder exists (Home bar only): single in-memory blob, no pause/resume/chunking, **navigating away discards the recording**; hidden on ≤390px phones. `app/page.tsx:71,112-115`.
- Transcription: Gemini-only, **10 MB cap** vs 50 MB upload cap — a real lecture exceeds it and *silently* degrades to filename-only interpretation. No timestamps, no replay-in-notes, no dedicated transcribe job, fails closed without GEMINI_API_KEY. `source:"voice"` enum is dead code. `server/extract.mjs:9-10`.

### Tutor

- Multi-AI is a **fallback chain, not side-by-side answers** — Timmy can't ask N models and pick what clicked. Tutor always uses the "fast" profile even when math-detected. `server/skills.mjs:30-37`.
- Explanations persist durably (good), but insert appends raw text with no provenance (which model/question made it click), appends at end-of-file, and hits P0 bug #10.

### Calendar / tasks

- Week view is legitimately good (drag-create/move/resize, overlap lanes, now-indicator, recurrence scope dialog). But:
  - **No click-a-slot create** (drag only); Month view read-mostly (≤2 items/cell, no "+N more", legacy events render on-today bug); Day view zero interaction.
  - Repeat presets Daily/Weekly only; timezone free-text; one absolute reminder field (no "N minutes before" presets).
  - Multi-day events render start-day only (`calendar/page.tsx:255`).
- **No `/tasks` page** (and SW precache expects one — P0 #1). Subtasks are textarea strings, not checkboxes. Recurring tasks store a string but never regenerate.
- Google sync is manual-click only (no worker loop, no push channels); tooltip claims tasks sync but payload maps events only. `server/calendar-sync.mjs:69-95`.
- Dual event+task creation from "meeting tomorrow 1pm" is **LLM-nondeterministic**: prompt never asks for both; event.create path skips task creation; only task.create+dueAt gets the (undelivered) linked event. `interpret-capture.mjs:10-17,56`.

### Binusmaya / study

- **Nothing exists.** Zero binusmaya code; courses manual-entry only; assignments have sync-ready `source/external_id` columns that nothing populates; no UI to even create assignments/cards/quizzes; recommendation engine throws outside project context; nothing flows study data into calendar/tasks/reminders; no session/semester overview skill. This is his largest fully-missing pillar.

### Coding

- C works (gcc + bwrap sandbox) with excellent mobile ergonomics (symbol keyboards, caret joystick, stdin sheet, AI bar, stop/dirty-guards). Gaps:
  - **Single-file runs only** (saved files never staged — multi-file C assignments fail). `compiler.mjs:98-107`.
  - Stop is client-abort only (server process runs to timeout).
  - Languages list doesn't check toolchain presence (`compiler.mjs:86`).
  - Coding hidden from mobile nav/More menu — palette-only access (`ModuleShell.tsx:22-26,80`).
  - No file download/export button.

---

## 🟡 Behavioral/UX patterns worth fixing as a class

1. **Dead-code syndrome** — at least 8 built-but-unreachable features (ink block insertion UI, transcript correction, optimize study-mode, voice source, link captures, annotation PATCH/DELETE, JSON sidecar import, process-pending trigger). Each was designed for Timmy and then orphaned.
2. **Silent failure everywhere** — OCR jobs invisible, audio >10MB quietly skipped, reminders not delivered with no error surface, Home bell stub (`data-unavailable`) while notifications exist elsewhere, offline typed captures vanish.
3. **Two interaction grammars** — standalone InkEditor (pinch, pan, finger-friendly) vs note overlay (pen-only, frozen viewport) vs PDF annotator (no palm rejection, no pinch). Same user, three muscle memories.
4. **Docs contradict code** — README promises and `ISSUE_RESOLUTION_PLAN.md` claims ("no audio path") go stale within days; trust boundary between plan docs and reality is eroding.

---

## Suggested priority order

1. Fix P0 #1/#2/#7 (SW shell, deliver `event_reminders`, dev-all script) — cheap, unblocks the whole reminder/capture story.
2. Port `InkEditor`'s pinch/pan/finger handling into the mixed-editor overlay + content-anchored ink (anchor by nearest-block offset, rescale via stored width/height).
3. Wire Crepe `onUpload` to the assets API; surface ink OCR transcripts/equations inline with accept-edit-reject.
4. Ship math continuation handler using the reserved `handwritten-math` hook (all plumbing exists).
5. Audio: chunked recorder + raise/remove multimodal cap (or Groq Whisper chain) + transcript block kind.
6. Docx→PDF conversion (LibreOffice headless) to unlock annotate-import-export submission loop.
7. Vault-note optimize UI with mode picker (expose existing `study` mode).
8. Deterministic dual event+task creation + configurable reminder offsets.
9. Binusmaya: start pragmatic — manual CSV/JSON import into existing `assignments.source/external_id` schema first, scrape later; then a course-summary worker job feeding calendar/tasks.
10. Tutor: parallel multi-provider answers + provenance-labeled insert + fix vault-note refresh.
