# Noema Requirements Audit — Student Feature-Gap Analysis

**Date:** 2026-08-23  
**Method:** Source code analysis of all `app/` modules, `server/`, `PROJECT.md`, `DESIGN.md`, `PRODUCT.md`, `UI_AUDIT_FINDINGS.md`, `UX_AUDIT_FINDINGS.md`. Cross-referenced against the detailed student requirements from the BINUS user's prompt.

---

## Executive Summary

The Noema codebase already covers **~60%** of the student's requested feature surface at varying levels of maturity. The biggest gaps cluster in four areas: **(1)** true mixed-mode annotation (handwriting *on top of* typed markdown / imported PDF/DOCX), **(2)** equation and table insertion via WYSIWYG toolbar (Google Docs feel), **(3)** BINUS/Binusmaya integration, and **(4)** natural-language → structured event/task with multi-reminder. Several existing features (audio capture, AI tutor with add-to-note, coding compiler, calendar/tasks, file import) are present but need UX surfacing, polish, or integration work.

---

## 🟢 FULLY COVERED — Existing and Working

These requirements are already functional in the current codebase, though some may need minor UX polish.

### 1. Obsidian-like typed markdown notes
- **Status:** ✅ **Vault module** with `MixedNoteEditor`, Markdown rendering with Mermaid/chart support, backlinks, FTS5 search.
- **Source:** `app/vault/`, `app/components/MixedNoteEditor.tsx`, `PROJECT.md:72-76`
- **Caveat:** UI_AUDIT reports data-loss bugs in the mixed editor (blur-only saves, mode-switch unmount without flush). Fix these before declaring production-ready.

### 2. Task list with checkboxes
- **Status:** ✅ **Today/Home page** shows tasks with checkboxes. **Tasks module** has full CRUD, dependencies, projects integration. Obsidian vault checkbox sync is implemented.
- **Source:** `app/page.tsx` (Today), `app/tasks/`, `PROJECT.md:72-73`

### 3. Calendar (Google Calendar-like)
- **Status:** ✅ **Calendar module** with Day/Week/Month/Agenda views, Google Calendar OAuth sync (two-way), event creation/editing, recurrence, timezone support.
- **Source:** `app/calendar/`, `PROJECT.md:81-85`
- **Caveat:** UX audit (#1) reports calendar is view-only on touch devices (pointer:coarse early-return). Events cannot be deleted. Agenda view date mismatch. Fix these for tablet/phone use.

### 4. AI Tutor with "Add to Note" function
- **Status:** ✅ **ContextualAssistant** component with Tutor sessions, citations, provider provenance. Note insertion is explicit, idempotent, transactional, recorded against source Tutor message, reversible through note versions.
- **Source:** `app/components/ContextualAssistant.tsx`, `app/components/TutorPanel.tsx`, `PROJECT.md:89`

### 5. C coding (test C code on mobile)
- **Status:** ✅ **Coding module** with Bubblewrap-isolated compiler, mobile code keyboards with caret joystick, language-aware symbol rows, multi-tab editing, saved code via Syncthing.
- **Source:** `app/coding/`, `PROJECT.md:47`
- **Caveat:** UX audit (#9) reports compiler can lose unsaved code; no `beforeunload`; runs unstoppable (no AbortController). Needs dirty guards.

### 6. File import (PDF/DOCX)
- **Status:** ✅ Uploads stream to temp file, MIME-whitelisted (PDF, DOCX, text, images, audio), SHA-256-hashed, atomically stored. `pdftotext` and DOCX XML extraction for AI processing.
- **Source:** `PROJECT.md:90`
- **Caveat:** Import is for *AI processing*, not for direct annotation on top of the imported document. The student wants to annotate *on top of* imported PDF/DOCX like a worksheet. PDF assets support annotations (highlights, ink, comments) — see below.

### 7. PDF annotation (highlights, ink paths, text annotations)
- **Status:** ✅ PDF assets support versioned page-coordinate highlights, ink paths, text annotations, comments, links to notes/courses. Normalized coordinates, audited mutations. Export as portable JSON.
- **Source:** `PROJECT.md:55`
- **Caveat:** This is annotation *on PDF assets*, not on imported DOCX. DOCX-to-PDF conversion for annotation would be needed. The UX is not surfaced as "import worksheet → annotate → export" flow.

### 8. Photo capture / whiteboard photo
- **Status:** ✅ File capture with Gemini OCR/transcription. Handwritten images enter through file capture and Gemini OCR. Capture → AI interpretation pipeline exists.
- **Source:** `PROJECT.md:90`
- **Caveat:** The "lazy photo → AI generates detailed note" flow is not explicitly surfaced as a one-tap workflow. Currently a photo becomes a capture, then the user reviews AI proposals.

### 9. Audio capture / lecture recording
- **Status:** ✅ Audio files are MIME-whitelisted (audio/*). Upload → Gemini transcription → capture interpretation pipeline.
- **Source:** `PROJECT.md:90`
- **Caveat:** No dedicated "Record lecture" button in the UI. Audio must be uploaded as a file capture. No pause/resume recording, no lecture-mode UI.

### 10. Dark theme (Gruvbox)
- **Status:** ✅ Gruvbox dark-first design system with light theme alternative. Semantic color tokens. WCAG AA passes in dark mode.
- **Source:** `DESIGN.md`, `app/globals.css`

### 11. Export workspace data
- **Status:** ✅ Settings → Data → Export workspace downloads `.tar` with `workspace.json` and original assets.
- **Source:** `PROJECT.md:39`
- **Caveat:** This exports the *workspace*, not a single annotated file as PDF. The student wants per-file PDF export for submission.

---

## 🟡 PARTIALLY COVERED — Exists but Needs Extension

### 12. Handwriting / annotation over typed notes (Mixed-Mode Notes)
- **Current:** `MixedNoteEditor.tsx` supports both typed Markdown and ink blocks. Ink strokes stored as controlled SVG/JSON attachments.
- **Gap:**
  - UI_AUDIT reports **data-loss bugs**: blur-only saves, mode-switch unmount without flush, content-only edits never calling save, `load()` overwriting dirty state.
  - Ink overlay uses `touch-action: none` on full page with no pen gating — palms draw strokes on tablets.
  - No seamless *annotation over existing text* — ink is a separate block, not an overlay layer on top of rendered Markdown.
  - No ability to circle, underline, or arrow-annotate specific paragraphs.
- **Files:** `app/components/MixedNoteEditor.tsx`, `app/components/InkEditor.tsx`
- **Recommendation:** Add an "annotation layer" mode that floats over rendered Markdown (like GoodNotes/Notability) rather than inserting ink as block-level content.

### 13. Export annotated file as PDF
- **Current:** PDF assets support annotation export as *portable JSON*. No "export annotated note as PDF" flow.
- **Gap:** The student needs to submit annotated worksheets to lecturers. No PDF export of mixed typed + handwritten notes.
- **Recommendation:** Add PDF export (using `html2canvas` + `jsPDF` or server-side Puppeteer/Playwright) for any note, rendering ink overlays + typed content into a single PDF.

### 14. Natural language → Calendar event + Task with reminders
- **Current:** Capture interpretation returns `task.create` and `event.create` actions. AI interprets free-text captures.
- **Gap:** The specific "meeting tomorrow at 1pm" → event + task with 1-hour and 30-minute reminders is not a surfaced workflow. Reminder offsets exist in schema but multi-reminder per task/event needs verification.
- **Files:** `server/`, `PROJECT.md:57`
- **Recommendation:** Create a dedicated "Quick Schedule" capture mode that parses dates/times/reminders and creates both event and linked task in one action.

### 15. AI processing toggle (lazy bullets → detailed overview vs leave as-is)
- **Current:** AI interpretation runs on all captures. The user can review AI proposals and accept/reject.
- **Gap:** No explicit "process this note" vs "leave as typed" toggle at note level. The AI runs on capture, not on existing typed notes.
- **Recommendation:** Add a per-note "AI expand" button that generates detailed overview from bullet points, with a clear accept/discard flow (similar to existing capture proposal review).

### 16. Equation and table insertion toolbar (Google Docs feel)
- **Current:** Notes are Markdown-based. Equations must be typed as raw LaTeX (`\p^2`). Tables must be typed as Markdown tables.
- **Gap:** The student explicitly wants "insert equations from top bar instead of typing raw LaTeX" and "insert tables from top bar." No WYSIWYG equation editor or table builder exists.
- **Recommendation:** Add a formatting toolbar (similar to Google Docs / Notion) with:
  - Equation button → opens a visual equation editor (or LaTeX helper with preview)
  - Table button → opens a grid-size picker → inserts Markdown table
  - Image button → file picker → inserts image

### 17. Zoom / pinch-to-zoom on tablet
- **Current:** No zoom controls in the note editor or canvas. CSS does not reference pinch-zoom.
- **Gap:** Students need to pinch-zoom for handwriting precision on tablets.
- **Recommendation:** Add CSS `touch-action: pan-x pan-y pinch-zoom` and implement viewport scale tracking in the ink editor.

### 18. Canvas / Mind Map
- **Current:** `/canvas` page exists as a workspace canvas with bounded viewport, object state in SQLite. Canvas objects link canonical notes, tasks, events, projects, assets, and ink by ID.
- **Gap:** UX audit (#1, #3) reports Canvas is **missing from sidebar navigation** and `/graph` (knowledge graph) returns 404. Canvas needs to be discoverable.
- **Files:** `app/canvas/`, `app/components/ModuleShell.tsx`
- **Recommendation:** Add Canvas to `moreNav` in ModuleShell and fix `/graph` 404.

### 19. Capture bar on home page
- **Current:** Present with placeholder "Capture anything…", file/handwriting/voice buttons, send button.
- **Gap:** No dedicated "take photo" button (uses generic file attachment). No "record audio" button.
- **Files:** `app/page.tsx`, `app/components/`
- **Recommendation:** Add camera and microphone quick-action buttons to the capture bar.

---

## 🔴 NOT COVERED — Missing Entirely

### 20. BINUS / Binusmaya Integration
- **Status:** ❌ **Nothing exists.**
- **Required:**
  - Fetch all `mata kuliah` (courses) data from Binusmaya
  - AI generates learning recommendations per course
  - AI creates calendar events and tasks for course deadlines
  - AI generates structured overview: session-per-session + full semester overview
- **Challenge:** Binusmaya does not have a public API. Would need:
  - Web scraping / student-portal integration (brittle, against ToS)
  - OR a Binusmaya-supported API (would need university partnership)
  - OR a manual import format (e.g., export from Binusmaya → upload to Noema)
- **Recommendation:** Start with a **manual import** approach: define a CSV/JSON schema for course data that the student can export from Binusmaya. Add a "Binus Import" wizard. The AI can then generate schedules and overviews from that data. Future: explore if Binusmaya has a student API.

### 21. Dedicated "Record Lecture" audio capture
- **Status:** ❌ **No lecture recording UI.**
- **Required:**
  - One-tap "Record" button that captures audio
  - Pause/resume/stop controls
  - Auto-uploads for AI transcription
  - Option to link recording to a specific course/note
- **Recommendation:** Add a `MediaRecorder`-based audio capture flow in the Capture module. After recording, treat as a file capture with Gemini transcription.

### 22. Natural language quick-input for events/tasks
- **Status:** ❌ **No dedicated NL input field.**
- **Required:**
  - A text field where the student types "meeting tomorrow at 1pm"
  - Parses date, time, title, and reminder preferences
  - Creates both calendar event AND task with reminders (1 hour before, 30 minutes before)
- **Recommendation:** Add a "Quick Schedule" input in the capture bar or a dedicated modal. Use the existing capture AI (which already parses `task.create` / `event.create`) but constrain it to schedule parsing with explicit multi-reminder output.

### 23. Import DOCX/PDF as annotation canvas (worksheet mode)
- **Status:** ❌ **Import exists for AI processing, not for annotation.**
- **Required:**
  - Import a DOCX/PDF → render it as a scrollable canvas
  - Annotate directly on top: handwriting, highlights, text boxes
  - Export the annotated result as PDF for submission
- **Recommendation:** Add a "Worksheet" mode: import file → convert to page images (PDF.js for PDF, LibreOffice/Unoconv for DOCX) → render as annotation surface → export annotated result. This is a major feature.

### 24. WYSIWYG equation toolbar
- **Status:** ❌ **No equation toolbar.**
- **Required:**
  - A toolbar button that opens an equation editor
  - Visual math input (or LaTeX with live preview)
  - Inserts rendered equation into the note
- **Recommendation:** Integrate a lightweight equation editor (e.g., MathQuill, KaTeX with editor). When the user clicks "Insert equation," show a small editor that renders preview and inserts KaTeX/MathML.

### 25. WYSIWYG table toolbar
- **Status:** ❌ **No table toolbar.**
- **Required:**
  - Toolbar button → grid picker (e.g., 3×3, 4×5)
  - Inserts Markdown table skeleton
  - In-editor table editing (add/remove rows/columns)
- **Recommendation:** Add a table grid picker dropdown to the toolbar. For editing, consider a lightweight table widget or structured Markdown table helper.

### 26. AI "understand my handwriting" for math formulas and tables
- **Status:** ❌ **Unclear / unverified.**
- **Required:**
  - Handwritten linear algebra formulas → LaTeX conversion
  - Hand-drawn tables → structured table conversion
  - AI continuing a half-written math note in proper LaTeX
  - AI understanding which note to scan (context awareness)
- **Challenge:** This is the hardest technical problem. Current Gemini OCR extracts text, not LaTeX math structure. Hand-drawn tables need layout analysis.
- **Recommendation:**
  - For math: use Gemini's multimodal capabilities with a specialized math prompt (ask it to output LaTeX). This is an AI prompt engineering task, not a code change.
  - For tables: add a "handwriting → table" AI job that uses Gemini vision to detect table structure.
  - For context: the existing capture system already processes one capture at a time; the note context is available. Add a "Continue this note with AI" button that sends the current note + new ink to the AI with context.

### 27. Zero-friction mode switching (handwriting ↔ typing ↔ reading)
- **Status:** ⚠️ **Partially exists but friction remains.**
- **Required:**
  - Tap to type, pick up pen to write, no mode toggles
  - Instant switching without data loss
- **Current state:**
  - MixedNoteEditor requires explicit mode switching
  - UI_AUDIT reports data loss on mode switch
  - Ink overlay `touch-action:none` blocks scrolling while ink mode is active
- **Recommendation:** Implement a single unified editor surface where:
  - Keyboard input → typed text
  - Pen/stylus input → ink overlay (with pen gating from InkEditor.tsx:207-302)
  - Finger touch → scroll/pan
  - No explicit "mode toggle" needed

### 28. Course material overview (session-per-session + semester)
- **Status:** ❌ **No AI-generated course overviews.**
- **Required:**
  - AI generates structured overview per session
  - AI generates overall semester overview
  - Linked to calendar events and tasks
- **Recommendation:** Add a "Generate Overview" button in the Study module. The AI would need course materials as context (syllabus, lecture notes, slides). This could work with uploaded PDFs/DOCXs.

---

## 📊 COVERAGE SUMMARY

| Category | Coverage | Key Gaps |
|----------|----------|----------|
| Core note-taking (Markdown) | ✅ Full | Data-loss bugs need fixing |
| Handwriting / annotation over typed notes | 🟡 Partial | No overlay layer; palm rejection; data loss on switch |
| AI capture interpretation | ✅ Full | Polish needed for specific workflows (lazy→detailed, schedule parsing) |
| AI Tutor + Add to Note | ✅ Full | Already implemented |
| Calendar | ✅ Full | Touch support broken (#1 UX); no event delete; agenda date bug |
| Tasks | ✅ Full | No NL quick-input workflow |
| Coding (C compiler) | ✅ Full | Dirty guards missing; no stop button |
| File import (PDF/DOCX) | 🟡 Partial | For AI processing only; no annotation-on-import |
| PDF annotation | ✅ Full | Exists as asset annotation; not surfaced as "worksheet mode" |
| PDF export for submission | ❌ Missing | Only workspace .tar export exists |
| Audio / lecture recording | 🟡 Partial | No dedicated recording UI or lecture mode |
| NL → Event+Task with reminders | ❌ Missing | Not surfaced as a dedicated workflow |
| Equation toolbar (WYSIWYG) | ❌ Missing | Raw LaTeX only |
| Table toolbar (WYSIWYG) | ❌ Missing | Raw Markdown tables only |
| Pinch-to-zoom on tablet | ❌ Missing | No zoom controls in editor or canvas |
| Canvas / Mind Map | 🟡 Partial | Page exists but hidden from nav; `/graph` 404 |
| BINUS/Binusmaya integration | ❌ Missing | Nothing exists |
| Course overview (AI-generated) | ❌ Missing | Nothing exists |
| Quick Schedule (meeting tomorrow at 1pm) | ❌ Missing | Not surfaced |
| Zero-friction mode switching | 🟡 Partial | Explicit toggles; data loss on switch |

| Metric | Count |
|--------|-------|
| ✅ Fully covered | 11 |
| 🟡 Partially covered | 7 |
| ❌ Missing | 10 |
| **Total requirements analyzed** | **28** |

---

## 🎯 PRIORITIZED ROADMAP (Student Impact Order)

### Phase 1 — Quick Wins (fix existing features that the student relies on)
1. Fix mixed-editor data-loss bugs (blur-only saves, unmount flush, version-aware save)
2. Fix calendar touch support (enable pointer events for coarse pointers)
3. Fix agenda view date mismatch
4. Add Canvas, Notifications, Activity to sidebar navigation (already identified in UX_AUDIT)
5. Add compiler dirty guards and Stop button
6. Add camera and microphone quick-action buttons to capture bar

### Phase 2 — Core Student Workflow (medium effort, high impact)
7. **WYSIWYG toolbar** for equations (KaTeX editor + preview) and tables (grid picker)
8. **AI expand note** button: send bullet points to AI → generate detailed overview with accept/discard
9. **Quick Schedule** input: type "meeting tomorrow at 1pm" → event + task with 1h/30m reminders
10. **Pinch-to-zoom** in ink editor for tablet handwriting precision
11. **PDF export** of mixed notes (typed + ink) for submission

### Phase 3 — Advanced Student Features (major effort)
12. **Worksheet mode**: import PDF/DOCX → render as annotation canvas → export annotated PDF
13. **Zero-friction unified editor**: pen = ink, keyboard = text, finger = scroll, no mode toggle
14. **Handwriting → LaTeX/table** AI job using Gemini multimodal
15. **Record Lecture** UI with pause/resume, auto-transcription, course linking

### Phase 4 — BINUS Ecosystem (largest effort, external dependencies)
16. **Binusmaya import**: define CSV/JSON schema for course data → AI generates schedule + overview
17. **Course overview generator**: session-per-session + semester overview from uploaded materials
18. **Learning recommendation engine**: AI recommends study times and task priorities per course

