# UI fix batches — execution handoff (data-loss + touch)

Branch: `plan/app-vision-solve-issues` · Audience: implementing agent with no prior context.
Read first: `UI_AUDIT_FINDINGS.md` (full evidence, file:line) and `ISSUE_RESOLUTION_PLAN.md`.

## Already done (do not redo)

- `532d869` audit doc · `9051aa8` **trust batch**: ServiceNotice false-failure matcher removed; agenda filters by selected date + empty state; capture progress honest/indeterminate; failed apply reopens proposal (idempotency key `apply-{id}`); "Undo"→"Reopen review".
- Verification baseline after trust batch: `npm run test:unit` 137/137 · `npx tsc --noEmit` clean.

## Ground rules

1. Verify with: `npm run test:unit`, `npx tsc --noEmit`, then browser specs ONLY as filtered:
   - `npx playwright test test/browser/00-capture.spec.ts`
   - `npx playwright test test/browser/01-release.spec.ts --grep "mobile primary action docks"`
   - NEVER run unfiltered `01-release.spec.ts` (long-running, looks hung). Full suite is `npm run test:browser:all` only if asked.
2. Match repo code style (compact, minimal comments, no new deps unless listed).
3. Preserve audited strengths: standalone InkEditor palm rejection (`InkEditor.tsx:207-302`), offline queue, capture failure panel, native `<dialog>` usage.
4. Commit per task, conventional messages (`fix(vault): …`).

---

## Batch 2 — Data loss

### T1 · Mixed editor autosave + flush + versioned save queue

Files: `app/components/MixedNoteEditor.tsx` (blur-only save at :78), `app/vault/page.tsx` (:68-70 `load()` overwrites dirty local state; :174-176 content-only edits never call `saveNote`), `app/components/LiveMarkdownEditor.tsx` (:16-68 Milkdown ignores prop updates after mount).

Implement:
1. Debounced autosave (~800ms) in MixedNoteEditor for both markdown block text and title edits; keep optimistic version bump pattern already used elsewhere (`version+1`, 409 handling exists in API layer).
2. Flush pending save on unmount AND on note-switch (cleanup function in the effect that owns the draft); guard `load()` so an incoming fetch does not clobber dirty state — if dirty, either queue the fetch result or prompt.
3. `beforeunload` when dirty (vault page level).
4. One save-at-a-time per block id: serialize saves through a small promise chain keyed by block id so responses can't interleave versions.
Acceptance: type in a mixed note → navigate away without blur → content persists after reload; preview toggle does not discard text; unit tests stay green.

### T2 · Ink command-stack undo (both editors)

Files: `app/components/InkEditor.tsx` (:457-461 `undo()` removes last stroke — eraser/clear/scale/rotate/delete are unrecoverable), `app/components/MixedNoteEditor.tsx` (:169-175 per-pointermove onChange floods its history).

Implement:
1. Command stack entries `{type:"add"|"erase"|"clear"|"transform"|"delete", before:strokesSnapshot, after:strokesSnapshot}` pushed once per gesture (pointerdown→pointerup = one entry); snapshot = shallow copy of strokes array reference before mutation.
2. Cap depth ~50. Undo pops and applies `before`; redo applies `after` (add redo if trivial; undo-only acceptable minimum).
3. Wire `Ctrl/Cmd+Z` (+`Shift` for redo) via keydown on the editor container; buttons call same functions.
4. In MixedNoteEditor overlay: push one entry per completed gesture, not per pointermove.
Acceptance: draw 3 strokes → eraser stroke → clear-all → Ctrl+Z thrice restores all; unit tests green.

### T3 · Compiler dirty guards + Stop button

Files: `app/coding/compiler/page.tsx` (`selectMode` :743, `openFile` :706, new-file :899 swap buffers unguarded; `isDirty` computed :789 never rendered; `run()` :758 unstoppable).

Implement:
1. Render `isDirty` as a dot + title in `.code-subbar`.
2. When dirty, buffer switches (Scratch↔Saved open/new) confirm: reuse existing ModalDialog component, message names what is lost, buttons "Discard changes" / "Keep editing".
3. Persist Scratch-mode code to `localStorage` on every change (key includes path) and restore on mount — app kill survives.
4. Stop: create AbortController per run; replace Run with Stop while running; abort fetch client-side; UI returns to editable with "Run cancelled". Check `server/compiler.mjs` / `app/api/v1/compiler/*` for a kill endpoint — if none exists server-side, do NOT add one in this task (note it as follow-up); client abort + honest status is the deliverable.
Acceptance: dirty switch prompts; reload mid-edit keeps code; runaway run can be stopped from UI.

### T4 · Home effect scoping + quick-capture draft persistence

Files: `app/page.tsx` (:70-74 effect keyed `[tasks]` refires `?open=` handler on every task mutation — overwrites in-progress edits, resurrects blank `?open=new` form; :174 unsent capture text lost on navigation).

Implement:
1. Run the `?open` parse ONCE on mount (empty deps or `useRef` guard). Never overwrite a dirty draft; ignore `?open=new` when draft non-empty.
2. Persist unsent capture text to `sessionStorage["noema-capture-draft"]` on change; restore on mount; clear on successful send.
Acceptance: edit task while toggling another checkbox → edits survive; typed capture survives tab switch within session.

---

## Batch 3 — Touch

### T5 · Calendar touch gestures + delete + undo toast

File: `app/calendar/page.tsx`. Current blockers: `beginSlot` :137 and `moveItem` :141 early-return on `matchMedia("(pointer: coarse)")`; event editor :561-680 has Save/Cancel only (NO delete anywhere); reschedule persists instantly with no undo.

Check first: does an event DELETE endpoint exist under `app/api/v1/events/`? If yes use it; if not, soft-delete pattern used by core (`saveEvent` with active/deleted flags) — inspect `server/core.mjs saveEvent` and mirror whatever the API supports. Do NOT invent endpoints silently; if none exists add `DELETE /api/v1/events/[id]` route calling a new `core.mjs` hard-delete that respects Google-synced events (set `active:false`/`deleted_at` consistent with existing schema) + audit event.

Implement:
1. Remove coarse-pointer bails; unify on Pointer Events with `setPointerCapture()` on slot columns and event handles; CSS `touch-action:none` scoped to `.calendar-event`, resize handle, and column slots only (NOT whole grid).
2. Touch lift = long-press ~250ms (timer cancelled on move >10px) with haptic `navigator.vibrate?.(10)` where available; tap (no move) keeps current open behavior.
3. Add ghost preview while dragging (absolute-positioned clone at cursor slot height).
4. Delete button (danger styling) in event editor with confirm dialog; after delete show `.undo-toast` (CSS already exists, `globals.css:41`) with 5s window backed by the same mechanism Activity's undo uses (`/api/v1/activity` undo endpoint — verify exact path in `app/activity/page.tsx`).
5. Wrap drag-reschedule persist in the same undo-toast pattern instead of silent instant persist.
6. Week-day headers `<strong onClick>` :431 → real `<button>`s (single click selects day; keep double-click→Day view but ALSO make single-click select, hint in aria-label).
Acceptance: on phone emulation can create by drag, move by long-press-drag, delete an event, undo the delete/move; keyboard: Tab to day headers, Enter opens Day agenda.

### T6 · Capture mobile FAB + swipe isolation

Files: `app/capture/page.tsx` (:690 dead `<div className="mobile-action-dock">Quick capture</div>` display:none; swipe row handlers :740-766 don't stopPropagation vs parent pane filter-swipe :308-338), `app/globals.css` (:724 hides primary action ≤820px; `.capture-card` lacks `touch-action`).

Implement:
1. Replace dead dock div with working floating action button mirroring calendar's mobile FAB (`calendar/page.tsx` bottom FAB pattern incl. safe-area inset) linking to `/#capture` via next/link.
2. Row handlers: `e.stopPropagation()` on pointerdown/pointermove of card swipes; parent pane filter-swipe must ignore gestures originating inside `.capture-card` (check `event.target.closest`).
3. Clamp `swipeOffset` to ±96px with rubber band; reveal confirm/dismiss hinterland behind card; suppress the trailing click after a swipe >threshold.
4. `touch-action: pan-y` on `.capture-card`.
Acceptance: phone emulation — FAB visible and creates capture; vertical scroll over cards works; horizontal swipe confirms without switching filter or opening detail.

### T7 · Mixed-editor ink pen gating

File: `app/components/MixedNoteEditor.tsx` (:136-186 full-page `touch-action:none` overlay accepts finger input, no pen gating). Port from `InkEditor.tsx:207-302`: `acceptInkPointer` pen-priority check, 150ms post-pen-up touch guard, pointer capture, coalesced events.
Also: default overlay to pen-only with explicit finger-mode toggle button (aria-pressed); two-finger contact passes scroll through (`touch-action:pan-y` when >1 active pointer).
Acceptance: tablet emulation — palm rest doesn't draw; two-finger scrolls page while ink mode on; finger mode toggle works and is labelled.

### T8 · 44px sweep (P2 polish)

`globals.css`: clear-search ✕ 24×24 (:77 area) → ≥44 hit target via padding/pseudo-element; filter tabs 36px (:50) and `.capture-filters` added to the coarse-pointer 44px override list (:715 pattern); ink toolbar 32px ≤600px (:521-524) → 44px. No visual redesign — spacing/hit-area only.
Acceptance: axe/browser pass shows no sub-44 interactive targets on capture pages at 375px width.

---

## Completed

- `cb52f17` **T1 mixed-editor persistence:** 800ms markdown/title autosave; one save chain per block; flush-on-leave; external editor updates apply safely; dirty-page warning. `test:frontend` and `tsc` pass. Full backend/browser gates remain environment-blocked here (sandbox denies child-process `zip`/`git` and Bubblewrap; the configured AI fixture also returns invalid structured output).
- `3ec1443` **T2 ink command-stack undo:** InkEditor snapshot-based command stack (add/erase/clear/transform/delete), gesture-batched entries, Ctrl/Cmd+Z/Y keyboard shortcuts, redo via cmdRedoStack. MixedNoteEditor overlay onChange only on pointerUp, pushUndo flag prevents double-push on undo/redo. 138/138 tests, tsc clean.
- `f0fc49c` **T3 compiler dirty guards + stop:** AbortController for run cancellation, Run→Stop button, dirty indicator dot in subbar, confirm on selectMode/openFile/new-file switches, beforeunload warning. 138/138 tests, tsc clean.
- `ec330b2` **T4 home effect scoping + capture draft:** ?open= parse runs once via openTargetRef guard; ?open=new guards dirty draft; task id waits for tasks to load. Unsent capture text persisted to sessionStorage. 138/138 tests, tsc clean.
- `fd71e5d` **T5 calendar touch gestures + delete + undo:** Removed coarse-pointer bails from beginSlot/moveItem, setPointerCapture, long-press (250ms) for touch drag, touch-action:pan-y on columns. Delete button in event editor with undo toast (re-creates via POST). Week-day headers as <button>s. 138/138 tests, tsc clean.
- `3b37b4f` **T6 capture mobile FAB + swipe isolation:** Dead dock replaced with working Link to /#capture. e.stopPropagation on card swipes, parent filter-swipe ignores .capture-card gestures. Swipe clamped ±96px with rubber band. touch-action:pan-y on cards. 138/138 tests, tsc clean.
- `694d229` **T7 mixed-editor ink pen gating:** Ported acceptInkPointer pen-priority logic from InkEditor to IntegratedOverlayCanvas. Touch rejected when pen recently active (150ms guard). Two-finger passes through for scroll. 138/138 tests, tsc clean.
- `8b74194` **T8 44px sweep:** .clear-search-btn ::after pseudo-element extending hit area; .capture-filters buttons min-height:44px on pointer:coarse; ink toolbar buttons at ≤600px bumped to 44px. 138/138 tests, tsc clean.

---

## Final gate

1. `npm run test:unit` (≥137 pass, 0 fail) · `npx tsc --noEmit` clean
2. Filtered playwright specs above green
3. Update `PROJECT.md` feature notes if behavior changed visibly; append summary to this file under "Completed" with commit hashes
