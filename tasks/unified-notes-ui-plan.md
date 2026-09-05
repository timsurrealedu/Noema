# Unified notes UI — implementation handoff

Status: planning complete; implementation deferred to a new session.
Saved: 2026-09-05.

## Goal and final agreement

Combine Obsidian-style typing and Flexcil-style handwriting in **one editable note**. Handwriting is first-class content: entire math derivations, physics diagrams, and handwritten pages must work without typed-text targets. Users can also type over, under, or beside handwriting and draw over typed content, using the same document, tools, save, and undo.

**Final layout rule: ordinary prose reflows; spatial compositions preserve their layout.** Opening a tablet note on a phone must not distort handwriting or silently separate it from the text it was drawn over.

| Content | Phone behavior |
| --- | --- |
| Ordinary typed paragraphs | Reflow to the viewport width |
| Handwritten equations and diagrams | Preserve coordinates; fit initially, then pinch to zoom and drag to navigate |
| Typed content sharing an arrangement with handwriting | Preserve the whole composition; text and ink zoom and pan together |
| Semantic highlights and underlines on prose | Follow the text as it wraps |

Example: a typed problem statement reflows, its handwritten solution with typed labels stays intact, and the typed conclusion below reflows. All three remain in one continuous editable note.

### Superseded proposals — do not implement

- Do not move a freehand circle or arrow into a margin or below its target merely because the phone reflows the text. The final agreement replaces that earlier fallback with preserving the annotated composition.
- Do not freeze the entire note's width just because any ink exists.
- Do not create separate typing and handwriting documents, tabs, or editors.
- Do not treat handwriting only as annotations attached to prose.

## Scope and product constraints

- Focus exclusively on notes UI and the editor/data support necessary for these behaviors.
- Prioritize Android stylus tablets and phones, plus desktop/laptop mouse and keyboard.
- Preserve Noema's established Gruvbox visual identity and accessible controls.
- Defer PDF/DOCX import/export implementation and new AI features. Future imported PDF pages fit the fixed-composition model; do not build conversion infrastructure now.
- Build an interactive proof before expanding the production editor. Static mockups were not selected as the first deliverable.

## One document, two layout behaviors

### Flowing prose

- Use Obsidian-style live Markdown, not a separate source/preview workflow.
- Support headings, lists, tasks, tables, links, images, and rendered inline/display math through typing shortcuts and a toolbar.
- Use a comfortable maximum reading width on desktop; fit prose to the phone viewport. Wide tables scroll locally rather than widening the note.

### Fixed compositions inside the note

- Insert → Paper creates blank A4-proportioned paper inline; offer blank, ruled, and grid backgrounds.
- A blank note may offer Start typing and Start handwriting. These choose the initial content/tool only, never restrict subsequent editing or create different note types.
- Paper accepts unrestricted handwriting, diagrams, equations, and typed content. No text anchor is required for ink on paper.
- The Text tool inserts movable rich-text boxes directly over, under, or beside ink. Support selection, movement, resizing, and front/back ordering.
- Keep layout preserves selected whole prose blocks and their arrangement as a fixed inline composition. Text remains editable there. Capture the existing dimensions instead of forcing converted content onto A4.
- For a freehand mark over flowing prose whose exact placement must survive reflow, establish the fixed composition before committing the stroke. Use an explicit Keep layout action; do not silently freeze surrounding prose. In the first proof, selecting a freehand tool over flowing prose exposes this action, then the user draws in the preserved passage.
- Semantic highlight/underline tools remain available on flowing prose without freezing it. Arbitrary pen strokes are not automatically recognized or converted into semantic decorations.
- A composition is part of the normal note surface, not a heavy card, modal, or separately launched canvas. Show boundaries and manipulation handles only when useful during interaction.
- Inserting prose above a composition moves it as a unit. Editing text inside it does not silently reposition other objects or change its width. Allow explicit height expansion when needed; never hide overflow or distort existing ink.
- Handwriting-only notes support successive paper pages via Add Page. Mixed notes allow prose before, between, and after compositions.
- Preserve region/page coordinates across devices, rotation, keyboard appearance, tool changes, and reload. Initial phone presentation fits the composition width; detailed reading/writing uses pan and zoom like Flexcil.

## Compact toolbar and input

- One stable contextual strip: Back, active tool, Undo, Redo, and overflow remain available.
- Typing exposes text style, common formatting, and Insert. Insert provides tables, links, images, equations, and paper.
- Drawing exposes pen, highlighter, eraser, selection, and color/width presets. Text remains accessible for labels and text boxes in the same composition.
- Target one approximately 48px touch row with 44px hit targets; allow a denser 40px row for desktop fine pointers. On phones show fewer actions, not smaller hit targets.
- Extra tools open temporary popovers or a phone sheet. Do not wrap into permanent additional toolbar rows.
- Keep the strip above the document on tablets/desktops. When the phone keyboard opens, place the contextual strip above it without duplication or obscuring the caret.
- Tool changes preserve selection, caret, scroll position, and document geometry. A larger popover must not push or resize the paper.
- Allow collapsing tools to a small restore handle. Give the note the mobile workspace with Back available; hide unrelated application navigation while editing.
- Stylus draws; fingers navigate by default. Provide explicit finger drawing on phones. Mouse behavior follows the selected tool.
- Ordinary double-tap retains text selection. **Two-finger double-tap invokes Undo.** Pinch, drag, and palm contact must never accidentally undo.
- One chronological note history covers typing, strokes, object movement, and composition insertion/conversion. Group a completed stroke or drag as one action; toolbar and gesture undo use the same history.
- Prose uses normal scrolling and browser zoom. Fixed compositions use focal-point pinch zoom and local pan, plus Fit and explicit zoom controls.
- At fit width, vertical finger dragging scrolls the note; when a composition is enlarged, it pans that composition. Keep this behavior consistent across drawing and text tools.
- Define pointer capture, touch-action, cancellation, and palm rejection behavior explicitly. Cancelled gestures must not leave stray strokes or stuck input state. Do not globally disable browser accessibility zoom.

## Implementation direction

### Reuse and investigate first

- Evolve the existing Milkdown/ProseMirror text editor and SVG ink implementation. Do not replace the editor stack without a demonstrated blocker from the proof.
- Key entrypoints: `app/components/MixedNoteEditor.tsx`, `app/components/LiveMarkdownEditor.tsx`, `app/components/InkEditor.tsx`; styling in `app/globals.css` and workspace integration in `app/vault/page.tsx`.
- At planning time, the current implementation uses a page-wide ink overlay, separate Write/Handwrite controls, and CSS that fixes the entire note width once ink exists. Replace that geometry model rather than layering further CSS fixes over it.
- Current block types are `markdown | ink`; they do not express the complete new composition model. Persistence work is necessary even though this is a notes-UI project.
- Consult local Next.js guidance in `node_modules/next/dist/docs/` before coding, as required by project instructions.

### Document and persistence contracts

- Introduce a versioned structured note document with ordered flow content and fixed compositions. Compositions contain dimensions and positioned text/ink objects in document coordinates, including stacking order.
- Prose annotations store stable content targets and ranges; maintain ranges using editor transaction mappings. Fixed-composition ink stores local coordinates and does not require a text target.
- Persist structured text with its annotations. Plain Markdown alone cannot round-trip mixed spatial content; keep Markdown as a derived representation for existing text consumers.
- Add a version-checked document read/write interface within the existing note API. Save coupled content, anchors, and composition changes atomically.
- Preserve dirty content on failed saves; expose saving/error state and Retry. Retain existing flush-on-navigation and dirty-page protection.
- Keep viewport zoom/pan and toolbar preferences local to the device, not part of the shared paper geometry.
- Reject incompatible legacy writes that would discard spatial content instead of silently flattening the note. Do not expand this work into unrelated sync redesign.
- Preserve semantic annotations when their target is deleted as detached items with Undo, Reattach, and Delete; do not attach them to unrelated replacement text.

### Existing notes and workspace safety

- Existing whole-page ink opens as its original fixed composition. Do not guess text anchors or rewrite existing notes merely on open.
- Keep a compatibility renderer until existing notes pass the acceptance scenarios. Convert only through an explicit editing/conversion path with undo or retained original data.
- The workspace already had uncommitted editor, style, vault, backend, and test changes during planning. Inspect and preserve them; do not reset or overwrite prior work.
- Graphify can guide navigation, but its graph was dated August 22 and the skill/package versions differed. Verify pointers against current source; refreshing Graphify is not part of this task.

## Implementation order and acceptance

1. Build a bounded interactive proof using the existing stack: flowing prose, one editable fixed composition with text and ink, conversion via Keep layout, and a compact contextual toolbar.
2. Prove phone/tablet/desktop geometry, text entry, pen input, pan/zoom, and mixed undo before broadening tools or converting existing notes.
3. Integrate versioned persistence and compatibility, then complete the specified formatting and drawing tools.
4. Run focused automated checks and real-device acceptance. Retain the existing editor path until the new path passes; do not report completion based only on screenshots or synthetic pointer tests.

Use three fixtures:

- **Handwriting only:** several pages of physics derivations, a diagram, erasing and selection, followed by a typed label added beside an equation.
- **Typing only:** prose, a table, link, image, and inline/display math; verify responsive reflow.
- **Mixed:** the supplied statistics example, with flowing explanation, a typed table and handwritten calculations kept together, and a flowing conclusion. Also circle a typed passage after Keep layout.

Required checks:

- Open tablet-created content at phone width: ordinary prose reflows while every spatial composition remains intact and navigable.
- Type over/under/beside handwriting; draw over text; verify stacking and alignment after save/reload.
- Insert/delete prose before a composition; it moves intact. Edit within the composition; unrelated objects remain fixed.
- Verify semantic annotation ranges through insertion, deletion, split/join, undo/redo, and persistence.
- Rotate devices, toggle tools, open the keyboard, and change zoom: no ink drift, caret loss, clipped content, or content jumps caused by chrome.
- No page-wide horizontal overflow for prose, permanently stacked toolbars, or inaccessible controls. Preserve labels, keyboard paths, visible focus, and text selection.
- Pinch/pan never becomes a stroke or undo; cancelled pointers and palm contact leave no stray ink.
- Mixed undo/redo follows user action order. Conversion and page insertion are reversible.
- Save failure retains the newest work and allows retry; reload after a successful save restores both text and ink geometry.
- Existing mixed notes remain readable without destructive conversion.

Automate document transformation, annotation mapping, history, persistence, and coordinate tests. Extend existing browser coverage, including `test/browser/unified-note-editor.spec.ts` and `test/browser/03-note-zoom.spec.ts`. Validate actual Android stylus, palm contact, touch gestures, and software-keyboard behavior on hardware; clearly report any hardware checks that remain unavailable.

## Next-session instruction

Implement this plan within notes scope. Treat the final reflow/preserved-composition rule above as authoritative over earlier conversation drafts. Start by inspecting the current dirty workspace and building the interactive proof; do not start with an unrelated rewrite, PDF/DOCX conversion, or AI feature work.
