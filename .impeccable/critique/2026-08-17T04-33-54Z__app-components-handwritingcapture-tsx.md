---
target: ink icon behavior
total_score: 25
max_score: 40
na_heuristics:
p0_count: 1
p1_count: 3
timestamp: 2026-08-17T04-33-54Z
slug: app-components-handwritingcapture-tsx
---
## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of system status | 3 | Save status is clear; hidden local draft is not. |
| 2 | Match system / real world | 2 | Pen icon opens a destination-choice flow before writing. |
| 3 | User control and freedom | 3 | Undo/redo exist; cancel/discard semantics are opaque. |
| 4 | Consistency and standards | 3 | Strong component consistency; touch behavior contradicts mobile expectations. |
| 5 | Error prevention | 3 | Empty saves are blocked; Clear and exit need stronger safeguards. |
| 6 | Recognition rather than recall | 2 | Gestures and silent draft restoration require recall. |
| 7 | Flexibility and efficiency | 3 | Quick and filed paths exist, but quick capture still has a gate. |
| 8 | Aesthetic and minimalist design | 2 | Canvas toolbar exposes too many tools for quick capture. |
| 9 | Error recovery | 3 | Retryable errors and durable drafts are good. |
| 10 | Help and documentation | 1 | No finger/stylus or gesture guidance. |
| **Total** | | **25/40** | **Needs focused redesign** |

## Design Specificity Verdict

The ink workflow has strong Noema-specific foundations: local-first draft recovery, explicit source placement, editable source ink, and reviewable AI processing. Its entry flow and toolbar still resemble a general drawing application rather than a capture-first Noema surface.

The detector reported two global CSS findings (`layout-transition` at line 58 and `codex-grid-background` at line 87), neither tied to the ink workflow. Browser inspection was unavailable because localhost:3000 returned connection refused.

## Overall Impression

The backend safety model is better than the interaction model. Saving is resilient and deliberate, but getting to the first stroke asks too much, and phone touch behavior currently violates the implied promise of the always-visible ink icon.

## What's Working

- Quick capture and deliberate folder placement support different intents.
- Strokes persist locally through edits and failed saves, then clean up after success.
- Done is disabled until content exists; server errors remain visible and retryable.

## Priority Issues

- **P0 — Finger drawing does not work:** touch input is reserved for pan/pinch, so a phone user tapping the prominent ink action cannot draw with one finger. Enable one-finger ink for Pen/Highlighter/Eraser and reserve two fingers for navigation.
- **P1 — First tap interrupts capture:** users must choose Quick note, Integrated Ink & Text, or Choose folder before writing. Open a blank Drafts canvas immediately and move destination/title into progressive disclosure.
- **P1 — Draft lifecycle is invisible:** Cancel silently retains a draft and reopening silently restores it. Show “Saved on this device,” then provide Keep draft, Discard, and Continue writing.
- **P1 — Mobile toolbar is overloaded:** the quick canvas exposes drawing, shape, lasso, zoom, fullscreen, history, and clearing controls. Keep Pen, Eraser, Undo, Redo, and More visible.
- **P2 — Save completion is a dead end:** success offers only Close. Add Open note as primary, New ink note as secondary, and link processing status to Capture review.

## Persona Red Flags

- **On-the-go phone user:** taps ink expecting immediate finger writing, gets a choice screen, then cannot draw with a finger.
- **Stylus power user:** gets capable tools, but the wrapped toolbar and unclear gesture model reduce canvas space and speed.
- **Returning user:** cannot tell whether Cancel discarded work or preserved it, and may be surprised by a silently restored draft.

## Minor Observations

- “Drafts” and “Drafts Vault” should use one destination label.
- The full-screen canvas should trap focus and restore it to the ink trigger on close.
- Clear Canvas needs confirmation or a prominent Undo acknowledgement.

## Questions to Consider

- Should tapping ink mean “start writing now,” with filing deferred until save?
- Is finger drawing a required baseline, or is this intentionally stylus-only?
- Should the quick ink canvas be a capture tool or a full drawing editor?
