# Noema Issue Resolution Plan

Branch: `plan/app-vision-solve-issues` · Status: Proposed
Purpose: map every issue from the product vision (annotation, lazy notes, AI tutor, math handling, calendar/tasks, coding, free AI, retro-gruvbox UI) to the current codebase, then close each gap in a testable order.

---

## Part 1 — Where Noema already stands

Noema is not a greenfield idea: most of the vision is implemented as a Next.js PWA + Node backend (`server/*.mjs`) with SQLite, durable jobs, an isolated worker, and audit/undo on every mutation.

| Vision item | State today | Evidence |
|---|---|---|
| Obsidian-style typed notes | Done (beta) | Vault two-way markdown sync, blocks, wikilinks/backlinks/tags, FTS, graph (`server/vault.mjs`, `app/vault/page.tsx`, `server/knowledge-graph.mjs`) |
| Handwriting / ink | Done for capture & note ink | `InkEditor.tsx`, `HandwritingCapture.tsx`, stroke JSON + SVG sidecars in vault (`note_ink_blocks`, `strokesToSvg`, `ink-raster.mjs`) |
| Handwritten math → text/LaTeX | Done per ink block | Gemini vision OCR → transcript + LaTeX with confidence; user-correctable (`handwriting-ocr.mjs`, `/api/v1/ink/[id]/transcript`) |
| Lazy note → full AI note | Done | Handwriting intake pipeline rewrites a Draft into organized Markdown above preserved ink (`handwriting-intake.mjs`); photo extraction (`extract.mjs`); draft optimization job (`optimize-note.mjs`) |
| Photo of whiteboard/PPT → note | Mostly done | Image extraction returns text + equations (`extract.mjs`); interpretation proposals create notes (`interpret-capture.mjs`) |
| Quick capture → event + task + reminders | Mostly done | Proposals `event.create` / `task.create` with review queue; auto-reminder policy 60/30/5/0 min (`core.mjs computeAutoReminder`); events support multiple offset reminders (`event_reminders`) |
| Calendar like Google Calendar | Partial | Day/week/agenda views exist incl. recent mobile fixes; Google two-way sync experimental (`calendar-sync.mjs`) |
| Checkbox task list | Done | Tasks module + vault checkbox sync/writeback both directions (`vault-task-writeback.mjs`, `vault.mjs syncTasks`) |
| C compiler on the go | Done (Linux host) | Isolated runner C/Python/JS with stdin/stdout, saved snippets dir, repo IDE (`compiler.mjs`, `coding/compiler/page.tsx`, `repositories.mjs`) |
| AI Tutor + "add to note" | Done (prototype+) | Sessions bound to note/canvas/code subject; one-click insert tracked once (`skills.mjs insertTutorMessage`); citations restricted to real related notes |
| Free AI option | Done by default | Provider chains with OpenRouter **free pool** fallback when only `OPENROUTER_API_KEY` is set; Groq/Gemini free tiers; math routes to reasoning models (`config.mjs`, `ai.mjs`, README) |
| Annotate ON TOP of external files | Server model only | `pdf_annotations` table + API (highlight/ink/text per page, normalized geometry, link to notes/courses) — **no frontend PDF viewer yet**, export is JSON-only |
| Export annotated file for submission | Missing | Only `exportAnnotations` JSON; no flattened PDF/PNG deliverable |
| DOCX import | Missing | Not referenced anywhere server-side |
| Lecture audio record → transcribe → note | Missing | No audio/MediaRecorder/transcription path exists |
| Ask several AIs side-by-side | Missing | One provider chain per request; no compare view |
| "What made it click" memory | Missing | PRD defines *personal understanding blocks*; not implemented |
| AI continues half-finished handwritten math | Missing | OCR is per-block only; no note-level continuation action |
| Retro gruvbox theme + analog motion | Missing | Current palette is teal oklch dark/light (`globals.css :root`) |

---

## Part 2 — Issue-by-issue resolution

### I1. "Obsidian simplicity but I can annotate directly"
**Have:** block-based notes where an ink block sits beside markdown blocks; `MixedNoteEditor` already hosts an integrated overlay canvas.
**Do:**
1. Promote the overlay canvas to first-class *margin annotation*: any markdown block gets a lasso/"annotate here" affordance that creates an ink block anchored to it.
2. Add tablet-first ergonomics to `InkEditor`: palm rejection tuning, pressure profiles, lasso-select-and-move, shape snap (already has rect/ellipse/arrow tools).
3. Keep strokes authoritative everywhere (already true) so annotation never mutates typed content.

### I2. "Export annotated file if lecturer asks for submission" — GAP A
**Have:** annotations + ink stored as data; PNG rasterizer for strokes; SVG export.
**Build (new `server/export-flat.mjs` + `/api/v1/export/[assetId]`):**
1. **Flattened annotated PDF**: render original PDF page + highlights/ink/text overlays into a new PDF. Use `pdf-lib` (draw ink as embedded PNG per page via existing `strokesToPng`, draw highlight rects natively) — deterministic, no AI.
2. **Annotated note export**: note blocks → single PDF or PNG stack (markdown→HTML→print CSS; ink already rasterizes). Markdown export stays the portable default; PDF is the submission artifact.
3. Name pattern `{NoteTitle}-annotated-{date}.pdf`; audit event on export.

### I3. "Lazy days: topic + points or just a photo → real note"
**Have:** this loop already works end-to-end (capture → interpret → review → note; handwriting intake; image math extraction).
**Polish only:**
1. One-tap "Make this a study note" on photos that skips free-form review by proposing directly into the active course folder (course context already flows through `worker/context.mjs`).
2. Batch photo capture (multi-page lecture) merged into ONE interpretation proposal instead of N captures.

### I4. "Import lecturer's docx/pdf and annotate on top" — GAP B
**Have:** asset store accepts files; PDF annotation model complete server-side; PDF viewer UI missing.
**Do:**
1. Build the missing **PDF annotator view** (`app/study` or vault attachment viewer): page canvas over `pdf.js` render, replaying `pdf_annotations` (kinds match: highlight/ink/text).
2. **DOCX import**: convert server-side to PDF at upload (LibreOffice headless in the worker sandbox, same isolation as compiler), keep original .docx as source-of-truth asset, annotate the derived PDF. Provenance links derived→original.
3. Link selected regions to notes/courses (already modeled via `link_type/link_id`).

### I5. "Replay what the lecturer said" — GAP C (largest net-new)
**Design (fits existing patterns exactly):**
1. **Record**: PWA `MediaRecorder` (webm/opus, chunked upload every ~30s so an hour lecture survives refresh); new `audio_recordings` table + `capture_assets` linkage; phone-in-pocket friendly big-record button on Capture.
2. **Transcribe**: worker job `transcribe-audio`. Free-first chain:
   - Local Whisper on the host if available (faster-whisper CPU is fine overnight);
   - else Groq `whisper-large-v3` (generous free tier);
   - else Gemini audio understanding (free tier).
   Same timeout/retry/dedupe machinery as other jobs.
3. **Deliver**: transcript becomes an ink-block-equivalent *transcript block* attached to the lecture note with timestamps; "Summarize into study notes" runs the existing optimize/intake pipeline; original audio always playable from the note header ("Replay").
4. Privacy: recording stays local until user presses "Process".

### I6. "I ask multiple AIs… weeks later forget what made it click" — GAPS D+E+F
**Multi-AI compare (D):** new tutor mode `compare`: run the SAME question through 2–3 configured chains in parallel (e.g. Groq 70B + Gemini + openrouter/free), show answers side-by-side, pick one → normal insert-to-note flow. Cost guard: compare allowed only on Quality profile or explicit tap.
**Click memory (E+F):**
1. New note block kind `understanding` (PRD §19.4): `> [!understanding]` callout in markdown = fully portable.
2. In tutor panel, next to Insert, add "**Remember why this clicked**": saves the chosen explanation AS an understanding block linked back to the tutor session + topic tags.
3. Future tutor prompts inject prior understanding blocks for the same course/topic ("remind Tim in his own words") — retrieval already exists via related-notes context.

### I7. Calendar + tasks
**Have:** everything structural. **Close the feel gap:**
1. Week grid drag-to-create/drag-to-move (desktop pointer, mobile long-press) — the main missing "Google Calendar intuition".
2. Default reminder set for captured events: **60 and 30 minutes before** (events already support multiple offsets; make capture proposals emit both, configurable in Settings).

### I8. "Someone says meeting tomorrow 1pm" → auto event+task+reminders
**Have:** natural-language capture → validated proposals → review → apply, with reminders. This issue is essentially DONE.
**Remaining:** proposal card should show the derived reminders explicitly ("will remind 1h and 30m before") and allow editing before apply; add recurring-phrase parsing tests ("every Tuesday", "next week").

### I9. Coding on the phone
Done (isolated C/Python/JS runner + repo IDE). No work beyond keeping tests green. Optional later: share compiler output → tutor ("explain this segfault") — route already exists via skills `code-tutor`.

### I10. The math questions (detailed design in Part 3)

### I11. Free AI
Already solved architecturally. Document + harden:
1. Zero-config free tier: `OPENROUTER_API_KEY` alone ⇒ every profile falls back to `openrouter/free`.
2. Recommended free stack table goes in Settings > AI with live "which model served this run" badge (provider already recorded on tutor messages / ai_runs).
3. Cost guardrails: per-day token budget env (`NOEMA_AI_DAILY_BUDGET`), compare-mode surcharge warning.

### I12. UI direction: clean, compact, calm, warm + retro/gruvbox/analog — GAP G
Current theme is a teal oklch dark/light pair; brand personality ("calm, technical") matches the request — only the skin and motion need work.
1. **Gruvbox palette** (material origin, warm dark): bg `#282828`, bg0 `#1d2021`/`#32302f` alt, fg `#ebdbb2`, red/green/yellow/blue/purple/aqua accents (`#fb4934 #b8bb26 #fabd2f #83a598 #d3869b #8ec07c`), plus light variant (`#fbf1c7` family). Implement as `data-theme="gruvbox-dark"` / `"gruvbox-light"` by remapping the EXISTING oklch custom properties — no component changes needed since all components consume tokens.
2. Make gruvbox-dark the default; keep current themes selectable.
3. **Oldschool analog motion**: 120–180ms ease-out transitions, subtle paper-texture on editor background, typewriter-caret blink on save status, slight scanline/noise overlay optional (respect `prefers-reduced-motion`, WCAG 2.2 AA contrast checks against `#ebdbb2` on `#282828` = pass).
4. Compact density pass: 44px touch targets stay (accessibility rule), tighten paddings via one `--density` scale.

### I13. Device roles (phone read/write/code · tablet ink · desktop type)
Responsive PWA covers all three today (375px floor verified in tests). Tablet stylus work rides on I1 improvements. Native offline Android app remains tracked separately in `tasks/plan.md` — out of scope here.

---

## Part 3 — Math pipeline design (the specific questions answered)

**Q: "If I go from locked-in to lazy mid-note, will AI understand what I wrote? Will it continue it?"**
Yes, with one new action. Today OCR is per-ink-block (`handwriting-ocr.mjs`). Add a note-level job `continue-math`:

1. Context assembly (deterministic): ordered blocks of THE OPEN NOTE — markdown text + each ink block's transcript + equations + rendered PNG of the last 1–2 ink blocks (vision needs pixels, not just transcripts) + course name. This reuses `worker/context.mjs` patterns; whole vault is never sent (PRD §27.2 holds).
2. Output contract (schema-validated like all jobs):
   - `analysis`: what you wrote so far, what step you stopped at, likely next step(s)
   - `continuation`: LaTeX only
   - `confidence` + `assumptions`
3. Placement policy — **it lands as a proposed MARKDOWN block containing `$$LaTeX$$`, positioned after your ink block. Your strokes are never edited or continued-over.** Rationale: ink is the authentic record of your practice (PRD §17.6 "original strokes remain authoritative"); the AI continuation is a reviewable derivative, diffed like every other proposal (accept/edit/reject). If you want it "as annotation", you accept it and handwrite under it — both layers coexist by design.

**Q: "Tables — can I insert/draw them, will AI understand?"**
Three paths, all covered:
1. Typed: markdown tables already render/edit in notes; PRD §15 table features remain roadmap polish.
2. Drawn: extend the OCR schema (`text`, `equations[]`) with `tables[]` → markdown-table proposals; Gemini vision reads handwritten grids reliably; low-confidence cells flagged for your correction (same correction flow as `updateInkTranscript`).
3. Conversion: "turn this into a table" selection action (AI proposes markdown table; reviewable).

**Q: "How does AI know WHICH note to scan/optimize?"**
Explicit scope chain, shown to you before run (no silent guessing):
1. You invoke from an open note → that note (99% case).
2. Capture with an active course selected → latest draft note in that course.
3. Ambiguous ("optimize my linear algebra stuff") → FTS shortlist picker, never auto-pick.
The worker context builder already scopes by course/project; we surface it as a confirmation chip ("Scanning: Linear Algebra › Lecture 4 (draft)").

---

## Part 4 — Delivery order (each phase independently shippable)

**P0 — Skin & defaults (days)**
- [ ] Gruvbox themes via token remap + default; compact density scale; reduced-motion-safe analog transitions
- [ ] Capture proposals emit dual reminders 60/30m; reminder line visible on proposal cards
- [ ] Settings > AI: free-stack guidance + served-model badge

**P1 — Submission-grade export (week)**
- [ ] Flatten annotated PDF endpoint + button in PDF annotator/note header (`pdf-lib`)
- [ ] Note → PDF export (markdown print pipeline + rasterized ink)
- [ ] Browser tests: round-trip a 3-page annotated PDF export

**P2 — External files finish line (1–2 weeks)**
- [ ] PDF annotator UI (pdf.js + annotation replay; touch-first toolbar)
- [ ] DOCX→PDF conversion job in sandboxed worker; original kept as source asset
- [ ] Region→note linking surfaced in UI

**P3 — Audio lectures (2–3 weeks, parallelizable with P2)**
- [ ] Chunked MediaRecorder capture + `audio_recordings` storage
- [ ] `transcribe-audio` job with free-provider chain (local whisper → Groq → Gemini)
- [ ] Transcript block + Replay control + "summarize into study notes"

**P4 — Math & tutor depth (2–3 weeks)**
- [ ] `continue-math` note-level job + LaTeX-proposal placement policy + review diff
- [ ] Table recognition in OCR schema + correction UI
- [ ] Tutor compare mode (multi-chain, cost-guarded)
- [ ] Understanding blocks: kind, insert action, `[!understanding]` markdown portability, retrieval into future tutor prompts

**P5 — Calendar feel (1 week)**
- [ ] Drag-to-create / drag-to-reschedule on week grid; long-press on mobile
- [ ] Conflict chip parity with GCal sync states (already modeled)

Verification bar per repo standard: unit + browser suites, build, responsive/accessibility passes, updated PROJECT.md/graphify.

---

## Part 5 — Risks / decisions to confirm

1. **DOCX fidelity**: LibreOffice conversion is ~faithful but not pixel-perfect; alternative (mammoth→HTML→PDF) loses complex layout. Recommend LibreOffice; confirm acceptable.
2. **Audio size**: hour-long opus ≈ 10–15MB; chunked upload + retention cap (e.g. auto-delete processed raw audio after N days unless pinned).
3. **Compare-mode cost**: default OFF on Fast profile.
4. **Gruvbox contrast**: aqua/yellow on dark bg passes AA; verify highlighter ink colors against paper backgrounds.
5. **Native Android plan** (`tasks/plan.md`) supersedes nothing here — web PWA remains primary until that migration matures.
