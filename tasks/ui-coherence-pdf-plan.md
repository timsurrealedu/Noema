# UI coherence + PDF delivery plan

Status: M1–M7 complete; M8 certification in progress  
Execution model: One coding agent, sequential batches, milestone-gated  
Goal: Make Noema visibly coherent and pleasant, then ship PDF annotation and export without weakening reliability, accessibility, or touch support.

## Execution status — 2026-08-22

Completed commits:

- M1: `500d2c8` through `385fb41` — Gruvbox tokens, hydration-safe theme loading, semantic surfaces, focus, texture, and restrained motion.
- M2: `940a8a9` through `31ee1e5` — static paper grain, save feedback, reading surfaces, and reduced-motion route behavior.
- M3 (partial, paused by user direction): `d9eca9d`, `805e86e` — scalable More navigation and Help workflow links. Home/ModuleShell consolidation remains unfinished.
- M4: `5b64195` — keyboard/state/time consistency, URL-backed module context, and removal of Jakarta-only rendering.
- M5: `dbc3e0a` — PDF.js annotation viewer with normalized highlight, ink, and text overlays.
- M6: `b845b34` — flattened annotated-PDF export using `pdf-lib`.
- M7: `ee9f0f8` — Markdown-preserving note presentation-PDF export.

Current verification:

- Frontend regression suite: 158 passing.
- TypeScript and production build: passing.
- Firefox Capture browser workflow: passing after narrowing the Capture row accessible label.
- M8 remains open: the mobile-primary-action Firefox spec still expects the former `.mobile-action-dock` markup on Capture. The current Capture UI uses a different mobile action structure, so either restore that compatibility contract or update the browser test to the approved current design before marking certification complete.

## Product decisions

- Gruvbox dark is the default; Gruvbox light is the only alternate theme.
- Remove the teal themes and their maintenance paths.
- Visual direction: warm retro technical character, subtle paper texture, restrained analog motion.
- `prefers-reduced-motion` disables non-essential texture motion and transitions.
- Complete the existing app's visual/interaction foundation before adding PDF UI.
- PDF order: imported PDF annotation + flattened export, then Noema note-to-PDF export.
- Existing ink strokes and source documents remain authoritative and unmodified.

## Scope

Included:

1. Theme/token foundation and reliable pre-hydration theme loading.
2. Shared shell, complete navigation, responsive information architecture.
3. Accessibility repairs from `UI_AUDIT_FINDINGS.md`.
4. Consistent URL state and timezone behavior.
5. Imported PDF viewer and highlight/ink/text annotations.
6. Flattened annotated-PDF export.
7. Noema note export containing markdown and ink.
8. Browser, responsive, accessibility, and regression certification.

Excluded until this plan completes:

- DOCX conversion.
- Lecture recording/transcription.
- Multi-AI comparison and understanding blocks.
- Note-level math continuation and handwritten-table recognition.
- Native Android migration.
- Broad backend or data-model refactors unrelated to these deliverables.

## Working rules

- One batch at a time; do not begin the next batch until its gate passes.
- Prefer existing components, tokens, APIs, annotation schema, and audit mechanisms.
- Add dependencies only where explicitly approved below: `pdfjs-dist` for rendering and `pdf-lib` for deterministic flattening.
- Keep each commit independently reviewable and conventional.
- Preserve offline queue behavior, capture failure honesty, native dialogs, undo/audit semantics, and ink palm rejection.
- Every non-trivial behavior change gets a focused regression test.

## Milestone 0 — Establish a trustworthy baseline

Estimate: 1–2 focused days.

Tasks:

- Diagnose the current backend unit-test process failures; distinguish environment restrictions from real regressions.
- Record the passing baseline for frontend tests and TypeScript.
- Run the existing filtered browser checks from `tasks/ui-batches-handoff.md`.
- Capture reference screenshots at 375px phone, tablet portrait, and desktop in dark and light themes.
- Turn the audit's Access and Foundation findings into a checked task matrix with current file locations.

Gate:

- All executable baseline checks pass, or every environment-only failure has a reproducible command and documented reason.
- No implementation starts with an unexplained red test.

## Milestone 1 — Visual foundation

Estimate: 4–6 focused days.

Tasks:

- Inventory semantic tokens and hardcoded color islands in compiler, terminal, canvas, status badges, and white editor surfaces.
- Replace component-level colors with semantic tokens; define surface, ink, muted, border, action, success, warning, error, code, paper, highlight, and focus roles.
- Add Gruvbox dark and light token maps; make dark the pre-hydration default.
- Remove teal theme options, values, and dead compatibility CSS.
- Apply theme before React hydration and set matching `color-scheme` and `theme-color` metadata to remove light-theme flash.
- Fix light-theme contrast failures to WCAG AA.
- Replace `transition: all` and layout-property transitions with explicit, compositor-safe transitions.

Gate:

- Both themes cover every primary route without teal remnants or hardcoded dark islands.
- No theme flash on reload.
- Text, controls, focus rings, and status colors meet WCAG AA.
- Theme choice persists across reloads.

## Milestone 2 — Gruvbox identity and interaction polish

Estimate: 3–5 focused days.

Tasks:

- Apply compact density consistently while preserving 44px coarse-pointer targets.
- Add subtle static paper grain to editor/content surfaces without reducing legibility.
- Add restrained 120–180ms transitions for route surfaces, dialogs, inspectors, save states, and actionable hover/focus states.
- Add optional analog details such as save-caret blink or brief status pulse; avoid continuous decorative motion.
- Respect reduced motion and low-power/mobile constraints.
- Normalize typography, spacing, borders, elevation, empty states, loading states, and error panels across modules.

Gate — visible coherence release:

- Home, Capture, Vault, Calendar, Coding, Study, Settings, and PDF entry points clearly belong to one product.
- Dark and light screenshots pass design review at phone, tablet, and desktop sizes.
- Reduced-motion mode contains no non-essential animation.

## Milestone 3 — One shell and discoverable navigation

Estimate: 4–6 focused days.

Tasks:

- Consolidate duplicated Home/ModuleShell theme, palette, notification, and collapse behavior.
- Expose Study, Projects, Automations, Dashboards, Plugins, Collaboration, Help, and Settings through a scalable navigation structure.
- Keep primary navigation compact; place secondary/admin destinations in a clearly named More or workspace menu.
- Add active-route state, meaningful icons/labels, keyboard navigation, and mobile drawer behavior.
- Replace full-page internal navigations with App Router navigation where safe.
- Make Help answer the core capture, note, calendar, ink, and PDF workflows.

Gate:

- Every supported module is reachable without typing a URL.
- Navigation works by touch, mouse, keyboard, and screen reader.
- Back/forward navigation does not reset the shell or flash the wrong theme.

## Milestone 4 — Access, state, and time consistency

Estimate: 5–8 focused days.

Tasks:

- Make Capture review rows keyboard-operable with correct selection and accessible names.
- Label Settings controls; improve notification unread, retry, resolve, and live-status treatment.
- Repair remaining calendar semantics: popovers, resize controls, month-cell nesting, announcements, and locale-aware time formatting.
- Add keyboard navigation to command palettes and repair the non-editable Home palette search.
- Fix remaining Vault mouse-only cards/actions and compiler focus/status announcements.
- Persist Calendar view/date, Capture filter/search, and Vault folder/tag selection in URLs.
- Define one timezone policy: UTC storage, explicit event zone, device/user-zone display; remove Jakarta-only rendering assumptions.
- Add `<time datetime>` and tabular numeric treatment to time surfaces.

Gate — existing-product completion:

- Core Capture, Vault, Calendar, Coding, Study, and Settings flows complete by keyboard alone.
- Refresh and browser Back preserve the user's module context.
- The same event renders consistently across Home, Capture proposals, and Calendar.
- Focused axe/browser checks have no serious or critical violations.

## Milestone 5 — PDF foundation and annotator

Estimate: 8–12 focused days.

Approved dependency: `pdfjs-dist`.

Tasks:

- Confirm the existing asset and `pdf_annotations` API contracts; add only missing validation or workspace authorization.
- Create a PDF attachment route/view inside the coherent shell.
- Render pages lazily with `pdfjs-dist`; support zoom, fit-width, page navigation, and responsive loading states.
- Replay normalized highlight, ink, and text annotations over rendered pages.
- Add touch-first annotation tools with pen gating, pointer capture, undo/redo, keyboard alternatives, and accessible labels.
- Persist annotations without mutating the source PDF; handle save conflicts honestly.
- Surface existing region-to-note/course links in the UI.
- Keep large documents usable through page virtualization/lazy rendering.

Gate:

- Import/open a multi-page PDF, annotate it with highlight/ink/text, reload, and see identical placement.
- The workflow works on phone reading mode, tablet pen input, and desktop keyboard/mouse.
- Unauthorized cross-workspace assets and malformed annotation geometry are rejected.

## Milestone 6 — Flattened annotated-PDF export

Estimate: 5–8 focused days.

Approved dependency: `pdf-lib`.

Tasks:

- Implement a server export module that copies original pages and draws normalized highlight, ink, and text overlays.
- Preserve source page dimensions, rotation, ordering, and the original PDF asset.
- Generate `{Title}-annotated-{YYYY-MM-DD}.pdf` with safe filename handling.
- Add export progress, recoverable errors, and a clear download action in the annotator.
- Audit successful exports without storing document contents in telemetry.
- Add a deterministic three-page fixture covering rotation, multiple annotation types, and pages without annotations.

Gate:

- Exported PDF opens in an independent viewer and visually matches the annotator.
- Export never changes the source PDF or annotation records.
- Three-page round-trip browser test passes.

## Milestone 7 — Noema note-to-PDF export

Estimate: 4–6 focused days.

Tasks:

- Define print tokens and pagination rules for headings, paragraphs, code, tables, equations, images, and ink blocks.
- Render authoritative markdown and rasterized ink in block order.
- Add a note-header export action with title/date metadata and theme-neutral print styling.
- Handle page breaks, long code/tables, empty notes, and missing optional assets.
- Keep Markdown export as the portable source format; label PDF as a presentation/submission artifact.

Gate:

- A mixed note containing markdown, code, table, equation, image, and ink exports legibly with correct order.
- Output is readable in print and independent PDF viewers.

## Milestone 8 — Certification and handoff

Estimate: 3–5 focused days.

Tasks:

- Run unit tests, TypeScript, production build, filtered browser tests, and new PDF tests.
- Run responsive checks at 375px, tablet portrait/landscape, and desktop.
- Run keyboard-only, screen-reader semantics, contrast, reduced-motion, and touch-target checks.
- Test long PDFs, malformed PDFs, interrupted exports, offline/reconnect behavior, and low-memory rendering.
- Update `README.md`, `PROJECT.md`, `DESIGN.md`, roadmap status, and Graphify.
- Archive superseded UI handoff documents as completed historical context.

Final success criteria:

- Noema presents one intentional Gruvbox visual system with no teal fallback paths.
- All shipped modules are discoverable and core workflows are accessible.
- Dates, views, and filters survive navigation and reload consistently.
- Users can annotate an imported PDF and download a faithful flattened copy.
- Users can export mixed Noema notes as readable PDFs.
- Required tests, build, browser, responsive, and accessibility gates are green.

## Sequence and effort

Critical path:

`Baseline → visual tokens → Gruvbox polish → shared shell/navigation → access/state/time → PDF annotator → flattened export → note export → certification`

Expected effort: 36–58 focused working days, including uncertainty allowance. For one sequential agent, treat this as roughly 8–12 working weeks rather than a deadline commitment. Re-estimate after Milestones 0, 4, and 5.

## Principal risks

| Risk | Response |
|---|---|
| Hardcoded colors make theme replacement regress routes | Token inventory first; screenshot gate before deleting teal paths |
| Shell consolidation causes broad regressions | Move one route group at a time; keep browser checks green per move |
| Timezone normalization changes existing dates | Add cross-module fixtures before migration; preserve stored instants |
| PDF coordinates drift across zoom/rotation | Store normalized page coordinates; fixture rotated and mixed-size pages |
| Large PDFs exhaust browser memory | Lazy page rendering, bounded canvas cache, explicit performance test |
| Flattened export differs from on-screen rendering | Share coordinate transforms and add visual round-trip fixtures |
| Note-to-PDF becomes a second layout engine | Keep a narrow print contract and reuse rendered markdown/ink output |
| Scope expands into DOCX/audio/AI work | Enforce the exclusions until the final gate passes |
