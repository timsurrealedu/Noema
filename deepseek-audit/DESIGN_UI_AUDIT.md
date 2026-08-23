# Noema Comprehensive Design & UI/UX Audit

**Date:** 2026-08-23
**Method:** Dual-pass analysis:
1. **Static:** Full source analysis of app/globals.css (257K, 600+ CSS rules), every .tsx component, DESIGN.md, PRODUCT.md, PROJECT.md
2. **Live:** Playwright browser rendering at 1440x900 on all available routes, screenshot capture, DOM inspection
3. **Previous audits referenced:** UI_AUDIT_FINDINGS.md, UX_AUDIT_FINDINGS.md

---

## GREEN - DESIGN STRENGTHS (Preserve)

### 1. Semantic color token system
- Gruvbox-inspired dark theme with semantic tokens (--bg, --surface, --raised, --ink, --muted, --faint, --primary, --error, --success, --warning)
- Dark theme contrast ratios are excellent (11.95:1 ink/bg, 7.53:1 muted/bg, 6.61:1 primary/bg)
- color-mix() used tastefully for hover/selected states with transparency
- Light theme alternative exists with the same semantic roles

### 2. Typography discipline
- Single system sans stack
- Monospace reserved for code
- Fixed scale from 0.7rem (metadata) to 2.4rem (auth page hero)
- text-wrap: balance used appropriately

### 3. Consistent border-radius tokens
- --r-sm: 10px, --r-md: 14px, --r-lg: 18px applied consistently across all surfaces and controls

### 4. Focus-visible outline system
- All interactive elements have outline: 2px solid var(--focus); outline-offset: 3px
- Consistent focus indicator across buttons, inputs, links, selects, textareas

### 5. Mobile responsive structure
- Sidebar hidden, bottom nav present on <820px
- Touch-safe bottom padding with env(safe-area-inset-bottom)
- Bottom nav items meet 44px min-height at 52px

### 6. Paper texture and visual warmth
- Static subtle paper grain through raised surface tones and hairline borders
- No glass effects or large shadows

### 7. Capture failure taxonomy
- Error messages are honest and specific: Network request failed, AI provider rate limited
- Retry button always present

---

## RED - CRITICAL DESIGN ISSUES

### C1. --sidebar and --surface are identical (#282828)
- File: app/globals.css:3
- Code: --sidebar:#282828;--surface:#282828;
- Problem: Sidebar navigation has the exact same background as card surfaces. Zero visual depth.
- DESIGN.md says: Depth comes from surface lightness and hairline borders - but identical colors means no depth.
- Contrast: --sidebar vs --bg: #1d2021 is only 1.17:1 - barely perceptible.
- Fix: Change --sidebar to a subtly distinct tone (e.g., #242728 or #26292a)

### C2. --code is identical to --surface and --sidebar (#282828)
- File: app/globals.css:4
- Code: --code:#282828
- Problem: Code blocks, compiler, terminal, and diff views all blend into regular content surfaces.
- Impact: Terminal, compiler editor, code blocks in notes - all invisible as distinct elements.
- Fix: Change --code to a distinctly different tone (e.g., #2e2b2a or #2d2c2e)

### C3. --faint fails WCAG AA for normal body text
- File: app/globals.css:3
- Value: --faint: #928374
- Contrast ratios:
  - On --bg: #1d2021 = 4.47:1 (needs 4.5:1 - borderline fail)
  - On --surface: #282828 = 4.02:1 (FAIL)
  - On --raised: #3c3836 = 3.69:1 (FAIL)
- Impact: 20+ usages of --faint for metadata text are hard to read.
- Fix: Darken --faint to #8a7f70 or ensure it is only used for non-essential metadata.

### C4. Light theme has AA failures
- File: app/globals.css:8
- Problem tokens:
  - --warning: #8f3f00 on --surface: #f9f5d7 = ~2.04:1 (severe fail)
  - Syntax string amber #d97706 hardcoded in compiler = ~3.1:1 on light code bg
  - Status badges = ~2.2:1
- Impact: Light theme is broken for accessibility. Users who prefer light mode cannot read warnings or syntax.
- Fix: Recalculate all light theme tokens for WCAG AA compliance.

### C5. Hardcoded hex colors outside token system - token islands
- File: app/globals.css:196,200,488-553 and app/coding/compiler/page.tsx:218-353
- Problem: The compiler island has 137+ hardcoded hex literals outside the token system:
  - Terminal/pre background #10151d (still dark even in light mode)
  - Canvas white walls force #fff !important even in dark mode
  - Syntax colors: #d97706, #569cd6 - VS Code defaults, not Gruvbox
- Impact: A token-only Gruvbox reskin would miss all of these.
- Fix: Either theme the compiler with CSS tokens, or accept it as a contained island.

### C6. Z-index sprawl - 29 distinct values from 10 to 999999
- Evidence: z-index: 10 (topbar), 15 (notification), 20 (sidebar), 21 (ai-panel), 22 (confirm-bar), 26 (tutor-panel), 30 (skip), 100 (toolbar), 250 (palette), 1000 (mobile-nav), 9999 (fullscreen), 99999 (floating palette), 999999 (note fullscreen)
- Fix: Define a z-index scale as CSS custom properties.

---

## YELLOW - MAJOR DESIGN & UX ISSUES

### M1. Compiler editor textarea has outline:none under overlay - invisible focus
- File: app/globals.css:298
- Code: .code-editor textarea.code-body { outline:none; }
- Problem: Text is transparent with syntax overlay. No visible focus indicator when editor regains focus.
- Fix: Add visible border/outline on editor container when textarea is focused.

### M2. Search bar shows Cmd+K on all platforms (no platform detection)
- File: app/components/ModuleShell.tsx:85
- Code: <kbd>Cmd K</kbd> hardcoded
- Problem: On Linux/Windows, shortcut is Ctrl+K. No platform detection.
- Fix: Detect navigator.platform and render appropriately.

### M3. Skip-to-content link styled but not rendered in DOM
- File: app/components/ModuleShell.tsx:73, app/globals.css:12
- Code: <a className=skip href=#module-main> exists in component source
- Problem: Not found in rendered DOM. SSR mismatch or conditional render.
- Impact: Keyboard/screen-reader users must tab through all navigation.
- Fix: Ensure skip link is always in initial render output.

### M4. transition: all on 13+ rules - performance risk
- Evidence: transition: all .15s ease on lines 50, 72, 103, 105, 119, 130, 278, 373, 374, 438, 791, 799
- Problem: all transitions every property including layout-triggering max-width/max-height.
- Impact: Unnecessary layout recalculations on low-power devices.
- Fix: Replace all with explicit property lists.

### M5. Mobile ink toolbar buttons forced to 32px (below 44px minimum)
- File: app/globals.css:521-524
- Problem: On <=600px, ink toolbar buttons are 32px - violating WCAG 2.2 AA 44px touch target.
- Fix: Set min-width: 44px; min-height: 44px on all toolbar buttons at all viewports.

### M6. FOUC (Flash of Unstyled Content) on light theme
- File: app/layout.tsx:18, app/components/ModuleShell.tsx:37-39, app/page.tsx:56-58
- Problem: Theme via useEffect post-hydration. If saved theme is light, flash of dark before effect runs. theme-color meta hardcoded dark.
- Fix: Inline script should update theme-color meta. Component defaults should read data-theme attr.

### M7. Three conflicting scrollbar systems
- File: app/globals.css:12
- Problem: Global scrollbar-width: thin + browser defaults on overflow containers. Scrollbar colors reference --sidebar which is same as --surface.
- Fix: Apply custom scrollbar consistently to all scrollable containers.

### M8. autoFocus mobile anti-pattern (4+ occurrences)
- Locations: Task name (Home), dashboard create, folder modal, event title (Calendar)
- Problem: On mobile, autoFocus opens virtual keyboard immediately, pushing content off-screen.
- Fix: Only autoFocus on desktop (media: pointer: fine) or after user interaction.

### M9. URL state not preserved across navigation
- Evidence: Calendar view/date, capture filters/search, vault folder/tag selection all lost on refresh. Only ?open= preserved.
- Fix: Push view state to URL search params using useSearchParams.

### M10. 24-hour time hardcoded against user locale
- File: app/calendar/page.tsx:52, app/page.tsx:28
- Code: hourCycle: h23 (24-hour) forced
- Problem: A US user sees 14:30 instead of 2:30 PM.
- Fix: Use default locale format or a user setting.

### M11. Ink overlay uses touch-action:none on full page with no pen gating
- File: app/globals.css:105, app/components/MixedNoteEditor.tsx:136-186
- Code: .ink-canvas { touch-action:none }
- Problem: No distinction between stylus and finger. Palms draw strokes. Cannot scroll in ink mode.
- Fix: Port pen-gating from InkEditor.tsx:207-302 which has proper pointer detection.

### M12. Multi-day events render only on start day
- File: app/calendar/page.tsx:239-240,493
- Problem: Events spanning multiple days only appear on first day. Month view hides events except todays.
- Fix: Render multi-day events on every spanned day column.

### M13. Calendar is view-only on every touch device
- File: app/calendar/page.tsx:137,141
- Code: matchMedia(pointer: coarse) early-return in beginSlot and moveItem
- Problem: No drag-to-create, no move/reschedule by touch. Tablets/phones cannot create or edit events.
- Fix: Unify pointer events instead of early-returning for coarse pointers.

### M14. Light-theme FOUC from hardcoded theme-color meta
- File: app/layout.tsx:16
- Code: themeColor: #1d2021 (always dark)
- Problem: Even when light theme is active, browser chrome theme-color is dark.
- Fix: Update theme-color dynamically via inline script.

---

## BLUE - MODERATE / INFO

### I1. CSS file is 257KB - largest asset
- File: app/globals.css - 257,391 bytes
- Impact: Slow CSSOM construction on low-power devices.
- Fix: Split into globals.css (tokens, base, layout) + module-level CSS.

### I2. Compiler island uses VS Code default syntax colors
- Evidence: Syntax colors #569cd6, #d97706, #ce9178 - VS Code defaults, not Gruvbox
- Fix: Map to existing Gruvbox tokens: --syntax-keyword, --syntax-string, etc.

### I3. No loading skeleton - just spinner in loading.tsx
- File: app/loading.tsx
- Fix: Add skeleton screens for main modules (Vault, Calendar, Capture).

### I4. No global-error.tsx - errors render outside shell
- File: app/error.tsx exists but no app/global-error.tsx
- Impact: Root-level errors have no navigation context.

### I5. Canvas and Graph pages have no visual representation in sidebar
- Already documented in UX_AUDIT. Canvas and Graph are hidden from navigation.

### I6. Settings appears both in More modal AND as standalone sidebar button
- File: app/components/ModuleShell.tsx
- Problem: Dual-entry creates confusion about authoritative nav element.

### I7. Notification read/unread visually identical
- File: app/notifications/page.tsx, app/globals.css
- Problem: Only a left-border inset on popover distinguishes them. Full page has no visual difference.

### I8. Notification delivery status shows raw jargon to users
- File: app/notifications/page.tsx:14-15
- Evidence: permanent-failure, (502) - raw backend terms exposed.
- Fix: Map to human-readable messages.

### I9. OCR status shows raw enums
- File: app/components/InkEditor.tsx:810,497
- Evidence: complete, unavailable - raw enums shown to users.
- Fix: Map to Ready, Not available, etc.

### I10. Env-var names leaked to end users
- Evidence: Set NOEMA_GOOGLE_CLIENT_ID..., add Gemini key - jargon visible in UI.
- Fix: Use friendly labels.

### I11. No +N more overflow in month cells
- File: app/calendar/page.tsx
- Problem: Month view shows events inline. When more than fit, they are cut off.
- Fix: Show +3 more overflow indicator.

### I12. No virtualization on long lists
- Evidence: Capture queue, task list, notification list - no virtualization.
- Impact: Performance degrades with 50+ items.
- Fix: Virtualize lists with IntersectionObserver-based lazy rendering.

---

## SUMMARY

| Severity | Count | Key Areas |
|----------|-------|-----------|
| Green (Strengths) | 7 | Token system, typography, focus-visible, mobile responsive, paper texture, error taxonomy, border-radius |
| Red (Critical) | 6 | Sidebar=surface, code=surface, faint contrast, light theme AA failures, hardcoded hex islands, z-index sprawl |
| Yellow (Major) | 14 | Compiler focus invisible, Cmd+K hardcoded, skip link missing, transition:all, 32px touch targets, FOUC, scrollbar conflicts, autoFocus, URL state, 24h time, ink pen gating, multi-day events, calendar touch-locked, theme-color |
| Blue (Moderate) | 12 | 257KB CSS, VS Code syntax, no skeletons, no global-error, canvas hidden, Settings double-entry, notification read/unread, raw jargon, OCR enums, env-var leaks, month overflow, no virtualization |

**Total: 39 findings (7 positive, 32 issues)**
