# Comparison: ox-alpha Audit vs deepseek-audit/

- **Date:** 2026-08-23
- **Compared:** `ox-alpha-audit/AUDIT_REPORT.md` (source-level, commit `ee9f0f8`) against the four deepseek docs (`REQUIREMENTS_AUDIT.md`, `UX_AUDIT_FINDINGS.md`, `DESIGN_UI_AUDIT.md`, `REMEDIATION_PLAN.md`)
- **Method:** Every contradicting claim re-verified against current source before judging.

## Verdict

The two audits are **complementary, not duplicates**:

- **deepseek-audit** is strongest on **visual design/accessibility** (color tokens, WCAG contrast, z-index sprawl, FOUC) and **navigation discoverability** — areas my audit deliberately did not cover.
- **My audit** goes much deeper on **behavioral correctness**: dead data paths, broken API wiring, silent failures, stale citations. Roughly **half of what deepseek marks ✅ "Fully Covered" has verified functional defects** at HEAD.

Where they conflict, deepseek is frequently citing **stale findings from `UI_AUDIT_FINDINGS.md` (2026-08-22)** rather than current code; several of those items are already fixed at HEAD.

---

## 1. Direct contradictions (re-verified against source)

| Topic | deepseek claim | Verified reality at HEAD | Winner |
|---|---|---|---|
| Ink overlay model | "ink is a separate block, **not an overlay layer on top of rendered Markdown**" (#12); recommends *adding* an annotation layer | An overlay **already exists**: `IntegratedOverlayCanvas` SVG, `position:absolute; inset:0` over rendered markdown (`MixedNoteEditor.tsx:90-268`). Real problems are different: only the first ink block renders (`:418`), strokes aren't content-anchored, extra ink blocks invisible | **ox-alpha** — deepseek's Phase-2 recommendation would rebuild existing functionality |
| Pen gating | M11/P6-1: "**No pen gating** … palms draw strokes" (`MixedNoteEditor.tsx:136-186`) | Pen gate **is present**: touch rejected while pen active or within 150 ms of pen-up (`MixedNoteEditor.tsx:143-150`, verified). Actual flaw is inverted: fingers can't scroll in ink mode + `touch-action:none` kills pinch | **ox-alpha** |
| Calendar touch support | M13/P5-2: "view-only on every touch device — `pointer:coarse` early-return in beginSlot/moveItem" | Early-return is **gone**; touch users get 250 ms long-press + haptic pickup for move/resize (`calendar/page.tsx:456`, verified). Remaining gap: no drag-*create* on touch, Month/Day still read-mostly | **ox-alpha** — deepseek item stale (already fixed) |
| Calendar event delete | "Events cannot be deleted" | Delete with undo toast exists (`calendar/page.tsx:704-731`) | **ox-alpha** — stale |
| Compiler Stop/dirty guards | #5 caveat: "runs unstoppable (no AbortController); needs dirty guards" | AbortController Stop button + `beforeunload` dirty guard exist (`compiler/page.tsx:778-822,457-464`) | **ox-alpha** — stale (Stop is client-abort only, though — server process still runs to timeout, which neither audit fully credits) |
| Tutor status | "✅ Fully covered… insertion explicit, idempotent, transactional" | Server path is indeed idempotent+transactional, **but** vault-note insert leaves open editor stale (noop `onApply`, block-version divergence risk) and plain notes double-insert (`vault/page.tsx:237,280`) | **ox-alpha** — feature marked done while its primary UX is broken |
| NL → event+task | "#22 ❌ Missing entirely — no dedicated NL input" | Flow **exists end-to-end** (capture interpret → proposals → apply creates task + linked event). Real defects: LLM rarely proposes both object types (prompt never asks), reminders written but never delivered | **ox-alpha** — it's built-but-broken, not missing |
| Equation/table toolbar | "#24/#25 ❌ Missing — raw LaTeX only" | Milkdown Crepe TopBar provides insert table/image/LaTeX with KaTeX tooltip editing in Edit mode; reading view has Copy-LaTeX/Ask-Tutor on math. First-party polish is thin, images are broken (blob URLs) — but "raw LaTeX only" is false | **ox-alpha** (gap overstated by deepseek) |
| Pinch-zoom | "#17 No zoom controls in note editor **or canvas**" | Canvas has pinch zoom (`InfiniteCanvas.tsx:30-32`); standalone InkEditor has 0.25–4× pinch. Only the *note overlay* lacks it | **ox-alpha** |
| Tasks module location | cites `app/tasks/` as source | **No `app/tasks` directory exists** (verified). There is no `/tasks` route — which is exactly why `sw.js` precache of `/tasks` 404s | **ox-alpha** |

## 2. What deepseek found that my audit missed (credit)

1. **`/graph` returns 404** — `KnowledgeGraphView.tsx` exists, no page mounts it (verified: no `app/graph/`). Dead-end documented route.
2. **Login `minLength=12` with no visible hint** + `.env.example` ships a 10-char password → new users lock themselves out with a misleading error. Excellent catch, auth UX was out of my scope.
3. **Design-system depth**: `--sidebar` == `--surface` == `--code` (#282828), light-theme WCAG failures (`--warning` ~2.04:1), 137+ hardcoded hexes in compiler island, z-index sprawl (29 values to 999999), FOUC/theme-color meta, 32px touch targets on mobile ink toolbar, `transition: all` perf, three scrollbar systems, autoFocus-on-mobile anti-pattern, 24-hour time hardcoded, URL state not preserved.
4. Navigation gaps beyond Coding: Canvas/Notifications/Activity absent from sidebar + no active indicators; Settings dual-entry.
5. Smaller polish: raw enums/jargon in UI (OCR status, delivery statuses, env-var names), notification read/unread indistinct, no skeletons, no global-error.tsx, no list virtualization.

## 3. What my audit found that deepseek missed

Functional/behavioral defects, all verified at HEAD:

1. **P0 cluster deepseek rated healthy or skipped:**
   - `sw.js` precaches `/tasks` → SW install fails → entire offline shell broken (`public/sw.js:2`; 404 confirmed live).
   - `event_reminders` rows [30/10/0] written for capture-linked events but **never delivered** — `deliverDueReminders` reads only `events.reminder_at`/`tasks.reminder_at` which stay NULL/null-forced (`core.mjs:196-197`, `modules.mjs:33-35`).
   - Toggling a task erases its reminder (serialized null defeats auto-reminder).
   - ContextualAssistant "Plan" posts to nonexistent `/api/v1/capture` (deepseek cited this very component as proof tutor is "fully covered").
   - Offline typed captures bypass the queue and are wiped by next `/state` merge.
   - Worker runs only as separate systemd unit — bare `npm run dev` processes nothing (jobs appear stuck).
   - Flattened PDF export permanently 500s if any annotation page number > page count.
2. **Audio**: recorder exists but single-blob, discarded on navigation, hidden ≤390px; **10 MB Gemini transcription cap vs 50 MB upload cap → real lectures silently degrade to filename-only interpretation**; no timestamps/replay/transcript blocks; `"voice"` enum dead. DeepSeek said both "voice buttons present" (its own UX audit) and "❌ no lecture recording UI" (requirements #21) — self-contradictory, and missed the cap entirely.
3. **Editor internals**: only first ink block renders; mid-note ink insert/block ops have zero UI triggers; OCR transcripts/equations loaded but never surfaced; editor always opens in Preview; Crepe image inserts don't persist (no `onUpload`); assets stored outside vault break Obsidian portability; annotations detach from reflowed text.
4. **Submission workflow**: DOCX hard-gated from annotation (no converter); note→PDF is plain-text dump (loses math/tables/images/ink); import UI helper is dead code; workspace tar backup drops `pdf_annotations` + ink blocks (`ops.mjs:20`).
5. **Capture/AI**: no pre-AI keep-as-is opt-out; optimize UI hardcodes "organize", hides existing `study` mode, absent for vault notes entirely; photo extraction prompt is plain-text-only (the good math extractor quarantined in Study toy that writes nowhere); handwriting intake pipeline has no UI trigger; Study "Capture lecture" input silently discards files; unused `handwritten-math` AI hook awaiting the continuation feature.
6. **Calendar/tasks behavior**: recurring tasks never regenerate; Google sync manual-click-only, no worker loop, tooltip claims task sync but payload maps events only; capture→event+task dual-create is LLM-nondeterministic; reminder cascade hardcoded.
7. **Coding**: single-file runs (saved files never staged → multi-file C assignments fail); languages list doesn't verify toolchain presence; Coding hidden from mobile nav/More menu.
8. **Binusmaya/study**: agreement that nothing exists — but mine adds that `assignments.source/external_id` sync columns sit unused (import path already half-built), recommendations engine throws outside project context, and nothing connects study data to calendar/tasks/reminders.

## 4. Internal inconsistencies within deepseek-audit

- Audio: UX #15 says voice button present; Requirements #21 says "❌ No lecture recording UI."
- Tutor: Requirements #4 "✅ Fully covered" via ContextualAssistant — whose Plan endpoint doesn't exist.
- Tasks: cites nonexistent `app/tasks/`.
- Remediation plan inherits stale items (M11 pen-gating, M13 calendar touch, P5-2) without checking whether HEAD fixed them — its own REQUIREMENTS_AUDIT even flags that caveat, then REMEDIATION_PLAN includes them anyway.

## 5. Coverage overlap summary

| Timmy requirement | deepseek | ox-alpha | Agreement |
|---|---|---|---|
| Binusmaya integration | ❌ Missing | ❌ Missing (+ unused sync schema) | ✅ Full |
| Course overviews (session/semester) | ❌ Missing | ❌ Missing | ✅ Full |
| Handwriting-over-notes quality | 🟡 Partial (wrong mechanism claimed) | 🟡 Overlay exists; anchoring/zoom/multi-block broken | ⚠️ Same verdict, different diagnosis |
| Pinch-zoom | ❌ Missing everywhere | ❌ In notes only (exists in canvas/InkEditor) | ⚠️ Partial |
| PDF annotate/import/export loop | 🟡 Mostly covered | 🔴 Built but submission-unworthy (500 bug, fidelity, docx gate) | ⚠️ Severity differs |
| Audio lectures | 🟡/❌ contradictory | 🟡 Minimal recorder; 10 MB cap kills real use | ⚠️ |
| Tutor multi-AI + add-to-note | ✅ Full | 🟡 Fallback-chain only; insert bugs | ❌ Disagree |
| NL quick-add → event+task+reminders | ❌ Missing | 🟡 Exists; nondeterministic; reminders dead | ❌ Disagree |
| Calendar feel | ✅ Full (caveats) | 🟡 Good week grid; Month/Day read-mostly; editor limits | ⚠️ |
| C coding | ✅ Full | ✅ Strong, but single-file + nav-hidden | ⚠️ |
| WYSIWYG equation/table toolbar | ❌ Missing | 🟡 Vendor features exist; first-party thin; images broken | ❌ Disagree |
| Zero-friction mode switching | 🟡 Data-loss framing | 🟡 Preview-default, pointer-capture toggle, dead toggles | ⚠️ |

## 6. Recommended merged action plan

1. Take deepseek **Phase 0–2 design/nav/a11y fixes as-is** (colors, login hint, `/graph` stub, skip-link, nav additions) — cheap and orthogonal; **drop their stale P6-1/M13/P5-2 items** (already fixed).
2. Take my **P0 behavioral list first among functional work** (SW precache, reminder delivery, worker-in-dev, offline captures, PDF export guard, ContextualAssistant endpoint, image persistence).
3. Sequence the rest per my priority order (ink anchoring/zoom port, OCR surfacing, math continuation, audio pipeline, docx conversion, vault-note optimize, deterministic dual-create, binusmaya import-first, tutor parallel providers).
