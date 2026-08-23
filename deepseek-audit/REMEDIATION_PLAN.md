# Remediation Plan: Noema Design & UX Audit Fixes

**Source:** `DESIGN_UI_AUDIT.md` (39 findings) + `UX_AUDIT_FINDINGS.md` (18 findings)
**Deduplicated total:** ~37 unique issues across 8 priority tiers

---

## PHASE 0 — CRITICAL (Ship-blocking; accessibility & broken UX)

### C0-1. `--sidebar` distinct from `--surface`
- **Files:** `app/globals.css:3`
- **Change:** `--sidebar:#282828` → `--sidebar:#242728` (subtly darker/cooler than `--surface:#282828`)
- **Why:** Zero visual depth between nav and cards. Sidebar should recede.

### C0-2. `--code` distinct from `--surface`/`--sidebar`
- **Files:** `app/globals.css:4`
- **Change:** `--code:#282828` → `--code:#2e2b2a` (warmer, visibly different)
- **Why:** Code blocks, terminal, diff views blend into regular surfaces.

### C0-3. `--faint` darkened for WCAG AA
- **Files:** `app/globals.css:3`
- **Change:** `--faint:#928374` → `--faint:#8a7f70` (or `#857a6c`)
- **Why:** 4.02:1 on surface fails AA 4.5:1 for normal text. Metadata uses `--faint` 20+ places.

### C0-4. Fix light theme WCAG AA failures
- **Files:** `app/globals.css:8`
- **Changes:**
  - `--warning:#8f3f00` → `#af3a03` (boost contrast on `--surface:#f9f5d7`)
  - `--faint:#7c6f64` → `#6a5f55` (pass AA on all surfaces)
  - `--code:#ebdbb2` → `#e0d5b0` (distinct from `--surface:#f9f5d7`)
  - Compiler syntax hardcoded hexes → map to light-theme token equivalents
- **Why:** Light theme is broken for accessibility; users who prefer light mode cannot read warnings/syntax.

### C0-5. Login password `minLength={12}` — add visible hint
- **Files:** `app/login/page.tsx:16`
- **Change:** Add `<small>At least 12 characters</small>` below the password label
- **Why:** No visible hint; `.env.example` has a 10-char password. New users create accounts they can never log into.

### C0-6. Graph 404 — create page or remove references
- **Files:** Create `app/graph/page.tsx` (stub `<ModuleShell active="Graph" title="Knowledge Graph"><KnowledgeGraphView/></ModuleShell>`)
- **Why:** Documented feature returns 404 dead-end. `KnowledgeGraphView.tsx` already exists.

### C0-7. Skip-to-content link not rendering
- **Files:** `app/components/ModuleShell.tsx:69`
- **Change:** Debug SSR mismatch. Ensure `<a className="skip">` renders unconditionally — check for hydration mismatch or conditional render.
- **Why:** Keyboard/screen-reader users must tab through all navigation.

---

## PHASE 1 — NAVIGATION & WAYFINDING

### P1-1. Add Canvas, Notifications, Activity to sidebar nav
- **Files:** `app/components/ModuleShell.tsx:22-26`
- **Change:** Add to `moreNav` array:
  ```ts
  ["Canvas","/canvas",FileText],
  ["Notifications","/notifications",Bell],
  ["Activity","/activity",Clock],
  ```
- **Why:** These pages have zero sidebar presence, no active indicator, no discoverability.

### P1-2. Settings double-entry: remove standalone sidebar button
- **Files:** `app/components/ModuleShell.tsx:74`
- **Change:** Remove the standalone `<Link className="settings" href="/settings">` — Settings already in `moreNav`. Or keep the sidebar button and remove from `moreNav`. Pick one.
- **Why:** Dual-entry confuses which nav element is authoritative.

### P1-3. Z-index scale as CSS custom properties
- **Files:** `app/globals.css` (51 occurrences across 29+ distinct values)
- **Change:** Define `--z-sidebar:20; --z-topbar:10; --z-modal:100; --z-palette:250; --z-fullscreen:9999;` etc. and replace all raw values.
- **Why:** Z-index sprawl makes layering bugs inevitable.

### P1-4. Active nav indicator for Canvas/Notifications/Activity
- **Files:** `app/components/ModuleShell.tsx:44`
- **Change:** Add `"canvas"`, `"notifications"`, `"activity"` to the analytics `allowed` Set AND ensure `active` prop matches when these routes are active.
- **Why:** Verified via Playwright: navigating to these routes shows `active=""`.

---

## PHASE 2 — ACCESSIBILITY & KEYBOARD

### P2-1. Add `<h1>` to compiler page
- **Files:** `app/coding/compiler/page.tsx`
- **Change:** Add `<h1 className="sr-only">Compiler</h1>` or visible heading.
- **Why:** No h1 element; accessibility issue for screen readers.

### P2-2. Platform-detect keyboard shortcut (⌘K vs Ctrl+K)
- **Files:** `app/components/ModuleShell.tsx:78`, `app/page.tsx:333`
- **Change:** Replace hardcoded `⌘ K` with `{navigator.platform.includes("Mac") ? "⌘ K" : "Ctrl K"}`
- **Why:** Shows ⌘K on all platforms; Linux/Windows users see wrong shortcut.

### P2-3. Mobile autoFocus → desktop-only
- **Files:** `app/page.tsx:264`, `app/components/ModuleShell.tsx:83`, `app/calendar/page.tsx:604,858`, `app/components/HandwritingCapture.tsx:184`
- **Change:** Wrap `autoFocus` in a hook that only activates on `@media (pointer: fine)`. On mobile, autoFocus opens virtual keyboard immediately, pushing content off-screen.
- **Why:** 5 occurrences of mobile anti-pattern.

### P2-4. 24-hour time → locale-aware
- **Files:** `app/page.tsx:25,28,29`, `app/calendar/page.tsx:53`, `app/capture/page.tsx:47`
- **Change:** Replace `hourCycle:"h23"` with no hourCycle (let `Intl.DateTimeFormat` default to locale) or use `hourCycle: navigator.language.startsWith("en-US") ? "h12" : "h23"`.
- **Why:** US users see 14:30 instead of 2:30 PM.

### P2-5. Notification read/unread visual distinction
- **Files:** `app/notifications/page.tsx`, `app/globals.css`
- **Change:** Add `opacity:.6` or `border-left:3px solid transparent` on read items, and a left `--primary` border on unread items.
- **Why:** Only a left-border inset on popover distinguishes them; full page has no visual difference.

---

## PHASE 3 — PERFORMANCE & CSS HYGIENE

### P3-1. Replace `transition: all` with explicit properties
- **Files:** `app/globals.css` (13+ rules using `transition: all`)
- **Change:** `transition: all .15s ease` → `transition: background-color .15s ease, color .15s ease` (list only animated properties). Exclude layout-triggering `max-width`/`max-height`.
- **Why:** `all` transitions every property including layout triggers, causing unnecessary recalculations on low-power devices.

### P3-2. Split 257KB CSS file
- **Files:** `app/globals.css` (257KB)
- **Change:** Extract into: `tokens.css` (variables, base), `layout.css` (shell, sidebar, topbar), `components.css` (cards, buttons, modals), `pages.css` (page-specific). Import tokens + base in `layout.tsx`, lazy-load others.
- **Why:** Largest asset, slow CSSOM construction.

### P3-3. Fix light-theme FOUC & theme-color meta
- **Files:** `app/layout.tsx:16,18`
- **Change:** Verify the inline `themeScript` correctly updates `theme-color` meta for light theme (`#fbf1c7`). Already has correct structure — confirm it works.
- **Why:** Flash of dark theme before hydration if saved theme is light.

### P3-4. Consistent scrollbar system
- **Files:** `app/globals.css:12`
- **Change:** Remove global `scrollbar-width:thin` and apply custom scrollbars via `.custom-scroll` class on overflow containers. Reference `--code` or `--surface` instead of `--sidebar` for scrollbar colors.
- **Why:** Three conflicting scrollbar systems.

---

## PHASE 4 — COMPILER / CODE ISLAND

### P4-1. Compiler editor invisible focus
- **Files:** `app/globals.css:298`
- **Change:** Keep `outline:none` on textarea (required for transparent text overlay) but add visible border/outline on parent `.code-stack` when textarea focused: `.code-editor:focus-within { outline: 2px solid var(--focus); outline-offset: -2px; }`
- **Why:** No visible focus indicator when editor regains focus.

### P4-2. Compiler syntax colors → Gruvbox tokens
- **Files:** `app/coding/compiler/page.tsx:218-353`, `app/globals.css:488-553`
- **Change:** Replace hardcoded VS Code default hex colors (`#569cd6`, `#d97706`, `#ce9178`, `#10151d`) with CSS custom properties: `var(--syntax-keyword)`, `var(--syntax-string)`, etc.
- **Why:** A token-only Gruvbox reskin would miss these 137+ hardcoded hex literals.

### P4-3. Compiler island light theme — verify overrides
- **Files:** `app/globals.css:219-258`
- **Change:** Most light-theme overrides already exist. Verify syntax colors and terminal/pre backgrounds use tokens properly.
- **Why:** Compiler background stayed dark even in light mode before the overrides.

---

## PHASE 5 — CALENDAR

### P5-1. Multi-day events render on all spanned days
- **Files:** `app/calendar/page.tsx:239-240,493`
- **Change:** For events with `endAt > startAt + 1 day`, render on each day column in week view and each day cell in month view.
- **Why:** Events spanning multiple days only appear on first day.

### P5-2. Calendar touch-locked: drag-to-create/move on touch devices
- **Files:** `app/calendar/page.tsx` (near `matchMedia("(pointer: coarse)")` early-return)
- **Change:** Remove coarse-pointer early returns in `beginSlot` and `moveItem`. Unify pointer events.
- **Why:** No drag-to-create, no move/reschedule by touch. Tablets/phones cannot create or edit events.

### P5-3. `+N more` overflow in month cells
- **Files:** `app/calendar/page.tsx`
- **Change:** When events in a month cell exceed available height, show `+3 more` indicator and open a popover on click.
- **Why:** Events are cut off when more than fit.

---

## PHASE 6 — INK / PEN

### P6-1. Ink overlay `touch-action:none` with pen gating
- **Files:** `app/globals.css:105` (`.ink-canvas { touch-action:none }`), `app/components/InkEditor.tsx:207-302` (has proper pen gating)
- **Change:** Port the pen-gating logic from `InkEditor.tsx` (proper `pointerType === "pen"` detection) to `MixedNoteEditor.tsx`. Set `touch-action:none` only when pen is active.
- **Why:** No distinction between stylus and finger. Palms draw strokes. Cannot scroll in ink mode.

### P6-2. Mobile ink toolbar buttons → 44px min
- **Files:** `app/globals.css:521-524`
- **Change:** At `<=600px`, set `min-width:44px; min-height:44px` on toolbar buttons.
- **Why:** Violates WCAG 2.2 AA 44px touch target.

---

## PHASE 7 — ERROR HANDLING & POLISH

### P7-1. Human-readable notification delivery status
- **Files:** `app/notifications/page.tsx:14-15`
- **Change:** Map `permanent-failure` → "Delivery failed permanently", `(502)` → "Temporary server error (502)"
- **Why:** Raw backend jargon exposed to users.

### P7-2. Human-readable OCR status
- **Files:** `app/components/InkEditor.tsx:810,497`
- **Change:** Map `complete` → "Ready", `unavailable` → "Not available"
- **Why:** Raw enums shown to users.

### P7-3. Env-var names → friendly labels
- **Files:** Wherever `NOEMA_GOOGLE_CLIENT_ID` appears in UI
- **Change:** Use "Google Client ID" instead of `NOEMA_GOOGLE_CLIENT_ID`
- **Why:** Jargon visible in UI.

### P7-4. Add `app/global-error.tsx`
- **Files:** Create `app/global-error.tsx`
- **Change:** Minimal error boundary with "Return home" link, styled within the shell.
- **Why:** Root-level errors have no navigation context.

### P7-5. Add skeleton loading screens
- **Files:** `app/loading.tsx` (currently just a spinner)
- **Change:** Add skeleton placeholders for Vault, Calendar, Capture layouts.
- **Why:** No loading skeleton — just a spinner.

---

## PHASE 8 — OPTIMIZATION & LONG-TERM

### P8-1. Virtualize long lists
- **Files:** Capture queue, task list, notification list
- **Change:** Use `IntersectionObserver`-based lazy rendering or a lightweight virtualizer for lists with 50+ items.
- **Why:** Performance degrades with many items.

### P8-2. Preserve URL state across navigation
- **Files:** Calendar view/date, capture filters/search, vault folder/tag
- **Change:** Push view state to URL search params using `useSearchParams`.
- **Why:** All view state lost on refresh. Only `?open=` preserved.

### P8-3. `touch-action: pan-y` on calendar week columns
- **Files:** `app/calendar/page.tsx:456`
- **Change:** Already partially present (`style={{touchAction:'pan-y'}}`). Ensure it's applied consistently across all scrollable calendar containers.
- **Why:** Enables vertical scroll on week columns on mobile.

---

## SUMMARY TABLE

| Phase | Issues | Files Touched | Effort |
|-------|--------|--------------|--------|
| **0 — Critical** | 7 | globals.css, login/page.tsx, graph/page.tsx, ModuleShell.tsx | ⭐⭐⭐ |
| **1 — Navigation** | 4 | ModuleShell.tsx, globals.css | ⭐⭐ |
| **2 — Accessibility** | 5 | compiler/page.tsx, ModuleShell.tsx, page.tsx, calendar/page.tsx, globals.css | ⭐⭐ |
| **3 — Performance/CSS** | 4 | globals.css, layout.tsx | ⭐⭐⭐ |
| **4 — Compiler** | 3 | globals.css, compiler/page.tsx | ⭐⭐ |
| **5 — Calendar** | 3 | calendar/page.tsx | ⭐⭐⭐ |
| **6 — Ink/Pen** | 2 | globals.css, MixedNoteEditor.tsx, InkEditor.tsx | ⭐⭐ |
| **7 — Error handling** | 5 | notifications/page.tsx, InkEditor.tsx, global-error.tsx, loading.tsx | ⭐ |
| **8 — Optimization** | 3 | Multiple list components, calendar/page.tsx | ⭐⭐⭐ |
| **Total** | **~37** | ~25 files | |

**Start with Phase 0:** color tokens, login hint, graph route, and skip-link.
