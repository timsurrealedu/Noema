# Noema UI/UX Audit Findings

Branch: `plan/app-vision-solve-issues` · Date: 2026-08-22
Method: dual evidence — deterministic detector (`impeccable detect.mjs` over `app/`) + five parallel design-director reviews covering all 51 TSX files and `globals.css`, applying Web Interface Guidelines, Nielsen's 10 heuristics, cognitive-load checklist, and personas (Casey = phone one-thumb, Alex = power user, Sam = screen reader/keyboard-only, Jordan = first-timer). Highest-severity claims re-verified against source before publication.

---

## Health scores (Nielsen /40 per module group)

| Module group | Score | Band |
|---|---|---|
| Shell · Today · Capture | 23/40 | Acceptable |
| Vault · Ink editors | 17/40 | Poor |
| Coding · Canvas · Automations | 19/40 | Poor |
| Calendar · Tasks · Projects | 16/40 | Poor |
| Study · Settings · Auth · Theme | 24/40 | Acceptable |

Overall ≈ **20/40 — Acceptable trending Poor**. Strong visual system, honest empty states, good failure taxonomy in Capture; undermined by touch-layer gaps, silent data-loss paths, and feedback-integrity bugs.

Detector (`detect.mjs`): **6 findings, all `globals.css`** — 5× layout-property transitions (max-width :119, max-height :438), 1× decorative grid-line background (:147).

---

## P0 — Blocking (fix first)

1. **Calendar is view-only on every touch device.** `app/calendar/page.tsx:137` (`beginSlot`) and `:141` (`moveItem`) both early-return on `matchMedia("(pointer: coarse)")`. No drag-to-create, no move/reschedule by touch or any tap alternative. The stated phone job ("check schedule + quick edits") is impossible.
2. **Events cannot be deleted.** The event editor (`app/calendar/page.tsx:561-680`) has Save/Cancel only; no delete control exists anywhere in the module.
3. **Agenda view lies about its date.** Header renders `activeSelectedDate` but the list filters `realToday` (`calendar/page.tsx:254` vs `:364`). Pick tomorrow → today's schedule under tomorrow's heading.
4. **Capture review queue is keyboard/SR-impassable.** Rows are `<article onClick>` (`app/capture/page.tsx:775`): no tabIndex, no role, no keydown. Keyboard users can act only on whichever row sorts first (`selected = … ?? visible[0]`, :246) — possibly the wrong item. Core loop cannot complete keyboard-only.
5. **False failure alerts on success.** `ServiceNotice.tsx:7-19` text-matches button labels (`confirm all`, `save changes`, `delete`…) and unconditionally shows "Not connected yet — saved only in this browser" even when the API call succeeded. Trains users to ignore all errors, including real ones.
6. **Silent data-loss cluster in the mixed note editor.** Blur-only saves (`MixedNoteEditor.tsx:78`), mode-switch unmount without blur, content-only edits never calling save (`vault/page.tsx:174-176`), `load()` overwriting dirty local state (:68-70), and Milkdown ignoring prop updates (`LiveMarkdownEditor.tsx:16-68`). Previewing a note or adding an ink block can discard written text invisibly. Existential for an Obsidian replacement.
7. **Ink undo destroys work instead of restoring it.** `undo()` = remove-last-stroke (`InkEditor.tsx:457-461`), so eraser/clear/scale/rotate/delete-selection are unrecoverable; MixedNoteEditor's per-pointermove onChange floods its stack. Stylus-first users lose hand-drawn figures permanently.
8. **Orphaned modules.** Nav (`ModuleShell.tsx:18-21`) links only Home/Capture/Vault/Calendar/Coding. **Study, Plugins, Collaboration (+Projects/Automations/Dashboards) have zero inbound links** — reachable only by typing URLs. The flagship Study module is invisible.
9. **Compiler can lose unsaved code silently.** Buffer switches (`compiler/page.tsx:743` selectMode, `:706` openFile, `:899` new file) don't guard when dirty; computed `isDirty` (:789) never rendered; no `beforeunload`; runs unstoppable (`run()` :758, no AbortController/Stop). One `while(1)` locks the editor until server timeout.
10. **Cross-module timezone chaos.** Today page pins Asia/Jakarta (`page.tsx:25-32,245,254`), capture uses device-local elsewhere (`capture/page.tsx:48,79`), calendar requires hand-typed free-text IANA tz (`calendar/page.tsx:650-657`) that is stored but never used for display. Wrong dates for anyone outside Jakarta; two timezones render side-by-side in one inspector.

## P1 — Major

**Touch & gesture layer**
- Capture swipe handlers don't stopPropagation vs parent pane swipe-filter switching (`capture/page.tsx:740-766` vs `308-338`) — one gesture can confirm AND change filter; no rubber-band clamp; missing `touch-action: pan-y`.
- Phones cannot create a capture from the Capture page at all: dead dock div + CSS-hidden primary button (`capture/page.tsx:690` + `globals.css:724`).
- Mixed-editor ink overlay: full-page `touch-action:none`, accepts finger input with no pen gating (`MixedNoteEditor.tsx:136-186`) — palms draw strokes, tablets can't scroll while ink mode is on. Standalone InkEditor's pen-gating (`acceptInkPointer`, :207-302) is the model to port.
- Calendar resize pointer-only via non-focusable `role="separator"` (:143); all-day↔timed conversion HTML5-DnD mouse-only (:144-146); keyMove persists per keypress with recurring scope modal popping each press (:142); no ghost preview while dragging (:138).
- Ink toolbar buttons forced to 32px ≤600px (`globals.css:521-524`) defeating the 44px rule; compiler symbol-row buttons focusable-but-dead (`SymbolButton` :187 has onPointerDown only).

**Data integrity & trust**
- Home task-edit effect keyed on `[tasks]` overwrites in-progress edits on any task mutation; `?open=new` resurrects blank forms (`page.tsx:70-74`).
- Unsent quick-capture text lost on navigation (`page.tsx:174`).
- Failed capture apply fabricates 09:00 events rather than failing honestly (`AppState.tsx:110-113`).
- Fabricated progress: hardcoded 8%/28% bars presented as real (`capture/page.tsx:155,477-479`).
- Capture "Undo" restores status but leaves phantom created objects (`capture/page.tsx:833-859`).
- Home "Dismiss review" ✕ permanently dismisses the capture while reading as close-panel, no undo on Home (`page.tsx:182`).
- Calendar reschedule saves instantly with no undo/confirm; mis-drag permanent (undo toast CSS already exists: `globals.css:41`).
- Study "Capture lecture" upload stub silently discards selected files (`study/page.tsx:31`).

**Accessibility**
- Settings unnamed controls: Toggle bare checkbox (:57), selects/retention input unlabeled (:48,:51,:53); password placeholder-only labels (:50).
- Week-day headers `<strong onClick>` + hidden double-click-to-Day-view (`calendar/page.tsx:431`); month cells nest interactive `<small onClick>` inside `<button>` (:518-528); popover task rows div onClick (:750); sync banner without aria-live (:344-354).
- Notifications: read/unread visually identical; retry/resolve targets far below 44px inside `<small>` lines; raw jargon ("permanent-failure", "(502)") (`notifications/page.tsx:14-15`).
- Vault: unlabeled ink overlay SVG in mixed notes; recent-note cards mouse-only (`VaultOrganizer.tsx:329`); tutor restore mouse-only (`TutorPanel.tsx:21`); dead Ask-Tutor handler (`MarkdownContent.tsx:140`); tag-pill filter reads state but never applies it (`vault/page.tsx:28`).
- OCR status surfaces raw enums ("complete"/"unavailable"), "OCR queued" shown even when no provider configured, no retry in place (`InkEditor.tsx:810,497`).
- Compiler: run completion never announced; fake tablist semantics; `.code-body` textarea `outline:none` under overlay = invisible focus (`globals.css:296`).

**IA / flows**
- Light-theme FOUC on every load (theme applied post-hydration in effects: `ModuleShell.tsx:37-39`, `page.tsx:56-58`); `theme-color` meta hardcoded dark (`layout.tsx:15`).
- Login `minLength={12}` on current-password can lock out legacy accounts (`login/page.tsx:16`); join form lacks autocomplete attrs and double-submit guard (`join/page.tsx`).
- MFA enrollment: secret/recovery codes shown once, no copy/download affordance (`settings/page.tsx:52`).
- Help is a 3-link stub absent from nav; cannot answer "how do I capture a lecture?" (`help/page.tsx`).
- Projects: blockers unresolvable, milestone not editable, linked objects non-navigable, entire component minified onto one line (`projects/page.tsx:11`).
- Multi-day events render only on start day; legacy Month-view fallback hides events except today (`calendar/page.tsx:239-240,493`).

## P2/P3 — Notable (condensed)

- `transition:all` ×13 in globals.css (50,72,103,105×2,119,130,278,373,374,438×2!,791!,799!) + layout transitions on max-width/max-height; dead duplicate reduced-motion block :108/:109; three conflicting scrollbar systems; z-index scale spans 29 values (1…999999).
- **137 hardcoded hex literals** outside tokens (compiler island :218-353, terminal/pre #10151d still dark in light mode :196,:200, white-canvas walls force `#fff !important` even in dark mode :488-553) — a token-only gruvbox reskin would miss all of these.
- Light-mode AA failures: `--warning` on white = 2.04:1; syntax string amber #d97706 ≈3.1:1; status badges ≈2.2:1. Dark theme passes throughout (muted ≥5.4:1).
- ⌘K hint hardcoded on Windows/Linux; palettes lack arrow-key navigation; Home palette search input has no onChange (types nothing).
- No URL state for calendar view/date, capture filters/search, vault folder/tag selection — refresh/back loses context everywhere except `?open=`.
- `autoFocus` mobile anti-patterns: task name (Home), dashboards create, folder modal (HandwritingCapture), event title.
- Full-page navigations inside SPA: `<a href="/#capture">` (capture:341), `location.assign`/`location.reload()` after conflict resolve, project create, optimize-apply.
- Env-var names leaked to end users ("Set NOEMA_GOOGLE_CLIENT_ID…", "add Gemini key") and vendor jargon in errors ("Gemini rate limit").
- Time columns lack `datetime` attrs and `tabular-nums`; `hour12:false` hardcoded against locale (calendar:52).
- No bulk actions on review queue; no virtualization on long lists (>50 guideline); no `+N more` overflow in month cells.
- Missing `global-error.tsx`; error.tsx renders outside shell so recovery lacks nav context.

## Cross-cutting systemic themes

1. **The touch layer was designed for desktop then partially patched.** Coarse-pointer bails (calendar), gesture collisions (capture swipe), full-page touch-action:none (ink overlay), pointer-only custom controls (symbol row, resize handle). Recommendation: one Pointer Events + `setPointerCapture` pattern library, `touch-action` scoping rules, and a coarse-pointer regression checklist per surface.
2. **Feedback integrity is the biggest brand risk.** Fake %, fabricated fallback events, false failure notices, undo that doesn't undo, agenda showing the wrong day. Every instance teaches the user to distrust the calm surface.
3. **Two shells, two of everything.** Home vs ModuleShell duplicate theme init, palettes (one broken), notifications (one stubbed), collapse patterns. Consolidate before adding features.
4. **Token discipline blocks the planned gruvbox/analog reskin.** Fix tokens + hex islands FIRST (P1 above), then the reskin becomes a pure variable remap.
5. **Custom controls consistently skip ARIA wiring** while native elements (dialog, time, skip-link, focus-visible system) are done well. Rule of thumb going forward: if it's interactive, it's a `<button>` with a name.

## Verified strengths (preserve these)

- Capture failure panel: error taxonomy, human subtitle + technical disclosure, Retry/Switch-provider recovery (`capture/page.tsx:486-551`).
- Offline architecture: idempotency keys, Web Locks replay, conflict/pending/failed triage, BroadcastChannel sync (`offlineQueue.ts`).
- Standalone ink palm rejection: pen-priority gating, post-pen-up touch guard, coalesced events, rAF batching (`InkEditor.tsx:207-302`).
- Language-aware mobile code keyboards with caret joystick — genuine invention, not a desktop port (`compiler/page.tsx:63-283`).
- Plugins page honesty benchmark: inspect-before-install, SHA-256 manifests, concrete unblock empty states.
- Typography discipline: true `…`, curly quotes, text-wrap balance throughout; Activity page is the only module doing `<time datetime>` correctly — copy it everywhere.

---

## Recommended fix order

1. **Trust batch (fast, high yield):** ServiceNotice deletion of label-matching branch; honest progress/failure states; agenda filter fix; remove fabricated apply fallback; capture undo consistency.
2. **Data-loss batch:** mixed-editor autosave + flush-on-unmount + version-aware save queue; ink command-stack undo; compiler dirty guards + Stop button; Home effect scoping; draft persistence for quick-capture.
3. **Touch batch:** calendar pointer-event unification + delete + undo-toast reuse; capture FAB restore + swipe isolation; ink overlay pen gating; 44px sweep.
4. **Access batch:** capture rows as buttons; settings labels; calendar headers/popovers; notifications unread treatment; keyboard palette navigation.
5. **Foundation batch:** token hoisting (code/terminal/canvas islands) + light-theme semantic overrides → unlocks gruvbox reskin; single shell consolidation; nav completion (Study et al.); URL-state pass; timezone normalization (device zone, UTC storage).
