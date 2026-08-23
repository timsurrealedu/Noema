# Noema UX Audit — Student / End-User Perspective

**Date:** 2026-08-23  
**Method:** Live Playwright browser testing at 1440×900 desktop + 390/820/360 mobile viewports, combined with source code analysis. Auth via API cookie injection with existing workspace data.  
**Previous audit reference:** `UI_AUDIT_FINDINGS.md` (2026-08-22) — this report **complements** it with fresh live-interaction findings.

---

## 🔴 CRITICAL — Broken or Missing

### 1. `/graph` returns 404 — "Page not found"

The Knowledge Graph route is documented in `PROJECT.md` as a feature with keyboard-navigable SVG, type/label filters, source links, and a semantic relationship table — but no page file exists at `app/graph/`. A student clicking this gets a dead end with no way forward.

```
http://localhost:3000/graph  →  "Page not found" (404)
```

### 2. Login `minLength=12` enforced with no visible hint

- Password field has `minLength={12}` client-side and the backend enforces the same check
- `.env.example` contains `testing123` (10 chars) — a new user following setup instructions will **create an account they can never log into**
- **No visible text** tells the user "At least 12 characters required"
- The error message says "Email or password is incorrect" — completely misleading since the password was valid, just too short

**Student impact:** You set up the app, create a password, log out, and can never get back in. The error gives no clue it's a length issue.

---

## 🟡 MAJOR UX ISSUES

### 3. Canvas, Notifications, and Activity have ZERO sidebar presence

These three pages are **missing from both `primaryNav` and `moreNav`** in `ModuleShell.tsx`. They only appear in the command palette search results. A student can't navigate to them from the sidebar or bottom nav — no icon, no link, no active indicator.

**Pages with sidebar presence:**
- **Primary (always visible):** Home, Capture, Vault, Calendar, Coding
- **Under "More" modal:** Study, Projects, Dashboards, Plugins, Collaboration, Help, Settings

**Pages with zero nav presence:**
| Page | In sidebar? | Active indicator? |
|------|------------|-------------------|
| Canvas | ❌ | ❌ (empty string) |
| Notifications | ❌ | ❌ (empty string) |
| Activity | ❌ | ❌ (empty string) |

**Student impact:** If you use Canvas to mind-map study notes, there's no way to find it from the nav. You have to know the URL.

### 4. Sidebar and surface are identical colors — flat design

```
--sidebar: #282828
--surface: #282828   ← IDENTICAL
--bg:      #1d2021
--raised:  #3c3836
```

The sidebar background is the **exact same color** as card surfaces (`--surface`). There is no visual depth between the navigation panel and content cards. In a Gruvbox design language, the sidebar should be a distinct tone from content surfaces.

**Student impact:** The app feels flat. Hard to distinguish navigation from content at a glance.

### 5. Code blocks blend into the background

```
--code: #282828   ← same as --surface and --sidebar
```

Code blocks are styled with `background: var(--code)` which is `#282828` — identical to regular content surfaces. Code does not visually distinguish itself from paragraphs or cards.

### 6. Faint text fails WCAG AA for normal body text

| Pair | Ratio | Passes? |
|------|-------|---------|
| `--faint: #928374` on `--bg: #1d2021` | 4.47:1 | ⚠️ AA-large only (needs 4.5:1 for normal text) |
| `--faint: #928374` on `--surface: #282828` | 4.02:1 | ⚠️ AA-large only |

Any body text using the `--faint` token will be a strain to read at normal sizes.

### 7. No skip-to-content link rendered in DOM

The `.skip` class is styled in CSS (positioned off-screen, slides in on focus) and the `<a className="skip">` element exists in `ModuleShell.tsx` — but it was **not found in the rendered DOM** on tested pages. Keyboard and screen-reader users can't skip navigation.

### 8. Active nav indicator lost on Canvas, Notifications, Activity

Verified via Playwright: navigating to `/canvas`, `/notifications`, and `/activity` shows `active=""` in the sidebar query. The "More" button does not highlight. **No sidebar item at all shows active.** The user has no indication of where they are in the app.

### 9. Compiler page has no `<h1>` heading

The compiler page (`/coding/compiler`) renders with no `h1` element. The first heading level is absent — an accessibility issue for screen readers.

### 10. Settings appears both in "More" modal AND as a standalone sidebar button

Settings is listed in the `moreNav` array (appears in the "More" modal) AND has a dedicated `.settings` button at the bottom of the sidebar. This means:
- When you're on Settings, the "More" button lights up as active
- But Settings also has its own permanent button
- Dual-entry creates confusion about which nav element is authoritative

### 11. Keyboard shortcut hint shows ⌘K on all platforms

The search bar displays "⌘K" as the shortcut hint. On Linux and Windows, the actual shortcut is **Ctrl+K**. No platform detection is performed.

---

## 🔵 MODERATE / INFO — Working But Worth Noting

### 12. All pages load successfully when server is healthy ✅

After re-testing with a stable server, these pages all load correctly:
- `/settings` — Shows Preferences, Vault, Account, Agents, Security, Data sections
- `/activity` — Shows "Changes you can trace" with activity list
- `/calendar` — Shows Day/Week/Month/Agenda views with time grid
- `/projects` — Shows "No projects yet" empty state
- `/study` — Shows study interface
- `/canvas` — Shows canvas editor
- `/notifications` — Shows notification list
- `/dashboards` — Shows dashboard builder
- `/coding` — Shows compiler/editor
- `/help` — Shows help content
- `/plugins` — Shows plugin marketplace

The earlier timeouts were caused by the dev server process dying mid-test, not the application itself.

### 13. Login page is clean and accessible ✅

- All inputs have proper `<label>` associations
- Google sign-in button present
- "Keep me signed in" checkbox works
- Clean, minimal design with error handling using `role="alert"`
- Aside panel with value proposition text

### 14. Mobile responsive works well ✅

| Viewport | Sidebar | Bottom Nav | Overflow |
|----------|---------|------------|----------|
| iPhone 14 (390×844) | Hidden ✅ | Present ✅ | None ✅ |
| iPad Air (820×1180) | Hidden ✅ | Present ✅ | None ✅ |
| Small Android (360×800) | Hidden ✅ | Present ✅ | None ✅ |

Bottom nav shows: Home, Capture, Vault, Calendar, Coding + "More" button.

### 15. Capture bar present and accessible ✅

- Present on home page with `<label>`, placeholder "Capture anything…"
- File attachment, handwriting, and voice buttons with `aria-label` attributes
- Send button with proper disabled state
- Visually distinct with amber accent

### 16. Capture error taxonomy is honest ✅

Failed captures show descriptive messages:
- "Failed · Network request failed" with Retry button
- "Failed · AI provider rate limited" with Retry button

This is better than a generic "Something went wrong" — preserves user trust.

### 17. Dark theme colors are generally solid ✅

All major token pairs pass WCAG AA:

| Pair | Ratio | Status |
|------|-------|--------|
| ink on bg | 11.95:1 | ✅ Pass |
| muted on bg | 7.53:1 | ✅ Pass |
| primary on bg | 6.61:1 | ✅ Pass |
| error on bg | 4.77:1 | ✅ Pass |
| success on bg | 7.94:1 | ✅ Pass |
| focus on bg | 6.49:1 | ✅ Pass |
| warning on bg | 9.67:1 | ✅ Pass |

### 18. Empty states present on relevant pages ✅

Pages like Projects ("No projects yet") and other modules show proper empty states with calls to action rather than blank screens.

---

## 📊 ISSUE BREAKDOWN

| Severity | Count | Key Issues |
|----------|-------|------------|
| 🔴 Critical | 2 | Graph 404; Login `minLength=12` with no visible hint |
| 🟡 Major | 9 | Canvas/Notifications/Activity missing from nav; sidebar=surface flat; code blends; faint contrast fails AA; no skip link in DOM; Canvas/Notif/Activity no active nav indicator; Compiler missing `<h1>`; Settings double-entry in nav; ⌘K platform-agnostic |
| 🔵 Info | 7 | All pages load ✅; mobile responsive ✅; capture bar ✅; dark colors good ✅; empty states ✅; capture errors good ✅; login accessible ✅ |

---

## 🎯 TOP 5 FIXES FOR BEST STUDENT IMPACT

### 1. Add missing pages to sidebar navigation

**File:** `app/components/ModuleShell.tsx` — Add Canvas, Notifications, and Activity to the `moreNav` array:

```typescript
const moreNav = [
  ["Study","/study",BookOpen], ["Projects","/projects",Tray],
  ["Canvas","/canvas",FileText],                                    // ← ADD
  ["Notifications","/notifications",Bell],                          // ← ADD
  ["Activity","/activity",Clock],                                   // ← ADD
  ["Dashboards","/dashboards",Command], ["Plugins","/plugins",FileText],
  ["Collaboration","/collaboration",ShareNetwork], ["Help","/help",Command],
  ["Settings","/settings",Gear]
] as const;
```

This fixes: missing nav links, missing active indicators, and discoverability — all in one change.

### 2. Add password length hint to login form

**File:** `app/login/page.tsx` — Add "At least 12 characters" text near the password input, and update `.env.example` to use a valid-length example password.

### 3. Differentiate sidebar from surface color

**File:** `app/globals.css` — Change `--sidebar` from `#282828` to a subtly distinct tone (e.g. `#242728` or `#26292a`) so navigation has visual depth.

### 4. Differentiate code block background

**File:** `app/globals.css` — Change `--code` from `#282828` to `#2e2b2a` or `#2d2c2e` so code visually contrasts from regular content surfaces.

### 5. Fix graph 404 or remove from documentation

Either create the Knowledge Graph page at `app/graph/page.tsx` or remove all references to `/graph` from `PROJECT.md` and navigation to avoid dead-end routes.
