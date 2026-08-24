# Status Check — commit `36c6ca0` ("implement audit action plan phases 0–6")

- **Date:** 2026-08-24 · Verified against ACTION_PLAN.md acceptance criteria
- **Method:** Source inspection + unit suites run in clean worktree + two parallel deep verification agents

## 🟢 RE-CHECK (later on 2026-08-24): blocker fixed in uncommitted working tree

New uncommitted changes landed after this report was written:

| Change | Effect |
|---|---|
| `google-sync.mjs` imports → `../../calendar-sync.mjs`, `../../ops.mjs` | **Boot blocker resolved** |
| `globals.css`: `.capture-voice{display:none}` rule removed; capture bar wraps ≤430px | **F4.4 leftover fixed** — mic visible at all widths |
| `DurableRecorder.tsx`: lazy `pickMime()` with SSR guard | Prevents `MediaRecorder undefined` crash during SSR/hydration |
| `capture/page.tsx` + `globals.css`: mobile action dock → full-width bottom bar, route animation disabled on dock pages | Mobile nav polish (fixes fixed-positioning broken by route transitions) |
| `scripts/dev.mjs`: arg passthrough to `next dev` | Dev ergonomics |

**Verified in-place:** backend 110/110 ✅, frontend 181/181 ✅, `tsc --noEmit` clean ✅.

Still open after re-check: changes are **uncommitted**; `probe-debug.mjs` is a debug artifact that shouldn't be committed. All P1/P2/P3/P5/P6 partial items and phases 7–9 unchanged (see scorecard below).

---

## 🔴 Blocker first: shipped HEAD does not boot

`server/worker/maintenance/google-sync.mjs:1-2` imports `../calendar-sync.mjs` and `../ops.mjs`, which resolve to nonexistent `server/worker/*` paths (actual files live in `server/`). Consequences:

- `npm run dev` crashes (worker exits, supervisor kills web)
- `npm test` cannot start (Playwright webServer dies)
- The whole scheduled worker loop is dead — **no reminders, OCR, transcription, or Google sync will run**

Commit message claims "121 backend + 181 frontend passing; tsc clean" — backend is actually 110/110 and frontend 181/181 **after** patching the two import specifiers (`../../calendar-sync.mjs`, `../../ops.mjs`) in a throwaway worktree. Tests were evidently run before a final edit/move broke the paths. **Two-line fix required before anything else.**

## Scorecard

### Phase 0 — Stop the bleeding: ✅ 9/9 done (after import fix)
| Item | Verdict | Evidence |
|---|---|---|
| F0.1 SW precache | ✅ | `/tasks` page now exists (`app/tasks/page.tsx`), shell precache resolves |
| F0.2 event_reminders delivered | ✅ | `modules.mjs:32-39` sweeps + marks `sent_at`; legacy sweep excludes events having rows |
| F0.3 reminder erasure on toggle | ✅ | `core.mjs:71-72` undefined-vs-null split; regression test `backend.test.js:581` passes |
| F0.4 worker in dev | ✅ | `scripts/dev.mjs` supervises web+worker, stops all on child exit |
| F0.5 offline typed captures | ✅ | `AppState.tsx:101` routes through `queueRequest`; survives reload |
| F0.6 PDF export hardening | ✅ | `pdf-export.mjs:26-27` page-count clamp; :31 charset → 422 `PDF_TEXT_ENCODING` |
| F0.7 ContextualAssistant endpoint | ✅ | posts `/api/v1/captures` |
| F0.8 Crepe image persistence | ✅ | `LiveMarkdownEditor.tsx:27` `onUpload: uploadImage` |
| F0.9 silent-failure switches | ✅ | OCR chip+retry+polling in editor; `NotificationButton` replaces dead bell |

### Phase 1 — Tablet ink: 🟡 ~60% (the two XL/hard parts deferred)
| Item | Verdict | Notes |
|---|---|---|
| F1.1 shared InkView helpers | ✅/🟡 | `lib/ink.ts` has pinch/wheel/pan/palm-rejection; fully adopted by InkEditor, overlay adopts gating only |
| F1.2 dynamic touch-action | 🟡 | pen draws / finger scrolls works; **pinch-zoom in notes absent** (`pan-x pan-y`, no applyPinch in overlay) |
| F1.3 content-anchored strokes | ❌ deferred | strokes still raw page pixels; typing above detaches ink. Shipped instead: non-first ink blocks render **in-flow** (moves with content); first block stays pixel-anchored |
| F1.4 all ink blocks + handles | 🟡 | move/delete wired; **insert handle unreachable** (`onInsertInk` prop unused by MarkdownBlock); `.find()` first-block pattern remains for overlay |
| F1.5 mode ergonomics | 🟡 | desktop opens Write, mobile remembers last-used; **pen-near auto-ink absent** |
| F1.6 PDF annotator grammar | 🟡 | palm rejection + touch-action shared; zoom still ± buttons, no gestures |

### Phase 2 — Visible AI: 🟢 mostly done (~85%)
✅ F2.1 OCR review panel (transcript/equations/confidence/edit/insert/dismiss/polling)
✅ F2.2 continue-math pipeline end-to-end w/ diff-review card — *but* reserved `"handwritten-math"` workload still unused (direct Gemini call)
✅ F2.3 structured image extraction `{text,equations,tables}`; interpreter sees pixels
✅ F2.4 camera quick-action + multi-photo single interpretation
✅ F2.5 optimize mode picker + per-op diffs + no draft flip — **only on vault-page notes; Obsidian-backed editor still has zero optimize UI**
🟡 F2.6 opt-out honored server-side **only for `source:"file"`**; typed captures always auto-enqueue
✅ F2.7 process-pending wired into inbox (+auto-run)

### Phase 3 — Submission loop: 🟢 ~85%
✅ F3.1 DOCX→PDF twin at upload (`NOEMA_DOCX_CONVERSION` flag, graceful skip, annotatable)
🟡 F3.2 eraser/color/delete/page-guard done; edit uses POST-upsert not PATCH endpoint (works, wiring differs)
✅ F3.3 export fidelity: comments drawn, stored colors, smoothed strokes, mirrored style constants (parity tested)
🟡 F3.4 note→PDF v2 partial: CJK fonts done; GFM tables render as flattened text lines; **no KaTeX math, no images, no ink embeds**
✅ F3.5 backup/export includes `note_blocks`/`note_ink_blocks`/`pdf_annotations` + sidecar import endpoint
✅ F3.6 magic-byte MIME sniffing (mismatch rejection tested)

### Phase 4 — Audio lectures: 🟢 ~80%
🟡 F4.1 DurableRecorder: pause/resume + chunked IndexedDB persistence + survives close; **recovery offers Discard-only — no finalize/recover path**
✅ F4.2 transcribe-audio job: ffmpeg chunking beats cap; Gemini→Groq Whisper→whisper.cpp chain; timestamped segments
✅ F4.3 TranscriptPanel: click-line seeks audio + summarize-to-study-note (mode `study`)
🟡 F4.4 honest `"voice"` source tagging done; **mic still hidden ≤390px** (`globals.css:759`)

### Phase 5 — Scheduling & calendar: 🟡 ~70%
✅ F5.1 dual-create prompt + symmetric linking + `scripts/eval-scheduling.mjs` (10 phrasings; skips without keys)
✅ F5.2 configurable reminder presets (Settings UI + `NOEMA_REMINDER_PRESETS`)
✅ F5.3 auto-apply (≥0.8 confidence, no clarifications, settings toggle, undoable)
✅ F5.4 real `/tasks` page: collapsible groups, checkable subtasks, quick-add
❌ F5.5 calendar parity: **no click-slot create in Month/Day, no "+N more", no multi-day spanning, undo toast tied to delete only**
✅ F5.6 monthly/weekday/interval repeats, timezone combobox, minutes-before presets
✅ F5.7 recurring task regeneration (completion spawns next instance; tested)
🔴 F5.8 Google sync automation **broken at runtime** (import paths — see blocker); tooltip still falsely claims task sync

### Phase 6 — Tutor: 🟡 ~75%
✅ F6.1 parallel compare up to 3 agents, tabbed answers, insert picked variant (409 if <2 agents)
🟡 F6.2 provenance label done (question+provider+date); **insert still EOF, no caret targeting**
🟡 F6.3 vault inserts via block API + double-insert guarded; **stale-editor refresh NOT fixed** (noop `onApply` remains; new block invisible until remount)
🟡 F6.4 quality profile for math in single mode; **parallel path hardcodes `profile:"fast"`**

## Phases 7–9: ⬜ not started
- **P7 binusmaya/study:** zero code (grep: none). Import wizard, schedule materializer, overviews, recommendations — all pending.
- **P8 coding:** no compiler/coding files touched. Multi-file runs, kill IPC, toolchain detection, mobile nav entry — all pending.
- **P9 design/a11y:** essentially untouched — `--sidebar`/`--surface`/`--code` all still `#282828`, no `/graph` page, skip-link/light-theme/z-index items pending. ModuleShell diff was notification-button refactor only.

## Bottom line

| Phase | Done | Partial | Not done |
|---|---|---|---|
| P0 | 9 | 0 | 0 |
| P1 | 1 | 4 | 1 (F1.3 deferred) |
| P2 | 5 | 2 | 0 |
| P3 | 4 | 2 | 0 |
| P4 | 2 | 2 | 0 |
| P5 | 5 | 0 | 2 (F5.5, F5.8-runtime) |
| P6 | 1 | 3 | 0 |
| P7–P9 | 0 | 0 | all |

**Immediate next actions (ordered):**
1. Fix the two import specifiers in `google-sync.mjs` (unblocks boot/tests/e2e).
2. Verify e2e suite passes post-fix; add CI gate so commits can't land without `npm test`.
3. Finish P1 leftovers (overlay pinch-zoom, insert-handle wiring) — biggest Timmy-value gap remaining in claimed phases.
4. Note→PDF KaTeX/images/ink embeds; recorder recover-path; mic visibility ≤390px.
5. Calendar F5.5 leftovers; tutor stale-refresh + caret targeting; parallel-tutor quality profile.
