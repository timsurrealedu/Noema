# Implementation Plan: Today Handwriting and Compiler Rework

## Goal

Make Today handwriting reliable and obvious, reuse lifeOS's proven infinite ink interaction, complete the handwriting intake lifecycle, and rebuild Compiler around lifeOS's Scratch/Saved workspace while preserving Noema styling and safety boundaries.

lifeOS is read-only reference material. No files there will be changed.

## Current state

### Already present

- Today opens `HandwritingCapture`.
- Quick note and folder-selected modes exist.
- Vault-backed ink, draft metadata, pending processing, OCR/intake jobs, generated Markdown above original ink, and capture Done metadata exist.
- Compiler execution, Scratch buffers, Saved-file APIs, Syncthing-backed `NOEMA_SAVED_CODE_DIR`, and path/symlink/size validation exist.

### Not complete

- Today uses Noema's separate modal `InkEditor`, not lifeOS's proven full-screen infinite InkPad workflow; the reported flow is currently unusable.
- Handwriting has no browser test covering Today → draw → save → Process Inbox → Done → open note.
- Compiler does not match lifeOS's full-screen layout, nested file tree/drawer, editing controls, output flow, or responsive behavior.
- The unit baseline is red; `capture-vault.test.js` currently exposes a worker path/config failure.

## Architecture decisions

- Port behavior, not lifeOS's global DOM architecture: adapt InkPad and Compiler interactions into focused React components using Noema APIs.
- Keep existing Noema storage and security services. Do not replace vault ink blocks, compiler isolation, or saved-file validation.
- Quick notes always enter `Drafts` and pending intake. Folder notes run AI only when Draft is checked.
- AI output remains an ordered Markdown block followed by the unchanged editable ink block.
- Capture status is the audit surface: Processing, Done, Failed, destination, action, confidence, source ink, and note link.

## Work plan

### Phase 1: Establish a working baseline

1. Reproduce the Today handwriting failure on desktop and touch-sized viewports; record the failing interaction and console/network error.
2. Fix the existing test baseline issue if it blocks the handwriting lifecycle.
3. Add a browser regression for opening Handwrite, drawing, and saving a Quick note.

Checkpoint: focused backend tests, frontend tests, and the new browser test pass.

### Phase 2: Port the proven handwriting interaction

4. Extract the applicable lifeOS `InkPad` behavior: full-screen canvas, world-coordinate pan/zoom, pen/touch handling, undo/redo, erase/clear, fit, and durable stroke return.
5. Replace the cramped form-first flow with: choose Quick note or Choose folder → configure destination/Draft → enter full-screen canvas → Done/save.
6. Preserve crash recovery and editable vector strokes through Noema's existing ink model.

Checkpoint: mouse, pen, touch, rotation, cancel/reopen, and empty-canvas behavior verified.

### Phase 3: Prove handwriting processing end to end

7. Verify Quick note saves under `Drafts`, queues only on Process Inbox, and routes to an existing inferred folder or `Captures/#needs-filing` fallback.
8. Verify folder + Draft enriches in place; folder without Draft stays untouched and queues no AI.
9. Verify generated summary/expansion renders above the unchanged source ink and clears Draft only after success.
10. Complete Capture Done/Failed detail and retry coverage, including final folder and Open note.

Checkpoint: Today → Process Inbox → Done → final note passes in browser and backend tests.

### Phase 4: Port the lifeOS Compiler workspace

11. Recompose the page into lifeOS's full-screen editor layout using Noema colors: top controls, Scratch/Saved segment, central editor, stdin, output, and responsive toolbars.
12. Add lifeOS's Saved file tree with nested folders, active file, new/save/dirty state, desktop dock, and mobile drawer/swipe behavior over existing safe file APIs.
13. Bring across useful editor behavior: line gutter, synchronized highlighting, undo/redo, auto-indent/pairs, symbol bar, caret joystick, keyboard/visual-viewport handling.
14. Retain Noema compiler execution isolation, Tutor integration, language discovery, local per-language Scratch recovery, and Syncthing-backed Saved storage.

Checkpoint: Scratch persists per language; Saved round-trips through disk; compile/run/output works on desktop and mobile.

### Phase 5: Finish

15. Run unit, browser, build, responsive, accessibility, and traversal/symlink regression checks.
16. Update `PROJECT.md` only where the verified behavior differs from its current claims.

## Risks

- lifeOS uses global DOM state; direct copying would fight React. Port its behavior and CSS structure, keeping Noema state/API contracts.
- Gesture conflicts can break pen input or page scrolling. Verify pointer capture, touch-action, pinch, and viewport changes explicitly.
- AI routing cannot safely invent folders. Restrict destinations to the current vault tree and keep the needs-filing fallback.
- Syncthing may update a saved file while open. Preserve explicit save and surface conflicts instead of overwriting silently.

## Approval gate

No implementation starts until this plan is approved.
