# Offline-native Noema for Android

## Summary

Build a sideloaded Kotlin/Jetpack Compose Android app alongside the current web app. It is single-device, offline-first, encrypted with biometric access, and initially migrates captures, tasks, and notes through a one-time export/import.

Local AI replaces all current AI capabilities in phases. Cloud AI is optional, requires explicit approval per request, and uses a user-supplied API key stored in Android Keystore. The integrated code runner supports explicit, temporary C and JavaScript snippets only.

## Implementation phases

1. **Feasibility spikes**
   - Benchmark 3B–4B quantized text models on the Xiaomi 14 for structured JSON capture, tutor/code responses, latency, RAM, heat, and battery.
   - Validate an embedded C runtime/compiler on Android under strict execution, memory, output, and filesystem limits. Stop before the main migration if it cannot safely run a basic C subset; Termux is not an acceptable embedded dependency.
   - Validate QuickJS for JavaScript snippets.
   - Acceptance: capture JSON is schema-valid; each runtime can run/abort a sample without app instability.

2. **Native foundation**
   - Add an `android/` Gradle project with Compose navigation and a Room/SQLCipher-style encrypted local store.
   - Gate app opening with Android biometric/device credentials; keep encryption keys in Android Keystore.
   - Define local repositories for notes, tasks, and captures; all writes are transactional and auditable.
   - Add versioned encrypted export/import compatible with a dedicated exporter in the current Noema app.

3. **Daily-use local slice**
   - Implement capture inbox, task list, and Markdown notes.
   - Add an on-device `LocalAiEngine` abstraction returning validated structured results for capture interpretation.
   - Port capture extraction first; users review and apply proposed actions before data changes.
   - Add model download, integrity verification, disk-space checks, cancellation, and clear “model unavailable” recovery states.

4. **AI parity, in dependency order**
   - Local embeddings and retrieval for semantic search.
   - Text tutor and coding assistance using retrieved local context.
   - Handwriting/OCR plus text-model interpretation as a separate vision pipeline.
   - Preserve current feature semantics where practical, but do not claim identical cloud-model quality.
   - Add an approval sheet for cloud fallback showing provider, model, and the exact content category being sent; no automatic fallback.

5. **Integrated runner**
   - Add a snippet editor with language selection, stdin, stdout/stderr, cancellation, and explicit Run.
   - Support JavaScript through QuickJS and C through the validated embedded runtime only; temporary workspaces, no network, no persistent package installation, strict time/output/memory limits.
   - Do not build a shell, Termux replacement, multi-file projects, or background/AI-triggered execution.

6. **Migration and personal release**
   - Add a web-side export for captures, tasks, and notes, including attachment references only when a supported Android import path exists.
   - Import into a fresh encrypted Android workspace; preserve identifiers where possible and report skipped/invalid records.
   - Produce a signed personal APK, install on the Xiaomi 14, and run a two-week daily-use trial before expanding module coverage.

## Interfaces and validation

- `LocalAiEngine`: structured capture, chat/tutor, embeddings, and model-health operations; every structured result is schema-validated before persistence.
- `CloudAiEngine`: same request shape, but callable only after per-request consent.
- `CodeRunner`: `{language, code, stdin}` → `{stage, exitCode, output, truncated, durationMs}`.
- Export/import format is versioned, encrypted in transit, and rejects unknown/corrupt payloads without partial writes.

## Test plan

- Unit tests for encryption-key handling, repositories, import validation, AI-schema validation, consent enforcement, and runner limits.
- Instrumented tests for biometric lock, process death/relaunch, offline model use, cancelled inference, and interrupted imports.
- End-to-end checks: capture → local interpretation → review → task/note; local semantic search; cloud approval/rejection; C/JS timeout and output-limit handling.
- Benchmark gate: record median latency, peak memory, battery drain, and thermal behavior for the selected model on the Xiaomi 14.

## Assumptions

- First release is personal, sideloaded, Android-only, and has no sync.
- Current web app remains intact during migration.
- Embedded C support is a gated feasibility requirement; if it fails, the native app proceeds without C rather than coupling itself to Termux.
